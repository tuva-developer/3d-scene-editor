import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import maplibregl from "maplibre-gl";
import { ModelLayer } from "./layers/ModelLayer";
import { OverlayLayer } from "./layers/OverlayLayer";
import OutlineLayer from "./layers/OutlineLayer";
import type { TransformMode } from "../toolbar/TransformToolbar";
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
  }));

  return <div ref={mapContainer} className="map-container" />;
});

export default MapView;
