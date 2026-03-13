import type { Map, OverscaledTileID } from "maplibre-gl";
import * as THREE from "three";
import { Map4DModelsThreeLayer, type Map4DModelsLayerOptions } from "@/components/map/3dlayer/ThreeDLayer";
import { CustomVectorSource } from "@/components/map/source/CustomVectorSource";
import { getSharedShadowPass } from "@/components/map/shadow/ShadowMapPass";

export type SunOptions = {
  shadow: boolean;
  altitude: number;
  azimuth: number;
};

type PickHit = {
  dist: number;
  tileKey: string;
  overScaledTileId: OverscaledTileID;
  object: THREE.Object3D;
};

export type ModelLayerOptions = Omit<Map4DModelsLayerOptions, "rootUrl"> & {
  vectorSourceUrl: string;
  rootUrl: string;
  minZoom?: number;
  maxZoom?: number;
  tileSize?: number;
  maxTileCache?: number;
  applyGlobeMatrix?: boolean;
  sun?: SunOptions;
};

export class ModelLayer extends Map4DModelsThreeLayer {
  private readonly vectorSourceUrl: string;
  private readonly minZoomValue: number;
  private readonly maxZoomValue: number;
  private readonly tileSizeValue: number;
  private boundVectorSource: CustomVectorSource | null = null;

  constructor(opts: ModelLayerOptions & { onPick?: (info: PickHit) => void; onPickFail?: () => void }) {
    super({
      id: opts.id,
      sourceLayer: opts.sourceLayer,
      rootUrl: opts.rootUrl,
      minZoom: opts.minZoom,
      maxZoom: opts.maxZoom,
      tileSize: opts.tileSize,
      maxTileCache: opts.maxTileCache,
      applyGlobeMatrix: opts.applyGlobeMatrix,
      onPick: opts.onPick,
      onPickfail: opts.onPickFail,
    });
    this.vectorSourceUrl = opts.vectorSourceUrl;
    this.minZoomValue = opts.minZoom ?? 16;
    this.maxZoomValue = opts.maxZoom ?? 19;
    this.tileSizeValue = opts.tileSize ?? 512;
    if (opts.sun) {
      this.setSunPos(opts.sun.altitude, opts.sun.azimuth, opts.sun.shadow);
    }
  }

  override onAdd(map: Map, gl: WebGLRenderingContext): void {
    super.onAdd(map, gl);
    if (!this.boundVectorSource) {
      this.boundVectorSource = new CustomVectorSource({
        id: `${this.id}-source`,
        url: this.vectorSourceUrl,
        minZoom: this.minZoomValue,
        maxZoom: this.maxZoomValue,
        tileSize: this.tileSizeValue,
        maxTileCache: 1024,
        map,
      });
      this.setVectorSource(this.boundVectorSource);
    }
  }

  setPickEnabled(enabled: boolean): void {
    (this as unknown as { pickEnabled: boolean }).pickEnabled = enabled;
  }

  setSunPos(altitude: number, azimuth: number, shadow: boolean = true): void {
    getSharedShadowPass(8192).setSunOptions({
      altitude,
      azimuth,
      shadow,
      lat: null,
      lon: null,
    });
    (this as unknown as { map?: Map | null }).map?.triggerRepaint?.();
  }
}

export default ModelLayer;
