import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import maplibregl from "maplibre-gl";
import { ModelLayer } from "@/components/map/layers/ModelLayer";
import { OverlayLayer } from "@/components/map/layers/OverlayLayer";
import OutlineLayer from "@/components/map/layers/OutlineLayer";
import { EditLayer } from "@/components/map/layers/EditLayer";
import type { LayerOption, TransformMode } from "@/types/common";
import { loadModelFromGlb, objectEnableClippingPlaneZ } from "@/components/map/data/models/objModel";
import * as SunCalc from "suncalc";

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  styleUrl?: string;
  activeLayerId?: string;
  style?: React.CSSProperties;
  showTileBoundaries?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  onSelectionElevationChange?: (elevation: number | null) => void;
  onTransformDirtyChange?: (dirty: boolean) => void;
  onLayerOptionsChange?: (options: LayerOption[]) => void;
}

export interface MapViewHandle {
  setTransformMode(m: TransformMode): void;
  setShowTileBoundaries(show: boolean): void;
  snapObjectSelectedToGround(): void;
  enableClippingPlanesObjectSelected(enable: boolean): void;
  enableFootPrintWhenEdit(enable: boolean): void;
  addEditLayer(options?: { name?: string; modelUrl?: string }): string | null;
}

function getSunPosition(lat: number, lon: number) {
  const now = new Date();
  const sunPos = SunCalc.getPosition(now, lat, lon);
  return {
    altitude: sunPos.altitude * (180 / Math.PI),
    azimuth: sunPos.azimuth * (180 / Math.PI) + 180,
    altitudeRad: sunPos.altitude,
    azimuthRad: sunPos.azimuth,
  };
}

function addControlMaplibre(map: maplibregl.Map): void {
  map.addControl(new maplibregl.NavigationControl(), "bottom-right");
  map.addControl(new maplibregl.FullscreenControl(), "bottom-right");
  map.addControl(new maplibregl.ScaleControl(), "bottom-left");
}

