import type { Map, OverscaledTileID, CustomLayerInterface } from "maplibre-gl";
import type { LatLon } from "../data/types";
import { MaplibreTransformControls } from "../controls/MaplibreTransformControls";
import type { HoverParameter } from "../controls/MaplibreTransformControls";
import { decomposeObject } from "../data/models/objModel";
import type { TransformControlsMode } from "three/examples/jsm/controls/TransformControls.js";
import { tileLocalToLatLon, getMetersPerExtentUnit } from "../data/convert/coords";
import * as THREE from "three";

export type OverlayLayerOptions = {
  id: string;
  onTransformChange?: (dirty: boolean) => void;
};

export type TransformSnapshot = {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  quaternion: THREE.Quaternion;
};

export class OverlayLayer implements CustomLayerInterface {
  id: string;
  readonly type = "custom" as const;
  readonly renderingMode = "3d" as const;
  private map: Map | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private scene: THREE.Scene | null = null;
  private transformControl: MaplibreTransformControls | null = null;
  private visible = true;
  private objectTransformSnapshot: TransformSnapshot | null = null;
  private applyGlobeMatrix = false;
  private currentTile: OverscaledTileID | null = null;
  private currentObject: THREE.Object3D | null = null;
  private hoverDiv: HTMLDivElement | null = null;
  private onTransformChange?: (dirty: boolean) => void;
  private isDirty = false;

  constructor(opts: OverlayLayerOptions) {
    this.id = opts.id;
    this.onTransformChange = opts.onTransformChange;
    this.createToolTip();
  }

  setCurrentTileID(overTile: OverscaledTileID): void {
    this.currentTile = overTile;
  }

  unselect(): void {
    if (!this.scene) {
      return;
    }
    this.currentTile = null;
    this.currentObject = null;
    this.setDirty(false);
    const gizmo = this.scene.getObjectByName("TransformControls");
    if (gizmo) {
      this.scene.remove(gizmo);
    }
  }

  reset(): void {
    if (!this.objectTransformSnapshot || !this.currentObject) {
      return;
    }
    const obj = this.currentObject;
    obj.position.copy(this.objectTransformSnapshot.position);
    obj.scale.copy(this.objectTransformSnapshot.scale);
    obj.quaternion.copy(this.objectTransformSnapshot.quaternion);
    obj.updateMatrix();
    obj.updateMatrixWorld(true);
    this.map?.triggerRepaint();
    this.setDirty(false);
  }

  showToolTip(parameter: HoverParameter): void {
    if (!this.map || !this.hoverDiv) {
      return;
    }
    const object = parameter.object3D;
    const decompose = decomposeObject(parameter.object3D);
    const canvas = this.map.getCanvas();
    const rect = canvas.getBoundingClientRect();
    const screenX = (parameter.ndcX * 0.5 + 0.5) * rect.width + rect.left;
    const screenY = (-parameter.ndcY * 0.5 + 0.5) * rect.height + rect.top;
    const scale = decompose.scale;
    const bearing = decompose.bearing;
    const tileCoord = decompose.tileCoord;
    const height = decompose.height;
    this.hoverDiv.innerText =
      `Name: ${object.name}\n` +
      `Id: ${object.id}\n` +
      `Lat: ${decompose.latlon.lat}\n` +
      `Lon: ${decompose.latlon.lon}\n` +
      `Tile Coord: ${tileCoord.x}, ${tileCoord.y}\n` +
      `Elevation: ${decompose.elevation}\n` +
      `Scale: ${scale.scaleX}, ${scale.scaleY}, ${scale.scaleZ}\n` +
      `Bearing: ${bearing}\n` +
      `Height: ${height}(m)`;
    this.hoverDiv.style.left = `${screenX}px`;
    this.hoverDiv.style.top = `${screenY}px`;
    this.hoverDiv.style.display = "block";
  }

  hideToolTip(): void {
    if (!this.hoverDiv) {
      return;
    }
    this.hoverDiv.style.display = "none";
  }

