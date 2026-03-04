/* eslint-disable @typescript-eslint/prefer-as-const */
import { Map, OverscaledTileID, MapMouseEvent } from "maplibre-gl";
import type { CustomLayerInterface } from "maplibre-gl";
import * as THREE from "three";
import { LRUCache } from "lru-cache";
import type { DataTileInfo, ObjectInfo, Model, LatLon } from "@/components/map/data/types";
import { tileLocalToLatLon, getMetersPerExtentUnit, clampZoom } from "@/components/map/data/convert/coords";
import { requestVectorTile } from "@/components/map/data/tile/request";
import { parseVectorTile } from "@/components/map/data/convert/vectorTile";
import { parseTileInfo } from "@/components/map/data/tile/parseTile";
import {
  createLightGroup,
  type LightGroup,
  type LightGroupOption,
  downloadModel,
  prepareModelForRender,
  transformModel,
} from "@/components/map/data/models/objModel";
import { calculateSunDirectionMaplibre } from "@/components/map/shadow/ShadowHelper";
import { MaplibreShadowMesh } from "@/components/map/shadow/ShadowGeometry";

export type SunOptions = {
  shadow: boolean;
  altitude: number;
  azimuth: number;
};

export type SunParameter = {
  altitude: number;
  azimuth: number;
  sunDir: THREE.Vector3;
  shadow: boolean;
};

type PickHit = {
  dist: number;
  tileKey: string;
  overScaledTileId: OverscaledTileID;
  object: THREE.Object3D;
};

export type ModelLayerOptions = {
  id: string;
  vectorSourceUrl: string;
  sourceLayer: string;
  rootUrl: string;
  key?: string;
  minZoom?: number;
  maxZoom?: number;
  tileSize?: number;
  maxTileCache?: number;
  maxModelCache?: number;
  applyGlobeMatrix?: boolean;
  sun?: SunOptions;
};

type TileState = "preparing" | "loaded" | "not-support" | "error";

type DownloadState = "downloading" | "loaded" | "disposed";

type TileCacheEntry = DataTileInfo & {
  state?: TileState;
  stateDownload?: DownloadState;
  sceneTile?: THREE.Scene;
  overScaledTileID?: OverscaledTileID;
  objects?: ObjectInfo[];
  lightGroup?: LightGroup;
  isFullObject?: boolean;
};

type ModelCacheEntry = Model & {
  stateDownload?: DownloadState;
  object3d?: THREE.Object3D;
};

class ModelFetchQueue {
  private active = 0;
  private queue: Array<() => void> = [];
  private readonly max: number;

  constructor(max: number) {
    this.max = max;
  }

  enqueue(job: () => void): void {
    this.queue.push(job);
    this.run();
  }

  private run(): void {
    if (this.active >= this.max) {
      return;
    }
    const job = this.queue.shift();
    if (!job) {
      return;
    }
    this.active += 1;
    job();
  }

  done(): void {
    this.active = Math.max(0, this.active - 1);
    this.run();
  }
}

export class ModelLayer implements CustomLayerInterface {
  id: string;
  readonly type = "custom" as const;
  readonly renderingMode = "3d" as const;
  private map: Map | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private camera: THREE.Camera | null = null;
  private sun: SunParameter | null | undefined;
  private readonly vectorSourceUrl: string;
  private readonly sourceLayer: string;
  private readonly rootUrl: string;
  private readonly minZoom: number;
  private readonly maxZoom: number;
  private readonly tileSize: number;
  private readonly applyGlobeMatrix: boolean;

  private tileCache: LRUCache<string, TileCacheEntry>;
  private modelCache: LRUCache<string, ModelCacheEntry>;
  private visible = true;
  private raycaster = new THREE.Raycaster();
  private onPick?: (info: PickHit) => void;
  private onPickFail?: () => void;
  private pickEnabled = true;
  private lightOption: LightGroupOption | null = null;
  private readonly modelFetchQueue = new ModelFetchQueue(6);