function generateId(): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `layer-${Date.now().toString(36)}-${rand}`;
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(
  (
    {
      center = [106.6297, 10.8231],
      zoom = 12,
      styleUrl,
      activeLayerId,
      showTileBoundaries = true,
      onSelectionChange,
      onSelectionElevationChange,
      onTransformDirtyChange,
      onLayerOptionsChange,
    },
    ref
  ) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const overlayLayerRef = useRef<OverlayLayer | null>(null);
  const outlineLayerRef = useRef<OutlineLayer | null>(null);
  const modelLayerRef = useRef<ModelLayer | null>(null);
  const currentModeRef = useRef<TransformMode>("translate");
  const editLayersRef = useRef<Array<{ layer: EditLayer; name: string }>>([]);
  const styleUrlRef = useRef<string | null>(null);
  const activeLayerIdRef = useRef<string | undefined>(activeLayerId);
  const showTileBoundariesRef = useRef<boolean>(showTileBoundaries);
  const onSelectionChangeRef = useRef<typeof onSelectionChange>(onSelectionChange);
  const onSelectionElevationChangeRef = useRef<typeof onSelectionElevationChange>(onSelectionElevationChange);
  const onTransformDirtyChangeRef = useRef<typeof onTransformDirtyChange>(onTransformDirtyChange);
  const onLayerOptionsChangeRef = useRef<typeof onLayerOptionsChange>(onLayerOptionsChange);

  useEffect(() => {
    activeLayerIdRef.current = activeLayerId;
  }, [activeLayerId]);

  useEffect(() => {
    showTileBoundariesRef.current = showTileBoundaries;
  }, [showTileBoundaries]);

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    onSelectionElevationChangeRef.current = onSelectionElevationChange;
  }, [onSelectionElevationChange]);

  useEffect(() => {
    onTransformDirtyChangeRef.current = onTransformDirtyChange;
  }, [onTransformDirtyChange]);

  useEffect(() => {
    onLayerOptionsChangeRef.current = onLayerOptionsChange;
  }, [onLayerOptionsChange]);

  useEffect(() => {
    if (!mapContainer.current) return;
    const envStylePath = (import.meta.env.VITE_STYLE_PATH as string | undefined)?.trim() ?? "";
    const stylePath = styleUrl?.trim() || envStylePath;
    if (!stylePath) {
      console.error("[MapView] Missing VITE_STYLE_PATH, map cannot initialize.");
      return;
    }
    styleUrlRef.current = stylePath;

    const mapOptions = {
      container: mapContainer.current,
      style: stylePath,
      center,
      zoom,
      antialias: true,
    } as maplibregl.MapOptions & { antialias?: boolean };

    map.current = new maplibregl.Map(mapOptions as maplibregl.MapOptions);

    addControlMaplibre(map.current);
    map.current.showTileBoundaries = showTileBoundaries;

    const handleResize = () => {
      map.current?.resize();
    };
    window.addEventListener("resize", handleResize);
    // Ensure the map gets a correct size after initial layout.
    requestAnimationFrame(handleResize);

    const removeLayerIfExists = (mainMap: maplibregl.Map, id: string) => {
      if (mainMap.getLayer(id)) {
        mainMap.removeLayer(id);
      }
    };

    const cleanupEditorLayers = (mainMap: maplibregl.Map) => {
      overlayLayerRef.current?.unselect();
      outlineLayerRef.current?.unselect();
      removeLayerIfExists(mainMap, "models");
      removeLayerIfExists(mainMap, "outline");
      removeLayerIfExists(mainMap, "overlay");
      for (const entry of editLayersRef.current) {
        if (mainMap.getLayer(entry.layer.id)) {
          mainMap.removeLayer(entry.layer.id);
        }
      }
    };

    const getLayerOptions = (): LayerOption[] => {
      const options: LayerOption[] = [{ id: "models", label: "Models (Base)" }];
      for (const entry of editLayersRef.current) {
        options.push({ id: entry.layer.id, label: entry.name });
      }
      return options;
    };

    const updatePickEnabled = () => {
      const activeId = activeLayerIdRef.current;
      modelLayerRef.current?.setPickEnabled(activeId === "models" || !activeId);
      for (const entry of editLayersRef.current) {
        entry.layer.setPickEnabled(activeId === entry.layer.id);
      }
    };

    const addEditorLayers = (mainMap: maplibregl.Map) => {
      cleanupEditorLayers(mainMap);

      const overlayLayer = new OverlayLayer({
        id: "overlay",
        onTransformChange: (dirty) => onTransformDirtyChangeRef.current?.(dirty),
        onElevationChange: (elevation) => onSelectionElevationChangeRef.current?.(elevation),
      });
      const outlineLayer = new OutlineLayer({ id: "outline" });
      overlayLayerRef.current = overlayLayer;
      outlineLayerRef.current = outlineLayer;

      const centerPoint = mainMap.getCenter();
      const vectorSourceUrl = (import.meta.env.VITE_MAP4D_TILE_URL as string | undefined)?.trim() ?? "";
      const rootModelUrl = (import.meta.env.VITE_ROOT_MODEL_URL as string | undefined)?.trim() ?? "";
      const sourceLayer = "map4d_3dmodels";
      const sunPos = getSunPosition(centerPoint.lat, centerPoint.lng);
      const sunOptions = {
        shadow: true,
        altitude: sunPos.altitude,
        azimuth: sunPos.azimuth,
      };

      const modelLayer = new ModelLayer({
        id: "models",
        vectorSourceUrl,
        sourceLayer,
        rootUrl: rootModelUrl,
        minZoom: 16,
        maxZoom: 19,
        sun: sunOptions,
        onPick: (info) => {
          overlayLayer.setCurrentTileID(info.overScaledTileId);
          overlayLayer.attachGizmoToObject(
            info.object,
            currentModeRef.current === "reset" ? "translate" : currentModeRef.current
          );
          outlineLayer.setCurrentTileID(info.overScaledTileId);
          outlineLayer.attachObject(info.object);
          onSelectionChangeRef.current?.(true);
        },
        onPickFail: () => {
          overlayLayer.unselect();
          outlineLayer.unselect();
          onSelectionChangeRef.current?.(false);
          onSelectionElevationChangeRef.current?.(null);
        },
      });

      modelLayer.setSunPos(sunPos.altitude, sunPos.azimuth);
      modelLayerRef.current = modelLayer;
      mainMap.addLayer(modelLayer);
      mainMap.addLayer(outlineLayer);
      mainMap.addLayer(overlayLayer);

      for (const entry of editLayersRef.current) {
        mainMap.addLayer(entry.layer);
        if (mainMap.getLayer(outlineLayer.id)) {
          mainMap.moveLayer(entry.layer.id, outlineLayer.id);
        }
      }

      mainMap.showTileBoundaries = showTileBoundariesRef.current;
      updatePickEnabled();
      onLayerOptionsChangeRef.current?.(getLayerOptions());
    };

    const handleStyleLoad = () => {
      const mainMap = map.current;
      if (!mainMap) {
        return;
      }
      addEditorLayers(mainMap);
    };

    map.current.on("style.load", handleStyleLoad);
    map.current.on("load", handleStyleLoad);

    return () => {
      window.removeEventListener("resize", handleResize);
      map.current?.off("style.load", handleStyleLoad);
      map.current?.off("load", handleStyleLoad);
      if (map.current) {
        map.current.remove();
      }
    };
  }, [center, zoom]);

  useEffect(() => {
    const mainMap = map.current;
    if (!mainMap) {
      return;
    }
    const envStylePath = (import.meta.env.VITE_STYLE_PATH as string | undefined)?.trim() ?? "";
    const nextStyleUrl = styleUrl?.trim() || envStylePath;
    if (!nextStyleUrl || styleUrlRef.current === nextStyleUrl) {
      return;
    }
    styleUrlRef.current = nextStyleUrl;
    mainMap.setStyle(nextStyleUrl, { diff: true });
  }, [styleUrl]);

  useEffect(() => {
    const activeId = activeLayerId;
    modelLayerRef.current?.setPickEnabled(activeId === "models" || !activeId);
    for (const entry of editLayersRef.current) {
      entry.layer.setPickEnabled(activeId === entry.layer.id);
    }
    overlayLayerRef.current?.unselect();
    outlineLayerRef.current?.unselect();
    onSelectionChangeRef.current?.(false);
    onSelectionElevationChangeRef.current?.(null);
  }, [activeLayerId]);

  useEffect(() => {
    if (map.current) {
      map.current.showTileBoundaries = showTileBoundaries;
    }
  }, [showTileBoundaries]);

  useImperativeHandle(ref, () => ({
    setTransformMode(m) {
      currentModeRef.current = m;
      const overlay = overlayLayerRef.current;
      if (!overlay) {
        return;
      }
      if (m === "reset") {
        overlay.reset();
      } else {
        overlay.setMode(m);
      }
    },
    setShowTileBoundaries(show) {
      if (map.current) {
        map.current.showTileBoundaries = show;
      }
    },
    snapObjectSelectedToGround() {
      overlayLayerRef.current?.snapCurrentObjectToGround();
      map.current?.triggerRepaint();
    },
    enableClippingPlanesObjectSelected(enable) {
      const currentObject = overlayLayerRef.current?.getCurrentObject();
      if (!currentObject) {
        return;
      }
      objectEnableClippingPlaneZ(currentObject, enable);
      map.current?.triggerRepaint();
    },
    enableFootPrintWhenEdit(enable) {
      overlayLayerRef.current?.showFootPrint(enable);
      map.current?.triggerRepaint();
    },
    addEditLayer(options) {
      const mainMap = map.current;
      const overlayLayer = overlayLayerRef.current;
      const outlineLayer = outlineLayerRef.current;
      if (!mainMap || !overlayLayer || !outlineLayer) {
        return null;
      }
      const id = generateId();
      const layerName = options?.name?.trim() ? options.name.trim() : `Edit Layer ${id.slice(0, 6)}`;
      const centerPoint = mainMap.getCenter();
      const sunPos = getSunPosition(centerPoint.lat, centerPoint.lng);
      const sunOptions = {
        shadow: true,
        altitude: sunPos.altitude,
        azimuth: sunPos.azimuth,
      };
      const editorLayer = new EditLayer({
        id,
        sun: sunOptions,
        editorLevel: 16,
        applyGlobeMatrix: false,
        onPick: (info) => {
          overlayLayer.setCurrentTileID(info.overScaledTileId);
          overlayLayer.attachGizmoToObject(
            info.object,
            currentModeRef.current === "reset" ? "translate" : currentModeRef.current
          );
          outlineLayer.setCurrentTileID(info.overScaledTileId);
          outlineLayer.attachObject(info.object);
          onSelectionChange?.(true);
        },
        onPickFail: () => {
          overlayLayer.unselect();
          outlineLayer.unselect();
          onSelectionChange?.(false);
          onSelectionElevationChange?.(null);
        },
      });
      editorLayer.setSunPos(sunPos.altitude, sunPos.azimuth);
      const defaultGlbPath = (import.meta.env.VITE_EDIT_MODEL_URL as string | undefined)?.trim() || "/models/default.glb";
      const glbPath = options?.modelUrl?.trim() || defaultGlbPath;
      const isBlobUrl = glbPath.startsWith("blob:");
      loadModelFromGlb(glbPath)
        .then((object3d) => {
          editorLayer.addObjectsToCache([
            {
              id: glbPath,
              object3d,
            },
          ]);
          editorLayer.addObjectToScene(glbPath);
          if (isBlobUrl) {
            URL.revokeObjectURL(glbPath);
          }
        })
        .catch((err) => {
          console.error("[MapView] Failed to load edit model:", err);
          if (isBlobUrl) {
            URL.revokeObjectURL(glbPath);
          }
        });
      mainMap.addLayer(editorLayer);
      mainMap.moveLayer(editorLayer.id, outlineLayer.id);
      editLayersRef.current.push({ layer: editorLayer, name: layerName });
      editorLayer.setPickEnabled(activeLayerIdRef.current === editorLayer.id);
      onLayerOptionsChangeRef.current?.([
        { id: "models", label: "Models (Base)" },
        ...editLayersRef.current.map((entry) => ({
          id: entry.layer.id,
          label: entry.name,
        })),
      ]);
      return id;
    },
  }));

  return <div ref={mapContainer} className="absolute inset-0 h-full w-full" />;
});

export default MapView;
