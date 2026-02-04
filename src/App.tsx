import { useEffect, useMemo, useRef, useState } from "react";
import MapView from "@/components/map/MapView";
import { EditorToolbar } from "@/components/toolbar/EditorToolbar";
import LayerPanel from "@/components/ui/LayerPanel";
import LayerNameModal from "@/components/ui/LayerNameModal";
import TimeShadowBar from "@/components/ui/TimeShadowBar";
import TransformPanel from "@/components/ui/TransformPanel";
import type { LayerModelInfo, LayerOption, MapStyleOption, ThemeMode, TransformMode, TransformValues } from "@/types/common";
import type { MapViewHandle } from "@/components/map/MapView";

function App() {
  const envStylePath = (import.meta.env.VITE_STYLE_PATH as string | undefined)?.trim() ?? "";
  const styleOptions: MapStyleOption[] = useMemo(() => {
    const options: MapStyleOption[] = [
      {
        id: "openfreemap-liberty",
        label: "OpenFreeMap Liberty",
        url: "https://tiles.openfreemap.org/styles/liberty",
      },
      {
        id: "openfreemap-bright",
        label: "OpenFreeMap Bright",
        url: "https://tiles.openfreemap.org/styles/bright",
      },
      {
        id: "openfreemap-positron",
        label: "OpenFreeMap Positron",
        url: "https://tiles.openfreemap.org/styles/positron",
      },
      {
        id: "maplibre-demotiles",
        label: "MapLibre Demo",
        url: "https://demotiles.maplibre.org/style.json",
      },
      {
        id: "carto-positron",
        label: "CARTO Positron",
        url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      },
      {
        id: "carto-voyager",
        label: "CARTO Voyager",
        url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      },
      {
        id: "carto-dark-matter",
        label: "CARTO Dark Matter",
        url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      },
    ];

    if (envStylePath) {
      options.unshift({
        id: "env-custom",
        label: "Custom (Env)",
        url: envStylePath,
      });
    }

    return options;
  }, [envStylePath]);

  const [mode, setMode] = useState<TransformMode>("translate");
  const [showTiles, setShowTiles] = useState<boolean>(false);
  const [hasSelection, setHasSelection] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [selectionElevation, setSelectionElevation] = useState<number | null>(null);
  const [layerOptions, setLayerOptions] = useState<LayerOption[]>([{ id: "models", label: "Models (Base)" }]);
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({ models: true });
  const [layerModels, setLayerModels] = useState<Record<string, LayerModelInfo[]>>({});
  const [activeLayerId, setActiveLayerId] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "models";
    }
    return window.localStorage.getItem("scene-editor-active-layer") || "models";
  });
  const [layerModalOpen, setLayerModalOpen] = useState(false);
  const [layerModalInitialName, setLayerModalInitialName] = useState("Edit Layer 1");
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [modelModalTargetId, setModelModalTargetId] = useState<string | null>(null);
  const [modelModalTitle, setModelModalTitle] = useState("Add Model");
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(true);
  const [sunMinutes, setSunMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const [sunDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [showShadowTime, setShowShadowTime] = useState(true);
  const [transformValues, setTransformValues] = useState<TransformValues | null>(null);
  const [styleId, setStyleId] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "carto-positron";
    }
    const stored = window.localStorage.getItem("scene-editor-style-id");
    if (stored) {
      return stored;
    }
    return "carto-positron";
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    const stored = window.localStorage.getItem("scene-editor-theme");
    return stored === "light" ? "light" : "dark";
  });
  const mapHandleRef = useRef<MapViewHandle>(null);
  const mapControlsRef = useRef<HTMLDivElement>(null);
  const mapCenter = useMemo(() => [106.6297, 10.8231] as [number, number], []);
  const currentStyle = styleOptions.find((option) => option.id === styleId) ?? styleOptions[0];
  const styleUrl = currentStyle.url;
  const editLayerCount = layerOptions.filter((option) => option.id !== "models").length;
  const defaultGlbPath = (import.meta.env.VITE_EDIT_MODEL_URL as string | undefined)?.trim() || "/models/default.glb";

  const getModelName = (file: File | null, modelUrl?: string) => {
    if (file?.name) {
      return file.name;
    }
    if (modelUrl) {
      const trimmed = modelUrl.split("?")[0];
      const parts = trimmed.split("/");
      return parts[parts.length - 1] || "model.glb";
    }
    const fallback = defaultGlbPath.split("?")[0];
    const fallbackParts = fallback.split("/");
    return fallbackParts[fallbackParts.length - 1] || "model.glb";
  };

  const createModelInfo = (
    file: File | null,
    modelUrl: string | undefined,
    coords: { lat: number; lng: number } | null,
    nameOverride?: string
  ): LayerModelInfo => {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    const id = cryptoObj?.randomUUID ? cryptoObj.randomUUID() : `model-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      id,
      name: nameOverride ?? getModelName(file, modelUrl),
      coords,
    };
  };

  useEffect(() => {
    const exists = layerOptions.some((option) => option.id === activeLayerId);
    if (!exists && layerOptions[0]) {
      setActiveLayerId(layerOptions[0].id);
    }
  }, [activeLayerId, layerOptions]);

  useEffect(() => {
    setLayerVisibility((prev) => {
      const next: Record<string, boolean> = {};
      for (const option of layerOptions) {
        next[option.id] = prev[option.id] ?? true;
      }
      return next;
    });
  }, [layerOptions]);

  useEffect(() => {
    if (currentStyle.id !== styleId) {
      setStyleId(currentStyle.id);
    }
  }, [currentStyle.id, styleId]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
    window.localStorage.setItem("scene-editor-theme", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem("scene-editor-style-id", currentStyle.id);
    setHasSelection(false);
    setHasChanges(false);
    setSelectionElevation(null);
  }, [currentStyle.id]);

  useEffect(() => {
    if (!hasSelection) {
      return;
    }
    mapHandleRef.current?.setTransformMode(mode);
  }, [hasSelection, mode]);

  useEffect(() => {
    window.localStorage.setItem("scene-editor-active-layer", activeLayerId);
    setHasSelection(false);
    setHasChanges(false);
    setSelectionElevation(null);
  }, [activeLayerId]);

  useEffect(() => {
    if (!hasSelection) {
      setTransformValues(null);
      return;
    }
    let raf = 0;
    const epsilon = 1e-6;
    const isClose = (a: number, b: number) => Math.abs(a - b) <= epsilon;
    const isTransformEqual = (next: TransformValues, prev: TransformValues | null) => {
      if (!prev) return false;
      return (
        isClose(next.position[0], prev.position[0]) &&
        isClose(next.position[1], prev.position[1]) &&
        isClose(next.position[2], prev.position[2]) &&
        isClose(next.rotation[0], prev.rotation[0]) &&
        isClose(next.rotation[1], prev.rotation[1]) &&
        isClose(next.rotation[2], prev.rotation[2]) &&
        isClose(next.scale[0], prev.scale[0]) &&
        isClose(next.scale[1], prev.scale[1]) &&
        isClose(next.scale[2], prev.scale[2])
      );
    };
    const tick = () => {
      const next = mapHandleRef.current?.getSelectedTransform() ?? null;
      if (next) {
        setTransformValues((prev) => (isTransformEqual(next, prev) ? prev : next));
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [hasSelection]);

  const openLayerModal = () => {
    const defaultName = `Edit Layer ${editLayerCount + 1}`;
    setLayerModalInitialName(defaultName);
    setLayerModalOpen(true);
  };

  const handleConfirmLayerName = (name: string, _file: File | null, coords: { lat: number; lng: number } | null) => {
    const nextName = name || layerModalInitialName;
    const fallbackCenter = mapHandleRef.current?.getCenter() ?? { lat: mapCenter[1], lng: mapCenter[0] };
    const targetCoords = coords ?? fallbackCenter;
    const newLayerId = mapHandleRef.current?.addEditLayer({ name: nextName, coords: targetCoords }) ?? null;
    if (newLayerId) {
      setActiveLayerId(newLayerId);
      setLayerModels((prev) => ({ ...prev, [newLayerId]: [] }));
    }
    if (coords) {
      mapHandleRef.current?.flyToLatLng(coords.lat, coords.lng);
    }
    setLayerModalOpen(false);
  };

  const openModelModal = (layerId: string) => {
    const targetLayer = layerOptions.find((option) => option.id === layerId);
    setModelModalTargetId(layerId);
    setModelModalTitle(targetLayer ? `Add Model to ${targetLayer.label}` : "Add Model");
    setModelModalOpen(true);
    setActiveLayerId(layerId);
  };

  const handleConfirmAddModel = (
    layerId: string,
    _name: string,
    file: File | null,
    coords: { lat: number; lng: number } | null
  ) => {
    const modelUrl = file ? URL.createObjectURL(file) : undefined;
    const fallbackCenter = mapHandleRef.current?.getCenter() ?? { lat: mapCenter[1], lng: mapCenter[0] };
    const targetCoords = coords ?? fallbackCenter;
    const modelInfo = createModelInfo(file, modelUrl, targetCoords);
    const added =
      mapHandleRef.current?.addModelToLayer(layerId, {
        modelUrl,
        coords: targetCoords,
        instanceId: modelInfo.id,
        name: modelInfo.name,
      }) ?? false;
    if (added) {
      setLayerModels((prev) => ({
        ...prev,
        [layerId]: [...(prev[layerId] ?? []), modelInfo],
      }));
      if (coords) {
        mapHandleRef.current?.flyToLatLng(coords.lat, coords.lng);
      }
    }
    setModelModalOpen(false);
    setModelModalTargetId(null);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0">
        <MapView
          center={mapCenter}
          zoom={16}
          styleUrl={styleUrl}
          activeLayerId={activeLayerId}
          ref={mapHandleRef}
          mapControlsRef={mapControlsRef}
          showTileBoundaries={showTiles}
          onSelectionChange={(selected) => {
            setHasSelection(selected);
            if (!selected) {
              setHasChanges(false);
              setSelectionElevation(null);
            }
          }}
          onSelectionElevationChange={setSelectionElevation}
          onTransformDirtyChange={setHasChanges}
          onLayerOptionsChange={setLayerOptions}
        />
      </div>
      {showShadowTime ? (
        <TimeShadowBar
          minutes={sunMinutes}
          date={sunDate}
          onChange={(minutes) => {
            setSunMinutes(minutes);
            const next = new Date(sunDate);
            next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
            mapHandleRef.current?.setSunTime(next);
          }}
          onClose={() => {
            setShowShadowTime(false);
          }}
        />
      ) : null}
      <LayerPanel
        layers={layerOptions}
        activeLayerId={activeLayerId}
        visibility={layerVisibility}
        modelsByLayer={layerModels}
        onSelectLayer={setActiveLayerId}
        onToggleVisibility={(id, visible) => {
          setLayerVisibility((prev) => ({ ...prev, [id]: visible }));
          mapHandleRef.current?.setLayerVisibility(id, visible);
        }}
        onAddModel={(id) => {
          if (id === "models") {
            return;
          }
          openModelModal(id);
        }}
        onCloneModel={(layerId, model) => {
          const clonedName = `${model.name} Copy`;
          const cloned = createModelInfo(null, undefined, model.coords ?? null, clonedName);
          const clonedOk =
            mapHandleRef.current?.cloneModelInLayer(layerId, model.id, cloned.id) ?? false;
          if (!clonedOk) {
            return;
          }
          setLayerModels((prev) => ({
            ...prev,
            [layerId]: [...(prev[layerId] ?? []), { ...cloned, coords: model.coords ?? null }],
          }));
        }}
        onDeleteModel={(layerId, model) => {
          const removed = mapHandleRef.current?.removeModelFromLayer(layerId, model.id) ?? false;
          if (!removed) {
            return;
          }
          setLayerModels((prev) => ({
            ...prev,
            [layerId]: (prev[layerId] ?? []).filter((entry) => entry.id !== model.id),
          }));
        }}
        onDeleteLayer={(id) => {
          mapHandleRef.current?.removeLayer(id);
          setLayerModels((prev) => {
            if (!prev[id]) {
              return prev;
            }
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }}
        onJumpToModel={(model) => {
          if (!model.coords) {
            return;
          }
          mapHandleRef.current?.flyToLatLng(model.coords.lat, model.coords.lng, 20);
        }}
        onShowAll={() => {
          setLayerVisibility((prev) => {
            const next: Record<string, boolean> = { ...prev };
            layerOptions.forEach((layer) => {
              next[layer.id] = true;
            });
            return next;
          });
          layerOptions.forEach((layer) => {
            mapHandleRef.current?.setLayerVisibility(layer.id, true);
          });
        }}
        onHideAll={() => {
          setLayerVisibility((prev) => {
            const next: Record<string, boolean> = { ...prev };
            layerOptions.forEach((layer) => {
              next[layer.id] = false;
            });
            return next;
          });
          layerOptions.forEach((layer) => {
            mapHandleRef.current?.setLayerVisibility(layer.id, false);
          });
        }}
        onAddLayer={openLayerModal}
        isOpen={isLayerPanelOpen}
        onToggleOpen={() => setIsLayerPanelOpen((prev) => !prev)}
      />
      <TransformPanel
        values={transformValues}
        disabled={!hasSelection}
        mode={mode}
        onChangeMode={(nextMode) => {
          if (nextMode === "reset") {
            mapHandleRef.current?.setTransformMode(nextMode);
            return;
          }
          setMode(nextMode);
          mapHandleRef.current?.setTransformMode(nextMode);
        }}
        onSnapToGround={() => {
          mapHandleRef.current?.snapObjectSelectedToGround();
        }}
        enableClippingPlane={(enable) => {
          mapHandleRef.current?.enableClippingPlanesObjectSelected(enable);
        }}
        enableFootPrintWhenEdit={(enable) => {
          mapHandleRef.current?.enableFootPrintWhenEdit(enable);
        }}
        onChange={(next) => {
          mapHandleRef.current?.setSelectedTransform(next);
          setTransformValues((prev) => {
            if (!prev) {
              return prev;
            }
            return {
              position: next.position ?? prev.position,
              rotation: next.rotation ?? prev.rotation,
              scale: next.scale ?? prev.scale,
            };
          });
        }}
      />
      <EditorToolbar
        showTiles={showTiles}
        onToggleTiles={() => {
          setShowTiles((current) => {
            const next = !current;
            mapHandleRef.current?.setShowTileBoundaries(next);
            return next;
          });
        }}
        theme={theme}
        onToggleTheme={() => {
          setTheme((current) => (current === "dark" ? "light" : "dark"));
        }}
        styleOptions={styleOptions}
        styleId={currentStyle.id}
        onChangeStyle={setStyleId}
        defaultZoom={16}
        onFlyTo={(lat, lng, zoom) => {
          mapHandleRef.current?.flyToLatLng(lat, lng, zoom);
        }}
        showShadowTime={showShadowTime}
        onToggleShadowTime={() => setShowShadowTime((prev) => !prev)}
        mapControlsRef={mapControlsRef}
      />
      <LayerNameModal
        open={layerModalOpen}
        initialValue={layerModalInitialName}
        onCancel={() => setLayerModalOpen(false)}
        onConfirm={handleConfirmLayerName}
        title="New Edit Layer"
        confirmLabel="Create Layer"
        showModelInput={false}
        showCoordsInput={false}
      />
      <LayerNameModal
        open={modelModalOpen}
        initialValue=""
        onCancel={() => {
          setModelModalOpen(false);
          setModelModalTargetId(null);
        }}
        onConfirm={(name, file, coords) => {
          if (!modelModalTargetId) {
            setModelModalOpen(false);
            return;
          }
          handleConfirmAddModel(modelModalTargetId, name, file, coords);
        }}
        title={modelModalTitle}
        subtitle="Choose a model to add to this layer."
        confirmLabel="Add Model"
        showNameInput={false}
        showCoordsInput={true}
        showModelInput={true}
      />
    </div>
  );
}

export default App;