  constructor(opts: ModelLayerOptions & { onPick?: (info: PickHit) => void; onPickFail?: () => void }) {
    this.id = opts.id;
    this.vectorSourceUrl = opts.vectorSourceUrl;
    this.sourceLayer = opts.sourceLayer;
    this.rootUrl = opts.rootUrl;
    this.minZoom = opts.minZoom ?? 16;
    this.maxZoom = opts.maxZoom ?? 19;
    this.tileSize = opts.tileSize ?? 512;
    this.applyGlobeMatrix = opts.applyGlobeMatrix ?? true;
    if (opts.sun) {
      this.sun = {
        altitude: opts.sun.altitude,
        azimuth: opts.sun.azimuth,
        sunDir: calculateSunDirectionMaplibre(
          THREE.MathUtils.degToRad(opts.sun.altitude),
          THREE.MathUtils.degToRad(opts.sun.azimuth)
        ),
        shadow: opts.sun.shadow,
      };
    }

    this.modelCache = new LRUCache<string, ModelCacheEntry>({
      max: opts.maxModelCache ?? 1024,
      dispose: (model) => {
        if (model?.stateDownload === "downloading") {
          model.stateDownload = "disposed";
        }
      },
    });

    this.tileCache = new LRUCache<string, TileCacheEntry>({
      max: opts.maxTileCache ?? 1024,
      dispose: (tile) => {
        if (tile?.stateDownload === "downloading") {
          tile.stateDownload = "disposed";
        }
      },
    });

    this.onPick = opts.onPick;
    this.onPickFail = opts.onPickFail;
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.map?.triggerRepaint?.();
  }

  setPickEnabled(enabled: boolean): void {
    this.pickEnabled = enabled;
  }

  setSunPos(altitude: number, azimuth: number, shadow: boolean = true): void {
    this.sun = {
      altitude,
      azimuth,
      sunDir: calculateSunDirectionMaplibre(THREE.MathUtils.degToRad(altitude), THREE.MathUtils.degToRad(azimuth)),
      shadow,
    };
  }

  setLightOption(option: LightGroupOption): void {
    this.lightOption = option;
    this.tileCache.forEach((entry) => {
      if (entry.lightGroup) {
        this.applyLightOption(entry.lightGroup, option);
      }
    });
    this.map?.triggerRepaint?.();
  }