  applyScaleZTransformGizmo(scaleZ: number): void {
    if (!this.transformControl) {
      return;
    }
    (this.transformControl as unknown as THREE.Object3D).traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const scaleMatrix = new THREE.Matrix4().makeScale(1, 1, 1 / scaleZ);
        child.geometry.applyMatrix4(scaleMatrix);
        child.geometry.computeBoundingBox();
        child.geometry.computeBoundingSphere();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            mat.side = THREE.DoubleSide;
            mat.needsUpdate = true;
          });
        } else {
          child.material.side = THREE.DoubleSide;
          child.material.needsUpdate = true;
        }
      }
    });
  }

  attachGizmoToObject(object: THREE.Object3D, mode: TransformControlsMode = "translate"): void {
    if (!this.currentTile || !this.renderer || !this.camera || !this.scene || !this.map) {
      return;
    }
    const gizmo = this.scene.getObjectByName("TransformControls");
    if (gizmo) {
      this.scene.remove(gizmo);
    }
    if (this.transformControl) {
      this.transformControl.removeEventListener("objectChange", this.handleObjectChange);
      this.transformControl.dispose();
    }
    this.currentObject = object;
    if (!this.currentObject) {
      return;
    }
    this.transformControl = new MaplibreTransformControls(this.camera, this.renderer.domElement, this.map, this.applyGlobeMatrix);
    const objX = object.position.x;
    const objY = object.position.y;
    const latLon: LatLon = tileLocalToLatLon(
      this.currentTile.canonical.z,
      this.currentTile.canonical.x,
      this.currentTile.canonical.y,
      objX,
      objY
    );
    this.transformControl.setSize(2);
    const scaleUnit = getMetersPerExtentUnit(latLon.lat, this.currentTile.canonical.z);
    this.applyScaleZTransformGizmo(scaleUnit);
    this.transformControl.attach(object);
    this.objectTransformSnapshot = {
      position: object.position.clone(),
      scale: object.scale.clone(),
      quaternion: object.quaternion.clone(),
    };
    if (mode === "rotate") {
      this.transformControl.showX = false;
      this.transformControl.showY = false;
      this.transformControl.showZ = true;
    }
    this.transformControl.setMode(mode);
    (this.transformControl as unknown as THREE.Object3D).visible = true;
    (this.transformControl as unknown as THREE.Object3D).name = "TransformControls";
    this.transformControl.setCurrentTile(this.currentTile);
    this.transformControl.addEventListener("objectChange", this.handleObjectChange);
    this.scene.add(this.transformControl as unknown as THREE.Object3D);
    this.setDirty(false);

    this.transformControl.onHover = (parameter: HoverParameter): void => {
      this.showToolTip(parameter);
    };
    this.transformControl.onNotHover = (): void => {
      this.hideToolTip();
    };
  }

  setMode(mode: TransformControlsMode): void {
    if (!this.transformControl) {
      return;
    }
    this.transformControl.setMode(mode);
    if (mode === "rotate") {
      this.transformControl.showX = false;
      this.transformControl.showY = false;
    } else {
      this.transformControl.showX = true;
      this.transformControl.showY = true;
      this.transformControl.showZ = true;
    }
    this.map?.triggerRepaint();
  }

  createToolTip(): void {
    this.hoverDiv = document.createElement("div");
    this.hoverDiv.style.position = "absolute";
    this.hoverDiv.style.pointerEvents = "none";
    this.hoverDiv.style.padding = "4px 6px";
    this.hoverDiv.style.background = "rgba(0,0,0,0.7)";
    this.hoverDiv.style.color = "white";
    this.hoverDiv.style.fontSize = "12px";
    this.hoverDiv.style.borderRadius = "4px";
    this.hoverDiv.style.whiteSpace = "pre-line";
    this.hoverDiv.style.display = "none";
    document.body.appendChild(this.hoverDiv);
  }

  onAdd(map: Map, gl: WebGLRenderingContext): void {
    this.map = map;
    this.camera = new THREE.PerspectiveCamera();
    this.camera.matrixAutoUpdate = false;
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });
    this.renderer.autoClear = false;
  }

  onRemove(): void {
    if (this.transformControl) {
      this.transformControl.removeEventListener("objectChange", this.handleObjectChange);
    }
    this.renderer?.dispose();
    this.scene = null;
    this.renderer = null;
    this.camera = null;
    this.map = null;
  }

  render(): void {
    if (!this.map || !this.camera || !this.renderer || !this.visible || !this.transformControl) {
      return;
    }
    if (this.currentTile) {
      const tr = this.map.transform;
      if (!tr?.getProjectionData) {
        return;
      }
      const projectionData = tr.getProjectionData({
        overscaledTileID: this.currentTile,
        applyGlobeMatrix: this.applyGlobeMatrix,
      });
      const tileMatrix = projectionData.mainMatrix;
      this.camera.projectionMatrix = new THREE.Matrix4().fromArray(tileMatrix);
      this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
      this.renderer.resetState();
      if (!this.scene) {
        return;
      }
      this.renderer.render(this.scene, this.camera);
    }
  }

  private handleObjectChange = (): void => {
    this.updateDirtyState();
  };

  private updateDirtyState(): void {
    if (!this.objectTransformSnapshot || !this.currentObject) {
      this.setDirty(false);
      return;
    }
    const snap = this.objectTransformSnapshot;
    const obj = this.currentObject;
    const epsilon = 1e-4;
    const posDiff = snap.position.distanceTo(obj.position);
    const scaleDiff = snap.scale.distanceTo(obj.scale);
    const quatDiff = 1 - Math.abs(snap.quaternion.dot(obj.quaternion));
    const dirty = posDiff > epsilon || scaleDiff > epsilon || quatDiff > epsilon;
    this.setDirty(dirty);
  }

  private setDirty(nextDirty: boolean): void {
    if (this.isDirty === nextDirty) {
      return;
    }
    this.isDirty = nextDirty;
    this.onTransformChange?.(nextDirty);
  }
}
