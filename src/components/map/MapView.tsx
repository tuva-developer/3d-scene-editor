import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import maplibregl from "maplibre-gl";
import { ModelLayer } from "@/components/map/layers/ModelLayer";
import { OverlayLayer } from "@/components/map/layers/OverlayLayer";
import OutlineLayer from "@/components/map/layers/OutlineLayer";
import { EditLayer } from "@/components/map/layers/EditLayer";
import type { TransformMode } from "@/types/common";
import { loadModelFromGlb, objectEnableClippingPlaneZ } from "@/components/map/data/models/objModel";
import * as SunCalc from "suncalc";

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  style?: React.CSSProperties;
  showTileBoundaries?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  onTransformDirtyChange?: (dirty: boolean) => void;
}

export interface MapViewHandle {
  setTransformMode(m: TransformMode): void;
  setShowTileBoundaries(show: boolean): void;
  snapObjectSelectedToGround(): void;
  enableClippingPlanesObjectSelected(enable: boolean): void;
  enableFootPrintWhenEdit(enable: boolean): void;
  addEditLayer(): void;
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
  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.addControl(new maplibregl.FullscreenControl(), "top-right");
  map.addControl(new maplibregl.ScaleControl(), "bottom-left");
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(
  (
    {
      center = [106.6297, 10.8231],
      zoom = 12,
      showTileBoundaries = true,
      onSelectionChange,
      onTransformDirtyChange,
    },
    ref
  ) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const overlayLayerRef = useRef<OverlayLayer | null>(null);
  const outlineLayerRef = useRef<OutlineLayer | null>(null);
  const currentModeRef = useRef<TransformMode>("translate");
  const editLayersRef = useRef<EditLayer[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;
    const stylePath = (import.meta.env.VITE_STYLE_PATH as string | undefined)?.trim() ?? "";
    if (!stylePath) {
      console.error("[MapView] Missing VITE_STYLE_PATH, map cannot initialize.");
      return;
    }

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: stylePath,
      center,
      zoom,
    });

    addControlMaplibre(map.current);
    map.current.showTileBoundaries = showTileBoundaries;

    map.current.on("load", () => {
      const mainMap = map.current;
      if (!mainMap) return;

      const overlayLayer = new OverlayLayer({
        id: "overlay",
        onTransformChange: onTransformDirtyChange,
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
          overlayLayer.attachGizmoToObject(info.object, currentModeRef.current === "reset" ? "translate" : currentModeRef.current);
          outlineLayer.setCurrentTileID(info.overScaledTileId);
          outlineLayer.attachObject(info.object);
          onSelectionChange?.(true);
        },
        onPickFail: () => {
          overlayLayer.unselect();
          outlineLayer.unselect();
          onSelectionChange?.(false);
        },
      });

      modelLayer.setSunPos(sunPos.altitude, sunPos.azimuth);
      mainMap.addLayer(modelLayer);
      mainMap.addLayer(outlineLayer);
      mainMap.addLayer(overlayLayer);
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [center, zoom]);

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
    addEditLayer() {
      const mainMap = map.current;
      const overlayLayer = overlayLayerRef.current;
      const outlineLayer = outlineLayerRef.current;
      if (!mainMap || !overlayLayer || !outlineLayer) {
        return;
      }
      const id = crypto.randomUUID();
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
        },
      });
      editorLayer.setSunPos(sunPos.altitude, sunPos.azimuth);
      const glbPath = (import.meta.env.VITE_EDIT_MODEL_URL as string | undefined)?.trim() || "/test_data/test.glb";
      loadModelFromGlb(glbPath)
        .then((object3d) => {
          editorLayer.addObjectsToCache([
            {
              id: glbPath,
              object3d,
            },
          ]);
          editorLayer.addObjectToScene(glbPath);
        })
        .catch((err) => {
          console.error("[MapView] Failed to load edit model:", err);
        });
      mainMap.addLayer(editorLayer);
      mainMap.moveLayer(editorLayer.id, outlineLayer.id);
      editLayersRef.current.push(editorLayer);
    },
  }));

  return <div ref={mapContainer} className="map-container" />;
});

export default MapView;