  onAdd(map: Map, gl: WebGLRenderingContext): void {
    this.map = map;
    this.camera = new THREE.Camera();
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
      alpha: true,
      stencil: true,
    });
    this.renderer.autoClear = false;
    this.renderer.localClippingEnabled = true;
    map.on("click", this.handleClick);
  }

  onRemove(): void {
    this.map?.off("click", this.handleClick);
    this.renderer?.dispose();
    this.renderer = null;
    this.camera = null;
    this.map = null;
    this.tileCache.clear();
    this.modelCache.clear();
  }

  render(): void {
    if (!this.map || !this.camera || !this.renderer || !this.visible) {
      return;
    }
    this.renderer.clearStencil();
    const zoom = clampZoom(this.minZoom, this.maxZoom, Math.round(this.map.getZoom()));
    const visibleTiles = this.map.coveringTiles({
      tileSize: this.tileSize,
      minzoom: zoom,
      maxzoom: zoom,
      roundZoom: true,
    });
    const renderTiles = this.ensureTiles(visibleTiles as OverscaledTileID[]);
    const tr = this.map.transform;
    if (!tr?.getProjectionData) {
      return;
    }

    for (const tile of renderTiles) {
      if (!tile.overScaledTileID || !tile.sceneTile) {
        continue;
      }
      const projectionData = tr.getProjectionData({
        overscaledTileID: tile.overScaledTileID,
        applyGlobeMatrix: this.applyGlobeMatrix,
      });
      const tileMatrix = projectionData.mainMatrix;
      this.camera.projectionMatrix = new THREE.Matrix4().fromArray(tileMatrix);
      this.renderer.resetState();
      this.updateShadow(tile.sceneTile);
      this.renderer.render(tile.sceneTile, this.camera);
    }
  }

  private handleClick = (e: MapMouseEvent) => {
    if (!this.map || !this.camera || !this.renderer || !this.visible || !this.pickEnabled) {
      return;
    }
    const canvas = this.map.getCanvas();
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2((e.point.x / rect.width) * 2 - 1, -((e.point.y / rect.height) * 2 - 1));
    const zoom = clampZoom(this.minZoom, this.maxZoom, Math.round(this.map.getZoom()));
    const visibleTiles = this.map.coveringTiles({
      tileSize: this.tileSize,
      minzoom: zoom,
      maxzoom: zoom,
      roundZoom: true,
    }) as OverscaledTileID[];
    const tr = this.map.transform;
    if (!tr?.getProjectionData) {
      return;
    }

    let bestHit: { dist: number; tileKey: string; overScaledTileID: OverscaledTileID; group: THREE.Object3D } | null = null;
    for (const tid of visibleTiles) {
      const key = this.tileKey(tid);
      const tile = this.tileCache.get(key);
      if (!tile?.sceneTile || !tile.overScaledTileID) {
        continue;
      }

      const proj = tr.getProjectionData({
        overscaledTileID: tile.overScaledTileID,
        applyGlobeMatrix: this.applyGlobeMatrix,
      });

      const mvp = new THREE.Matrix4().fromArray(proj.mainMatrix);
      const inv = mvp.clone().invert();
      const pNear = new THREE.Vector4(ndc.x, ndc.y, -1, 1).applyMatrix4(inv);
      pNear.multiplyScalar(1 / pNear.w);
      const pFar = new THREE.Vector4(ndc.x, ndc.y, 1, 1).applyMatrix4(inv);
      pFar.multiplyScalar(1 / pFar.w);

      const origin = new THREE.Vector3(pNear.x, pNear.y, pNear.z);
      const direction = new THREE.Vector3(pFar.x, pFar.y, pFar.z).sub(origin).normalize();
      this.raycaster.ray.origin.copy(origin);
      this.raycaster.ray.direction.copy(direction);

      const hits = this.raycaster.intersectObjects(tile.sceneTile.children, true);
      if (hits.length) {
        const h0 = hits[0];
        let obj: THREE.Object3D | null = h0.object;
        while (obj && !obj.userData?.isModelRoot) {
          obj = obj.parent as THREE.Object3D;
        }
        if (obj) {
          if (!bestHit || h0.distance < bestHit.dist) {
            bestHit = { dist: h0.distance, tileKey: key, overScaledTileID: tid, group: obj };
          }
        }
      }
    }

    if (!bestHit) {
      this.onPickFail?.();
      this.map.triggerRepaint();
      return;
    }

    this.onPick?.({
      dist: bestHit.dist,
      tileKey: bestHit.tileKey,
      object: bestHit.group,
      overScaledTileId: bestHit.overScaledTileID,
    });
    this.map.triggerRepaint();
  };

  private tileKey(tile: OverscaledTileID): string {
    const c = tile.canonical;
    return `${c.z}/${c.x}/${c.y}`;
  }

  private updateShadow(scene: THREE.Scene): void {
    const sunDir = this.sun?.sunDir;
    if (!sunDir) {
      return;
    }
    scene.traverse((child) => {
      if (child instanceof MaplibreShadowMesh) {
        const shadowScaleZ = child.userData.scale_unit ?? child.userData.scaleUnit;
        child.update(new THREE.Vector3(sunDir.x, sunDir.y, -sunDir.z / shadowScaleZ));
      }
    });
  }

  private ensureTiles(tiles: OverscaledTileID[]): TileCacheEntry[] {
    const result: TileCacheEntry[] = [];

    for (const overScaledTileID of tiles) {
      const key = this.tileKey(overScaledTileID);

      if (!this.tileCache.has(key)) {
        const entry: TileCacheEntry = {
          state: "preparing",
          stateDownload: "downloading",
        };
        this.tileCache.set(key, entry);
        this.requestAndParseTile(overScaledTileID, entry).catch((e) => {
          entry.state = "error";
          entry.stateDownload = "loaded";
          console.warn("[ModelLayer] tile error", key, e);
        });
        continue;
      }

      const entry = this.tileCache.get(key);
      if (!entry) {
        continue;
      }

      if (entry.state === "loaded" && entry.sceneTile && entry.overScaledTileID) {
        this.ensureModels(entry);
        this.populateScene(entry);
        if (entry.sceneTile.children.length > 0) {
          result.push(entry);
        }
      }
    }

    return result;
  }

  private createShadowGroup(scene: THREE.Scene): void {
    const shadowGroup: THREE.Group = new THREE.Group();
    shadowGroup.name = "shadow_group";
    scene.add(shadowGroup);
  }

  private createBuildingGroup(scene: THREE.Scene): void {
    const buildingGroup: THREE.Group = new THREE.Group();
    buildingGroup.name = "building_group";
    scene.add(buildingGroup);
  }

  private applyLightOption(light: LightGroup, option: LightGroupOption): void {
    const { directional, hemisphere, ambient } = option;
    if (directional) {
      if (directional.intensity !== undefined) {
        light.dirLight.intensity = directional.intensity;
      }
      if (directional.color !== undefined) {
        light.dirLight.color.set(directional.color);
      }
      if (directional.direction !== undefined) {
        light.dirLight.target.position.copy(directional.direction.clone().multiplyScalar(5000));
      }
    }
    if (hemisphere) {
      if (hemisphere.intensity !== undefined) {
        light.hemiLight.intensity = hemisphere.intensity;
      }
      if (hemisphere.skyColor !== undefined) {
        light.hemiLight.color.set(hemisphere.skyColor);
      }
      if (hemisphere.groundColor !== undefined) {
        light.hemiLight.groundColor.set(hemisphere.groundColor);
      }
    }
    if (ambient) {
      if (ambient.intensity !== undefined) {
        light.ambientLight.intensity = ambient.intensity;
      }
      if (ambient.color !== undefined) {
        light.ambientLight.color.set(ambient.color);
      }
    }
  }

  private async requestAndParseTile(overScaledTileID: OverscaledTileID, entry: TileCacheEntry): Promise<void> {
    const c = overScaledTileID.canonical;
    const tileUrl = this.buildTileUrl(c.z, c.x, c.y);
    const buffer = await requestVectorTile(c.z, c.x, c.y, tileUrl);

    if (entry.stateDownload === "disposed") {
      return;
    }
    const parsed = parseVectorTile(buffer);
    const hasLayer = Object.prototype.hasOwnProperty.call(parsed.layers, this.sourceLayer);
    if (!hasLayer) {
      entry.state = "not-support";
      entry.stateDownload = "loaded";
      return;
    }
    const objects: ObjectInfo[] = parseTileInfo(parsed, this.sourceLayer);
    entry.objects = objects;
    entry.overScaledTileID = overScaledTileID;
    entry.sceneTile = new THREE.Scene();
    const dirLight = (this.sun?.sunDir ?? new THREE.Vector3(0.5, 0.5, 0.5)).clone().normalize();
    const lightGroup = createLightGroup(entry.sceneTile, dirLight);
    entry.lightGroup = lightGroup;
    if (this.lightOption) {
      this.applyLightOption(lightGroup, this.lightOption);
    }
    if (this.sun) {
      this.createShadowGroup(entry.sceneTile);
    }
    this.createBuildingGroup(entry.sceneTile);
    entry.state = "loaded";
    entry.stateDownload = "loaded";
  }

  private ensureModels(tile: TileCacheEntry): void {
    if (!tile.objects) {
      return;
    }
    for (const object of tile.objects) {
      const modelName = object.modelName as string;
      if (!modelName) {
        continue;
      }

      if (this.modelCache.has(modelName)) {
        continue;
      }

      const model: ModelCacheEntry = {
        stateDownload: "downloading",
        object3d: new THREE.Group(),
      };
      this.modelCache.set(modelName, model);

      const modelUrl = this.rootUrl + (object.modelUrl as string);
      const textureUrl = this.rootUrl + (object.textureUrl as string);
      this.fetchModel(modelUrl, textureUrl, model);
    }
  }

  private createNullObject3D(): THREE.Object3D {
    const obj = new THREE.Object3D();
    obj.name = "__NULL_MODEL__";
    obj.visible = false;
    obj.matrixAutoUpdate = false;
    (obj.userData as { isNull?: boolean }).isNull = true;
    return obj;
  }

  private fetchModel(modelUrl: string, textureUrl: string, entry: ModelCacheEntry): void {
    this.modelFetchQueue.enqueue(() => {
      if (!modelUrl) {
        entry.object3d = this.createNullObject3D();
        entry.stateDownload = "loaded";
        this.modelFetchQueue.done();
        return;
      }
      downloadModel(modelUrl)
        .then(async (obj3d) => {
          if (entry.stateDownload === "disposed") {
            return;
          }
          prepareModelForRender(obj3d as THREE.Object3D);
          obj3d.matrixAutoUpdate = false;
          entry.object3d = obj3d;
          if (textureUrl) {
            const textureLoader = new THREE.TextureLoader();
            try {
              const texture = await textureLoader.loadAsync(textureUrl);
              obj3d.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  const mat = child.material;
                  if (mat) {
                    mat.map = texture;
                    mat.needsUpdate = true;
                  }
                }
              });
            } catch (err) {
              obj3d.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  const edges = new THREE.EdgesGeometry(child.geometry);
                  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
                  const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
                  child.add(edgeLines);
                }
              });
            }
          }
          entry.stateDownload = "loaded";
          this.map?.triggerRepaint();
        })
        .catch((e) => {
          entry.object3d = this.createNullObject3D();
          entry.stateDownload = "loaded";
          console.warn("[ModelLayer] model failed:", e);
        })
        .finally(() => {
          this.modelFetchQueue.done();
        });
    });
  }

  private populateScene(tile: TileCacheEntry): void {
    if (!tile.sceneTile || !tile.objects || !tile.overScaledTileID) {
      return;
    }
    if (tile.isFullObject) {
      return;
    }
    const buildingGroup = tile.sceneTile.getObjectByName("building_group") as THREE.Group | null;
    const shadowGroup = tile.sceneTile.getObjectByName("shadow_group") as THREE.Group | null;
    if (!buildingGroup) {
      return;
    }
    if (buildingGroup.children.length === tile.objects.length) {
      tile.isFullObject = true;
      return;
    }
    const z = tile.overScaledTileID.canonical.z;
    const tileX = tile.overScaledTileID.canonical.x;
    const tileY = tile.overScaledTileID.canonical.y;

    for (const object of tile.objects) {
      const modelName = object.modelName as string;
      const modelId = object.id as string;
      if (!modelName || !modelId) {
        continue;
      }
      const cached = this.modelCache.get(modelName);
      if (!cached || cached.stateDownload !== "loaded" || !cached.object3d) {
        continue;
      }
      if (tile.sceneTile.getObjectByName(modelId)) {
        continue;
      }

      const latLon: LatLon = tileLocalToLatLon(z, tileX, tileY, object.localCoordX as number, object.localCoordY as number);
      const scaleUnit = getMetersPerExtentUnit(latLon.lat, z);
      const bearing = (object.bearing as number) ?? 0;
      const objectScale = (object.scale as number) ?? 1;
      const cloneObj3d = cached.object3d.clone(true);
      cloneObj3d.name = modelId;
      transformModel(object.localCoordX as number, object.localCoordY as number, 0, bearing, objectScale, scaleUnit, cloneObj3d);
      cloneObj3d.rotation.y = THREE.MathUtils.degToRad(bearing);
      cloneObj3d.matrixAutoUpdate = false;
      cloneObj3d.updateMatrix();
      cloneObj3d.updateMatrixWorld(true);
      cloneObj3d.userData = {
        modelId,
        modelName,
        objectInfo: object,
        tile: { z, x: tileX, y: tileY },
        scaleUnit,
        isModelRoot: true,
      };

      cloneObj3d.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const objectShadow = new MaplibreShadowMesh(child);
          objectShadow.userData = { scale_unit: scaleUnit };
          objectShadow.matrixAutoUpdate = false;
          shadowGroup?.add(objectShadow);
        }
      });
      buildingGroup.add(cloneObj3d);
      this.map?.triggerRepaint();
    }
  }

  private buildTileUrl(z: number, x: number, y: number): string {
    let url = this.vectorSourceUrl.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
    url = url.replace("{ratio}", "1").replace("{r}", "");
    return url;
  }
}
