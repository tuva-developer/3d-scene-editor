import type { Map, OverscaledTileID, CustomLayerInterface } from "maplibre-gl";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import * as THREE from "three";

export type OutlineLayerOptions = {
  id: string;
};

class OutlineLayer implements CustomLayerInterface {
  id: string;
  readonly type = "custom" as const;
  readonly renderingMode = "3d" as const;
  private map: Map | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private camera: THREE.Camera | null = null;
  private scene: THREE.Scene | null = null;
  private composer: EffectComposer | null = null;
  private outlinePass: OutlinePass | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private visible = true;
  private applyGlobeMatrix = false;
  private currentTile: OverscaledTileID | null = null;
  private currentObject: THREE.Object3D | null = null;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private handleResize: (() => void) | null = null;

  constructor(opts: OutlineLayerOptions) {
    this.id = opts.id;
  }

  setCurrentTileID(overTile: OverscaledTileID): void {
    this.currentTile = overTile;
  }

  attachObject(object3d: THREE.Object3D): void {
    if (!this.scene || !this.outlinePass) {
      return;
    }
    this.scene.clear();
    this.currentObject = object3d;
    this.outlinePass.selectedObjects = [this.currentObject];
  }

  unselect(): void {
    this.currentObject = null;
    if (this.outlinePass) {
      this.outlinePass.selectedObjects = [];
    }
    this.clearComposer();
  }

  private configOutlinePass(outlinePass: OutlinePass): void {
    outlinePass.renderToScreen = true;
    outlinePass.clear = false;
    outlinePass.edgeStrength = 3;
    outlinePass.edgeGlow = 0;
    outlinePass.edgeThickness = 1;
    outlinePass.visibleEdgeColor = new THREE.Color(0xff8a00);
    outlinePass.hiddenEdgeColor = new THREE.Color(0x000000);
  }

  private getMapSize(): { width: number; height: number } {
    if (!this.map) {
      return { width: 0, height: 0 };
    }
    const rect = this.map.getCanvas().getBoundingClientRect();
    return {
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
    };
  }

  private syncSize(): void {
    if (!this.renderer || !this.composer || !this.outlinePass || !this.canvas) {
      return;
    }
    const { width, height } = this.getMapSize();
    if (!width || !height) {
      return;
    }
    if (width === this.canvasWidth && height === this.canvasHeight) {
      return;
    }
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.renderer.setSize(width, height, false);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    const scale = 0.7;
    this.composer.setSize(width * scale, height * scale);
    if (typeof this.outlinePass.setSize === "function") {
      this.outlinePass.setSize(width, height);
    } else if ("resolution" in this.outlinePass) {
      this.outlinePass.resolution.set(width, height);
    }
  }

  onAdd(map: Map): void {
    this.map = map;
    this.camera = new THREE.Camera();
    this.camera.matrixAutoUpdate = false;
    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(pixelRatio);

    const canvas = this.renderer.domElement;
    this.canvas = canvas;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "1";
    canvas.style.willChange = "transform";
    canvas.style.transform = "translateZ(0)";
    canvas.style.backfaceVisibility = "hidden";
    canvas.style.perspective = "1000px";
    map.getContainer().appendChild(canvas);

    this.renderer.setClearColor(0x000000, 0);
    this.composer = new EffectComposer(this.renderer);
    const scale = 0.7;
    const { width, height } = this.getMapSize();
    this.renderer.setSize(width, height, false);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    this.composer.setSize(width * scale, height * scale);
    const outlinePass = new OutlinePass(new THREE.Vector2(width, height), this.scene, this.camera);
    this.configOutlinePass(outlinePass);
    this.composer.addPass(outlinePass);
    this.outlinePass = outlinePass;

    this.canvasWidth = width;
    this.canvasHeight = height;
    this.handleResize = () => this.syncSize();
    map.on("resize", this.handleResize);
  }

  onRemove(): void {
    if (this.handleResize && this.map) {
      this.map.off("resize", this.handleResize);
    }
    this.handleResize = null;
    if (this.canvas?.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.renderer?.dispose();
    this.scene = null;
    this.renderer = null;
    this.camera = null;
    this.map = null;
  }

  private clearComposer(): void {
    if (!this.composer || !this.renderer) {
      return;
    }
    if (this.composer.readBuffer) {
      this.renderer.setRenderTarget(this.composer.readBuffer);
      this.renderer.clear(true, true, true);
    }
    if (this.composer.writeBuffer) {
      this.renderer.setRenderTarget(this.composer.writeBuffer);
      this.renderer.clear(true, true, true);
    }
    this.renderer.setRenderTarget(null);
    this.renderer.clear(true, true, true);
  }

  render(): void {
    if (!this.map || !this.camera || !this.renderer || !this.visible || !this.composer || !this.currentObject) {
      return;
    }
    this.syncSize();
    if (this.currentTile) {
      this.renderer.clear(true, true, true);
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
      if (!this.scene) {
        return;
      }
      const originalParent = this.currentObject.parent;
      if (originalParent) {
        originalParent.remove(this.currentObject);
      }
      this.scene.add(this.currentObject);
      this.clearComposer();
      this.composer.render();
      this.scene.remove(this.currentObject);
      if (originalParent) {
        originalParent.add(this.currentObject);
      }
    }
  }
}

export default OutlineLayer;
