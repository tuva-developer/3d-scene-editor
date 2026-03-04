import { useEffect, useMemo, useRef, useState } from "react";
import MapView from "@/components/map/MapView";
import { EditorToolbar } from "@/components/toolbar/EditorToolbar";
import LayerNameModal from "@/components/ui/LayerNameModal";
import InstanceLayerModal from "@/components/ui/InstanceLayerModal";
import WaterLayerModal from "@/components/ui/WaterLayerModal";
import WaterSettingsModal from "@/components/ui/WaterSettingsModal";
import LightSettingsModal, { type LightIntensitySettings } from "@/components/ui/LightSettingsModal";
import TimeShadowBar from "@/components/ui/TimeShadowBar";
import LoginModal from "@/components/ui/LoginModal";
import RightInspectorPanel from "@/components/ui/RightInspectorPanel";
import { useAuth } from "@/contexts/AuthContext";
import type { LayerModelInfo, LayerOption, ThemeMode, TransformMode, TransformValues } from "@/types/common";
import type { MapViewHandle } from "@/components/map/MapView";
import type { LightGroupOption } from "@/components/map/data/models/objModel";
import { DEFAULT_WATER_SETTINGS, type WaterSettings } from "@/components/map/water/WaterMaterial";

const NO_ACTIVE_LAYER_ID = "__no_active_layer__";

type SceneFileV2 = {
  version: 2;
  exportedAt: string;
  payload: {
    viewState: { center: [number, number]; zoom: number; bearing: number; pitch: number } | null;
    weather: "sun" | "rain" | "snow";
    daylight: "morning" | "noon" | "evening" | "night";
    rainDensity: number;
    snowDensity: number;
    sunMinutes: number;
    showShadowTime: boolean;
    baseLayerLocked: boolean;
    activeLayerId: string;
    layerVisibility: Record<string, boolean>;
    layerLightSettings: Record<string, LightIntensitySettings>;
    waterLayerSettings: Record<string, WaterSettings>;
    customInstanceLayers: LayerOption[];
    customWaterLayers: LayerOption[];
    instanceLayerConfigs: Record<string, { tileUrl: string; sourceLayer: string; modelUrls: string[] }>;
    waterLayerConfigs: Record<string, { tileUrl: string; sourceLayer: string; normalTextureUrl?: string }>;
    editLayers: Array<{
      id: string;
      name: string;
      models: Array<{
        instanceId: string;
        name: string;
        modelUrl: string;
        coords: { lat: number; lng: number } | null;
        tile: { z: number; x: number; y: number };
        scaleUnit: number;
        transform: {
          position: [number, number, number];
          rotation: [number, number, number];
          scale: [number, number, number];
        };
      }>;
    }>;
  };
};

function App() {
  const styleUrl = (import.meta.env.VITE_STYLE_PATH as string | undefined)?.trim() ?? "";
  const { isEditor, user, login, logout } = useAuth();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [mode, setMode] = useState<TransformMode>("translate");
  const [showTiles, setShowTiles] = useState<boolean>(false);
  const [hasSelection, setHasSelection] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [selectionElevation, setSelectionElevation] = useState<number | null>(null);
  const [mapLayerOptions, setMapLayerOptions] = useState<LayerOption[]>([
    { id: "models", label: "Base Models", kind: "base" },
  ]);
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({ models: true });
  const [layerModels, setLayerModels] = useState<Record<string, LayerModelInfo[]>>({});
  const [activeLayerId, setActiveLayerId] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "models";
    }
    return window.localStorage.getItem("scene-editor-active-layer") || "models";
  });
  const [baseLayerLocked, setBaseLayerLocked] = useState(true);
  const [layerModalOpen, setLayerModalOpen] = useState(false);
  const [layerModalInitialName, setLayerModalInitialName] = useState("Edit Layer 1");
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [modelModalTargetId, setModelModalTargetId] = useState<string | null>(null);
  const [modelModalTitle, setModelModalTitle] = useState("Add Model");
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeRightTab, setActiveRightTab] = useState<"layers" | "selection">("layers");
  const [sunMinutes, setSunMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const [sunDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [showShadowTime, setShowShadowTime] = useState(true);
  const [weather, setWeather] = useState<"sun" | "rain" | "snow">("sun");
  const [daylight, setDaylight] = useState<"morning" | "noon" | "evening" | "night">("noon");
  const [rainDensity, setRainDensity] = useState(1.4);
  const [snowDensity, setSnowDensity] = useState(1.3);
  const [transformValues, setTransformValues] = useState<TransformValues | null>(null);
  const [instanceLayerModalOpen, setInstanceLayerModalOpen] = useState(false);
  const [instanceModelFiles, setInstanceModelFiles] = useState<File[]>([]);
  const [instanceLayerName, setInstanceLayerName] = useState("Custom Layer 1");
  const [customInstanceLayers, setCustomInstanceLayers] = useState<LayerOption[]>([]);
  const [instanceLayerConfigs, setInstanceLayerConfigs] = useState<
    Record<string, { tileUrl: string; sourceLayer: string; modelUrls: string[] }>
  >({});
  const [waterLayerModalOpen, setWaterLayerModalOpen] = useState(false);
  const [waterLayerName, setWaterLayerName] = useState("Water Layer 1");
  const [waterTextureFile, setWaterTextureFile] = useState<File | null>(null);
  const [customWaterLayers, setCustomWaterLayers] = useState<LayerOption[]>([]);
  const [waterLayerConfigs, setWaterLayerConfigs] = useState<
    Record<string, { tileUrl: string; sourceLayer: string; normalTextureUrl?: string }>
  >({});
  const [waterLayerSettings, setWaterLayerSettings] = useState<Record<string, WaterSettings>>({});
  const [layerLightSettings, setLayerLightSettings] = useState<Record<string, LightIntensitySettings>>({});
  const [waterSettingsModalOpen, setWaterSettingsModalOpen] = useState(false);
  const [waterSettingsTargetId, setWaterSettingsTargetId] = useState<string | null>(null);
  const [waterSettingsBaseline, setWaterSettingsBaseline] = useState<WaterSettings | null>(null);
  const [lightSettingsModalOpen, setLightSettingsModalOpen] = useState(false);
  const [lightSettingsTargetId, setLightSettingsTargetId] = useState<string | null>(null);
  const [lightSettingsBaseline, setLightSettingsBaseline] = useState<LightIntensitySettings | null>(null);
  const instanceBlobUrlsRef = useRef<Map<string, string[]>>(new Map());
  const waterBlobUrlsRef = useRef<Map<string, string>>(new Map());
  const importSceneInputRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    const stored = window.localStorage.getItem("scene-editor-theme");
    return stored === "light" ? "light" : "dark";
  });
  const mapHandleRef = useRef<MapViewHandle>(null);
  const mapCenter = useMemo(() => [106.72135300000002, 10.796071] as [number, number], []);
  const editLayerCount = mapLayerOptions.filter((option) => option.id !== "models").length;
  const customLayerCount = customInstanceLayers.length;
  const customWaterCount = customWaterLayers.length;
  const defaultGlbPath = (import.meta.env.VITE_EDIT_MODEL_URL as string | undefined)?.trim() || "/models/default.glb";
  const defaultInstanceTileUrl =
    (import.meta.env.VITE_INSTANCE_TILE_URL as string | undefined)?.trim() ||
    "http://10.222.3.81:8083/VietbandoMapService/api/image/?Function=GetVectorTile&MapName=IndoorNavigation&Level={z}&TileX={x}&TileY={y}&UseTileCache=true";
  const defaultInstanceSourceLayer =
    (import.meta.env.VITE_INSTANCE_SOURCE_LAYER as string | undefined)?.trim() || "trees";
  const defaultInstanceModelUrls = useMemo(
    () => [
      "/test_data/test_instance/tree2.glb",
      "/test_data/test_instance/tree3.glb",
      "/test_data/test_instance/tree4.glb",
      "/test_data/test_instance/tree5.glb",
      "/test_data/test_instance/tree6.glb",
    ],
    []
  );
  const defaultWaterTileUrl =
    (import.meta.env.VITE_WATER_TILE_URL as string | undefined)?.trim() ||
    "https://images.daklak.gov.vn/v2/tile/{z}/{x}/{y}/306ec9b5-8146-4a83-9271-bd7b343a574a";
  const defaultWaterSourceLayer =
    (import.meta.env.VITE_WATER_SOURCE_LAYER as string | undefined)?.trim() || "region_river_index";
  const defaultLightOption: LightGroupOption = {
    directional: {
      intensity: 5,
    },
    hemisphere: {
      intensity: 2.5,
    },
    ambient: {
      intensity: 1.2,
    },
  };
  const defaultLightSettings: LightIntensitySettings = {
    directional: defaultLightOption.directional?.intensity ?? 5,
    hemisphere: defaultLightOption.hemisphere?.intensity ?? 2.5,
    ambient: defaultLightOption.ambient?.intensity ?? 1.2,
  };
  const lightIntensityRange = { min: 0.2, max: 3, step: 0.05 };
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
  const normalizeLightSettings = (settings: LightIntensitySettings): LightIntensitySettings => ({
    directional: clamp(settings.directional, lightIntensityRange.min, lightIntensityRange.max),
    hemisphere: clamp(settings.hemisphere, lightIntensityRange.min, lightIntensityRange.max),
    ambient: clamp(settings.ambient, lightIntensityRange.min, lightIntensityRange.max),
  });
  const toLightOption = (settings: LightIntensitySettings): LightGroupOption => ({
    directional: {
      intensity: settings.directional,
    },
    hemisphere: {
      intensity: settings.hemisphere,
    },
    ambient: {
      intensity: settings.ambient,
    },
  });
  const previewLightSettings = (layerId: string, settings: LightIntensitySettings) => {
    const next = normalizeLightSettings(settings);
    mapHandleRef.current?.setLayerLightOption(layerId, toLightOption(next));
  };
  const applyLightSettings = (layerId: string, settings: LightIntensitySettings) => {
    const next = normalizeLightSettings(settings);
    mapHandleRef.current?.setLayerLightOption(layerId, toLightOption(next));
    setLayerLightSettings((prev) => ({ ...prev, [layerId]: next }));
  };

  const applyDaylight = (mode: "morning" | "noon" | "evening" | "night") => {
    setDaylight(mode);
    const presetMinutes =
      mode === "morning" ? 8 * 60 : mode === "noon" ? 12 * 60 : mode === "evening" ? 17 * 60 + 30 : 21 * 60;
    setSunMinutes(presetMinutes);
    const next = new Date(sunDate);
    next.setHours(Math.floor(presetMinutes / 60), presetMinutes % 60, 0, 0);
    mapHandleRef.current?.setSunTime(next);
  };

  const getDaylightFromMinutes = (minutes: number) => {
    if (minutes >= 5 * 60 && minutes < 11 * 60) {
      return "morning";
    }
    if (minutes >= 11 * 60 && minutes < 15 * 60) {
      return "noon";
    }
    if (minutes >= 15 * 60 && minutes < 19 * 60 + 30) {
      return "evening";
    }
    return "night";
  };

  const revokeInstanceBlobUrls = (layerId?: string) => {
    if (layerId) {
      const urls = instanceBlobUrlsRef.current.get(layerId);
      if (urls && urls.length > 0) {
        urls.forEach((url) => URL.revokeObjectURL(url));
        instanceBlobUrlsRef.current.delete(layerId);
      }
      return;
    }
    for (const [id, urls] of instanceBlobUrlsRef.current.entries()) {
      urls.forEach((url) => URL.revokeObjectURL(url));
      instanceBlobUrlsRef.current.delete(id);
    }
  };

  const revokeWaterBlobUrls = (layerId?: string) => {
    if (layerId) {
      const url = waterBlobUrlsRef.current.get(layerId);
      if (url) {
        URL.revokeObjectURL(url);
        waterBlobUrlsRef.current.delete(layerId);
      }
      return;
    }
    for (const [id, url] of waterBlobUrlsRef.current.entries()) {
      URL.revokeObjectURL(url);
      waterBlobUrlsRef.current.delete(id);
    }
  };

  useEffect(() => {
    return () => {
      revokeInstanceBlobUrls();
      revokeWaterBlobUrls();
    };
  }, []);

  const layerOptions = useMemo(() => {
    const merged = new Map<string, LayerOption>();
    mapLayerOptions.forEach((layer) => {
      merged.set(layer.id, layer);
    });
    customInstanceLayers.forEach((layer) => {
      merged.set(layer.id, layer);
    });
    customWaterLayers.forEach((layer) => {
      merged.set(layer.id, layer);
    });
    return Array.from(merged.values());
  }, [customInstanceLayers, customWaterLayers, mapLayerOptions]);

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

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    if (activeLayerId === NO_ACTIVE_LAYER_ID) {
      return;
    }
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
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
    window.localStorage.setItem("scene-editor-theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("scene-panel-open", isEditor && isRightPanelOpen && !isFullscreen);
    return () => {
      root.classList.remove("scene-panel-open");
    };
  }, [isEditor, isRightPanelOpen, isFullscreen]);

  useEffect(() => {
    const syncFullscreenState = () => {
      const hasNativeFullscreen =
        Boolean(document.fullscreenElement) ||
        Boolean((document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement) ||
        Boolean((document as Document & { mozFullScreenElement?: Element | null }).mozFullScreenElement) ||
        Boolean((document as Document & { msFullscreenElement?: Element | null }).msFullscreenElement);
      const hasPseudoFullscreen = Boolean(document.querySelector(".maplibregl-pseudo-fullscreen"));
      setIsFullscreen(hasNativeFullscreen || hasPseudoFullscreen);
    };
    const handleFullscreenButtonClick = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      const button = target.closest("button.maplibregl-ctrl-fullscreen, button.maplibregl-ctrl-shrink");
      if (!button) {
        return;
      }
      window.setTimeout(syncFullscreenState, 0);
    };
    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState as EventListener);
    document.addEventListener("mozfullscreenchange", syncFullscreenState as EventListener);
    document.addEventListener("MSFullscreenChange", syncFullscreenState as EventListener);
    document.addEventListener("click", handleFullscreenButtonClick, true);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState as EventListener);
      document.removeEventListener("mozfullscreenchange", syncFullscreenState as EventListener);
      document.removeEventListener("MSFullscreenChange", syncFullscreenState as EventListener);
      document.removeEventListener("click", handleFullscreenButtonClick, true);
    };
  }, []);

  useEffect(() => {
    setHasSelection(false);
    setHasChanges(false);
    setSelectionElevation(null);
  }, []);

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
    setTransformValues(null);
  }, [activeLayerId]);

  useEffect(() => {
    if (!baseLayerLocked) {
      return;
    }
    if (activeLayerId !== "models") {
      return;
    }
    const fallbackLayerId =
      layerOptions.find((option) => option.id !== "models")?.id ?? NO_ACTIVE_LAYER_ID;
    setActiveLayerId(fallbackLayerId);
  }, [activeLayerId, baseLayerLocked, layerOptions]);

  useEffect(() => {
    if (baseLayerLocked) {
      return;
    }
    if (activeLayerId !== NO_ACTIVE_LAYER_ID) {
      return;
    }
    setActiveLayerId("models");
  }, [activeLayerId, baseLayerLocked]);

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

  useEffect(() => {
    if (!hasSelection && activeRightTab === "selection") {
      setActiveRightTab("layers");
    }
  }, [activeRightTab, hasSelection]);

  const openLayerModal = () => {
    const defaultName = `Edit Layer ${editLayerCount + 1}`;
    setLayerModalInitialName(defaultName);
    setLayerModalOpen(true);
  };

  const openInstanceLayerModal = () => {
    const defaultName = `Custom Layer ${customLayerCount + 1}`;
    setInstanceLayerName(defaultName);
    setInstanceLayerModalOpen(true);
  };

  const openWaterLayerModal = () => {
    const defaultName = `Water Layer ${customWaterCount + 1}`;
    setWaterLayerName(defaultName);
    setWaterLayerModalOpen(true);
  };

  const openWaterSettingsModal = (layerId: string) => {
    const baseline = waterLayerSettings[layerId] ?? DEFAULT_WATER_SETTINGS;
    setWaterSettingsBaseline(baseline);
    setWaterSettingsTargetId(layerId);
    setWaterSettingsModalOpen(true);
  };

  const openLightSettingsModal = (layerId: string) => {
    const baseline = layerLightSettings[layerId] ?? defaultLightSettings;
    setLightSettingsBaseline(baseline);
    setLightSettingsTargetId(layerId);
    setLightSettingsModalOpen(true);
  };

  const handleConfirmLayerName = (name: string, _file: File | null, coords: { lat: number; lng: number } | null) => {
    const nextName = name || layerModalInitialName;
    const fallbackCenter = mapHandleRef.current?.getCenter() ?? { lat: mapCenter[1], lng: mapCenter[0] };
    const targetCoords = coords ?? fallbackCenter;
    const newLayerId = mapHandleRef.current?.addEditLayer({ name: nextName, coords: targetCoords }) ?? null;
    if (newLayerId) {
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

  const handleConfirmAddModel = async (
    layerId: string,
    _name: string,
    file: File | null,
    coords: { lat: number; lng: number } | null
  ) => {
    const modelUrl = file ? await readFileAsDataUrl(file) : undefined;
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

  const handleToggleLayerVisibility = (id: string, visible: boolean) => {
    setLayerVisibility((prev) => ({ ...prev, [id]: visible }));
    mapHandleRef.current?.setLayerVisibility(id, visible);
  };

  const handleAddModelToLayer = (id: string) => {
    if (id === "models") {
      return;
    }
    openModelModal(id);
  };

  const handleCloneLayerModel = (layerId: string, model: LayerModelInfo) => {
    const clonedName = `${model.name} Copy`;
    const cloned = createModelInfo(null, undefined, model.coords ?? null, clonedName);
    const clonedOk = mapHandleRef.current?.cloneModelInLayer(layerId, model.id, cloned.id) ?? false;
    if (!clonedOk) {
      return;
    }
    setLayerModels((prev) => ({
      ...prev,
      [layerId]: [...(prev[layerId] ?? []), { ...cloned, coords: model.coords ?? null }],
    }));
  };

  const handleDeleteLayerModel = (layerId: string, model: LayerModelInfo) => {
    const removed = mapHandleRef.current?.removeModelFromLayer(layerId, model.id) ?? false;
    if (!removed) {
      return;
    }
    setLayerModels((prev) => ({
      ...prev,
      [layerId]: (prev[layerId] ?? []).filter((entry) => entry.id !== model.id),
    }));
  };

  const handleDeleteLayer = (id: string) => {
    const isCustom = customInstanceLayers.some((layer) => layer.id === id);
    const isWater = customWaterLayers.some((layer) => layer.id === id);
    mapHandleRef.current?.removeLayer(id);
    setLayerLightSettings((prev) => {
      if (!(id in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (isCustom) {
      revokeInstanceBlobUrls(id);
      setCustomInstanceLayers((prev) => prev.filter((layer) => layer.id !== id));
      setInstanceLayerConfigs((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setLayerVisibility((prev) => {
        if (!(id in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    if (isWater) {
      revokeWaterBlobUrls(id);
      setCustomWaterLayers((prev) => prev.filter((layer) => layer.id !== id));
      setWaterLayerConfigs((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setLayerVisibility((prev) => {
        if (!(id in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setWaterLayerSettings((prev) => {
        if (!(id in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    setLayerModels((prev) => {
      if (!prev[id]) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleRenameLayer = (id: string, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed || id === "models") {
      return;
    }
    const isCustom = customInstanceLayers.some((layer) => layer.id === id);
    const isWater = customWaterLayers.some((layer) => layer.id === id);
    if (isCustom) {
      setCustomInstanceLayers((prev) =>
        prev.map((layer) => (layer.id === id ? { ...layer, label: trimmed } : layer))
      );
      return;
    }
    if (isWater) {
      setCustomWaterLayers((prev) =>
        prev.map((layer) => (layer.id === id ? { ...layer, label: trimmed } : layer))
      );
      return;
    }
    const renamed = mapHandleRef.current?.renameLayer(id, trimmed) ?? false;
    if (!renamed) {
      setMapLayerOptions((prev) =>
        prev.map((layer) => (layer.id === id ? { ...layer, label: trimmed } : layer))
      );
    }
  };

  const handleJumpToModel = (model: LayerModelInfo) => {
    if (!model.coords) {
      return;
    }
    mapHandleRef.current?.flyToLatLng(model.coords.lat, model.coords.lng, 20);
  };

  const handleShowAllLayers = () => {
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
  };

  const handleHideAllLayers = () => {
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
  };

  const handleTransformModeChange = (nextMode: TransformMode) => {
    if (nextMode === "reset") {
      mapHandleRef.current?.setTransformMode(nextMode);
      return;
    }
    setMode(nextMode);
    mapHandleRef.current?.setTransformMode(nextMode);
  };

  const handleTransformChange = (next: Partial<TransformValues>) => {
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
  };

  const handleSelectLayer = (id: string) => {
    if (id === "models" && baseLayerLocked) {
      return;
    }
    setActiveLayerId(id);
  };

  const restoreSceneFromFile = (scene: SceneFileV2) => {
    const saved = scene.payload;
    const mapHandle = mapHandleRef.current;
    if (!mapHandle) {
      window.alert("Map is not ready yet.");
      return;
    }

    const removableIds = layerOptions.filter((layer) => layer.id !== "models").map((layer) => layer.id);
    removableIds.forEach((id) => mapHandle.removeLayer(id));
    revokeInstanceBlobUrls();
    revokeWaterBlobUrls();
    setLayerModels({});
    setCustomInstanceLayers([]);
    setCustomWaterLayers([]);
    setInstanceLayerConfigs({});
    setWaterLayerConfigs({});
    setWaterLayerSettings({});
    setLayerLightSettings({});
    setLayerVisibility({ models: true });

    const nextLayerModels: Record<string, LayerModelInfo[]> = {};
    (saved.editLayers ?? []).forEach((layer) => {
      const createdId = mapHandle.addEditLayer({ layerId: layer.id, name: layer.name }) ?? null;
      if (!createdId) {
        return;
      }
      nextLayerModels[layer.id] = [];
      (layer.models ?? []).forEach((model) => {
        mapHandle.addModelToLayer(layer.id, {
          modelUrl: model.modelUrl,
          instanceId: model.instanceId,
          name: model.name,
          coords: model.coords ?? undefined,
          initialState: {
            tile: model.tile,
            scaleUnit: model.scaleUnit,
            transform: model.transform,
            coords: model.coords,
          },
        });
        nextLayerModels[layer.id].push({
          id: model.instanceId,
          name: model.name,
          coords: model.coords,
        });
      });
    });
    setLayerModels(nextLayerModels);

    const restoredInstanceLayers: LayerOption[] = [];
    (saved.customInstanceLayers ?? []).forEach((layer) => {
      const config = saved.instanceLayerConfigs?.[layer.id];
      if (!config) {
        return;
      }
      const modelUrls = (config.modelUrls ?? []).filter((url) => typeof url === "string" && url.trim().length > 0);
      if (modelUrls.length === 0) {
        return;
      }
      const createdId = mapHandle.addInstanceLayer({
        layerId: layer.id,
        tileUrl: config.tileUrl,
        sourceLayer: config.sourceLayer,
        modelUrls,
      });
      if (createdId) {
        restoredInstanceLayers.push(layer);
      }
    });
    setCustomInstanceLayers(restoredInstanceLayers);
    setInstanceLayerConfigs(saved.instanceLayerConfigs ?? {});

    const restoredWaterLayers: LayerOption[] = [];
    (saved.customWaterLayers ?? []).forEach((layer) => {
      const config = saved.waterLayerConfigs?.[layer.id];
      if (!config) {
        return;
      }
      const settings = saved.waterLayerSettings?.[layer.id] ?? DEFAULT_WATER_SETTINGS;
      const createdId = mapHandle.addWaterLayer({
        layerId: layer.id,
        tileUrl: config.tileUrl,
        sourceLayer: config.sourceLayer,
        normalTextureUrl: config.normalTextureUrl,
        settings,
      });
      if (createdId) {
        restoredWaterLayers.push(layer);
      }
    });
    setCustomWaterLayers(restoredWaterLayers);
    setWaterLayerConfigs(saved.waterLayerConfigs ?? {});
    setWaterLayerSettings(saved.waterLayerSettings ?? {});
    setLayerLightSettings(saved.layerLightSettings ?? {});

    const visibilityNext = { models: true, ...(saved.layerVisibility ?? {}) };
    setLayerVisibility(visibilityNext);
    Object.entries(visibilityNext).forEach(([id, visible]) => {
      mapHandle.setLayerVisibility(id, Boolean(visible));
    });

    Object.entries(saved.layerLightSettings ?? {}).forEach(([id, settings]) => {
      mapHandle.setLayerLightOption(id, toLightOption(settings));
    });
    Object.entries(saved.waterLayerSettings ?? {}).forEach(([id, settings]) => {
      mapHandle.setWaterLayerSettings(id, settings);
    });

    setWeather(saved.weather ?? "sun");
    setDaylight(saved.daylight ?? "noon");
    setRainDensity(saved.rainDensity ?? 1.4);
    setSnowDensity(saved.snowDensity ?? 1.3);
    setShowShadowTime(saved.showShadowTime ?? true);
    setBaseLayerLocked(saved.baseLayerLocked ?? true);

    const nextMinutes = saved.sunMinutes ?? (new Date().getHours() * 60 + new Date().getMinutes());
    setSunMinutes(nextMinutes);
    const sunTime = new Date(sunDate);
    sunTime.setHours(Math.floor(nextMinutes / 60), nextMinutes % 60, 0, 0);
    mapHandle.setSunTime(sunTime);

    if (saved.viewState) {
      mapHandle.setViewState(saved.viewState);
    }

    setActiveLayerId(saved.activeLayerId || "models");
  };

  const handleExportSceneJson = () => {
    if (typeof window === "undefined") {
      return;
    }
    const mapHandle = mapHandleRef.current;
    if (!mapHandle) {
      window.alert("Map is not ready yet.");
      return;
    }
    const payload: SceneFileV2 = {
      version: 2,
      exportedAt: new Date().toISOString(),
      payload: {
        viewState: mapHandle.getViewState(),
        weather,
        daylight,
        rainDensity,
        snowDensity,
        sunMinutes,
        showShadowTime,
        baseLayerLocked,
        activeLayerId,
        layerVisibility,
        layerLightSettings,
        waterLayerSettings,
        customInstanceLayers,
        customWaterLayers,
        instanceLayerConfigs,
        waterLayerConfigs,
        editLayers: mapHandle.getEditLayerSnapshots(),
      },
    };
    const text = JSON.stringify(payload, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const defaultName = `scene-editor-v2-${stamp}.json`;
    const enteredName = window.prompt("Enter export file name", defaultName);
    if (enteredName === null) {
      URL.revokeObjectURL(url);
      return;
    }
    const trimmedName = enteredName.trim();
    const safeBaseName = trimmedName.length > 0 ? trimmedName : defaultName;
    const finalName = safeBaseName.toLowerCase().endsWith(".json") ? safeBaseName : `${safeBaseName}.json`;
    const a = document.createElement("a");
    a.href = url;
    a.download = finalName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSceneFile = async (file: File) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      window.alert("Invalid JSON file.");
      return;
    }
    const scene = parsed as SceneFileV2;
    if (!scene || scene.version !== 2 || !scene.payload) {
      window.alert("Unsupported scene file version.");
      return;
    }
    restoreSceneFromFile(scene);
    window.alert("Scene imported successfully.");
  };

  const handleOpenImportScene = () => {
    importSceneInputRef.current?.click();
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
          showTileBoundaries={showTiles}
          weather={weather}
          daylight={daylight}
          rainDensity={rainDensity}
          snowDensity={snowDensity}
          onSelectionChange={(selected) => {
            setHasSelection((prev) => {
              if (!prev && selected && isRightPanelOpen) {
                setActiveRightTab("selection");
              }
              return selected;
            });
            if (!selected) {
              setHasChanges(false);
              setSelectionElevation(null);
            }
          }}
          onSelectionElevationChange={setSelectionElevation}
          onTransformDirtyChange={setHasChanges}
        onLayerOptionsChange={setMapLayerOptions}
        />
      </div>
      {isEditor && showShadowTime ? (
        <TimeShadowBar
          minutes={sunMinutes}
          date={sunDate}
          onChange={(minutes) => {
            setSunMinutes(minutes);
            setDaylight(getDaylightFromMinutes(minutes));
            const next = new Date(sunDate);
            next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
            mapHandleRef.current?.setSunTime(next);
          }}
          onClose={() => {
            setShowShadowTime(false);
          }}
        />
      ) : null}
      {isEditor ? (
        <>
          <RightInspectorPanel
            isOpen={isRightPanelOpen}
            activeTab={activeRightTab}
            hasSelection={hasSelection}
            onClose={() => setIsRightPanelOpen(false)}
            onChangeTab={setActiveRightTab}
            layers={layerOptions}
            activeLayerId={activeLayerId}
            visibility={layerVisibility}
            modelsByLayer={layerModels}
            onSelectLayer={handleSelectLayer}
            onToggleLayerVisibility={handleToggleLayerVisibility}
            onAddModel={handleAddModelToLayer}
            onCloneModel={handleCloneLayerModel}
            onDeleteModel={handleDeleteLayerModel}
            onDeleteLayer={handleDeleteLayer}
            onRenameLayer={handleRenameLayer}
            onJumpToModel={handleJumpToModel}
            onShowAllLayers={handleShowAllLayers}
            onHideAllLayers={handleHideAllLayers}
            onAddLayer={openLayerModal}
            onAddInstanceLayer={openInstanceLayerModal}
            onAddWaterLayer={openWaterLayerModal}
            baseLayerLocked={baseLayerLocked}
            onToggleBaseLayerLock={(locked) => {
              setBaseLayerLocked(locked);
              if (locked && activeLayerId === "models") {
                const fallbackLayerId =
                  layerOptions.find((option) => option.id !== "models")?.id ?? NO_ACTIVE_LAYER_ID;
                setActiveLayerId(fallbackLayerId);
              }
              if (!locked && activeLayerId === NO_ACTIVE_LAYER_ID) {
                setActiveLayerId("models");
              }
            }}
            onEditWaterLayer={openWaterSettingsModal}
            onEditLayerLight={openLightSettingsModal}
            transformValues={transformValues}
            mode={mode}
            onChangeMode={handleTransformModeChange}
            onSnapToGround={() => {
              mapHandleRef.current?.snapObjectSelectedToGround();
            }}
            onFlyToSelected={() => {
              mapHandleRef.current?.flyToSelectedModel(19);
            }}
            onEnableClippingPlane={(enable) => {
              mapHandleRef.current?.enableClippingPlanesObjectSelected(enable);
            }}
            onEnableFootPrintWhenEdit={(enable) => {
              mapHandleRef.current?.enableFootPrintWhenEdit(enable);
            }}
            onChangeTransform={handleTransformChange}
          />
        </>
      ) : null}
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
        defaultZoom={16}
        onFlyTo={(lat, lng, zoom) => {
          mapHandleRef.current?.flyToLatLng(lat, lng, zoom);
        }}
        showShadowTime={showShadowTime}
        onToggleShadowTime={() => setShowShadowTime((prev) => !prev)}
        weather={weather}
        onChangeWeather={setWeather}
        daylight={daylight}
        onChangeDaylight={applyDaylight}
        rainDensity={rainDensity}
        snowDensity={snowDensity}
        onChangeRainDensity={setRainDensity}
        onChangeSnowDensity={setSnowDensity}
        isEditor={isEditor}
        editorUsername={user?.username}
        onOpenLogin={() => setLoginModalOpen(true)}
        onLogout={logout}
        isSidePanelOpen={isRightPanelOpen}
        onToggleSidePanel={
          isEditor
            ? () =>
                setIsRightPanelOpen((prev) => {
                  const next = !prev;
                  if (next && hasSelection) {
                    setActiveRightTab("selection");
                  }
                  return next;
                })
            : undefined
        }
        onExportScene={isEditor ? handleExportSceneJson : undefined}
        onImportScene={isEditor ? handleOpenImportScene : undefined}
      />
      <input
        ref={importSceneInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const inputEl = event.currentTarget;
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }
          handleImportSceneFile(file).finally(() => {
            inputEl.value = "";
          });
        }}
      />
      {isEditor ? (
        <>
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
          <InstanceLayerModal
            open={instanceLayerModalOpen}
            defaultTileUrl={defaultInstanceTileUrl}
            defaultSourceLayer={defaultInstanceSourceLayer}
            defaultModelUrls={defaultInstanceModelUrls}
            selectedFiles={instanceModelFiles}
            onChangeFiles={setInstanceModelFiles}
            onCancel={() => setInstanceLayerModalOpen(false)}
            nameValue={instanceLayerName}
            onChangeName={setInstanceLayerName}
            onConfirm={async (data) => {
              const fileUrls =
                data.modelFiles.length > 0
                  ? data.modelFiles.map((file) => URL.createObjectURL(file))
                  : [];
              const persistedModelUrls =
                data.modelFiles.length > 0
                  ? (await Promise.all(data.modelFiles.map((file) => readFileAsDataUrl(file)))).filter((url) => !!url)
                  : data.modelUrls;
              const layerId =
                mapHandleRef.current?.addInstanceLayer({
                  tileUrl: data.tileUrl,
                  sourceLayer: data.sourceLayer,
                  modelUrls: fileUrls.length > 0 ? fileUrls : data.modelUrls,
                }) ?? null;
              if (!layerId) {
                fileUrls.forEach((url) => URL.revokeObjectURL(url));
                return;
              }
              if (fileUrls.length > 0) {
                instanceBlobUrlsRef.current.set(layerId, fileUrls);
              }
              setInstanceLayerConfigs((prev) => ({
                ...prev,
                [layerId]: {
                  tileUrl: data.tileUrl,
                  sourceLayer: data.sourceLayer,
                  modelUrls: persistedModelUrls,
                },
              }));
              const label = data.name.trim() || instanceLayerName.trim() || `Custom Layer ${customLayerCount + 1}`;
              setCustomInstanceLayers((prev) => [
                ...prev,
                { id: layerId, label, kind: "instance" },
              ]);
              setLayerVisibility((prev) => ({ ...prev, [layerId]: true }));
              setInstanceLayerModalOpen(false);
            }}
          />
          <WaterLayerModal
            open={waterLayerModalOpen}
            nameValue={waterLayerName}
            onChangeName={setWaterLayerName}
            defaultTileUrl={defaultWaterTileUrl}
            defaultSourceLayer={defaultWaterSourceLayer}
            selectedFile={waterTextureFile}
            onChangeFile={setWaterTextureFile}
            onCancel={() => setWaterLayerModalOpen(false)}
            onConfirm={(data) => {
              const textureUrl = data.file ? URL.createObjectURL(data.file) : undefined;
              const settings = { ...DEFAULT_WATER_SETTINGS };
              const layerId =
                mapHandleRef.current?.addWaterLayer({
                  tileUrl: data.tileUrl,
                  sourceLayer: data.sourceLayer,
                  normalTextureUrl: textureUrl,
                  settings,
                }) ?? null;
              if (!layerId) {
                if (textureUrl) {
                  URL.revokeObjectURL(textureUrl);
                }
                return;
              }
              if (textureUrl) {
                waterBlobUrlsRef.current.set(layerId, textureUrl);
              }
              setWaterLayerConfigs((prev) => ({
                ...prev,
                [layerId]: {
                  tileUrl: data.tileUrl,
                  sourceLayer: data.sourceLayer,
                  normalTextureUrl: textureUrl && !textureUrl.startsWith("blob:") ? textureUrl : undefined,
                },
              }));
              const label = data.name.trim() || waterLayerName.trim() || `Water Layer ${customWaterCount + 1}`;
              setCustomWaterLayers((prev) => [
                ...prev,
                { id: layerId, label, kind: "water" },
              ]);
              setLayerVisibility((prev) => ({ ...prev, [layerId]: true }));
              setWaterLayerSettings((prev) => ({ ...prev, [layerId]: settings }));
              setWaterLayerModalOpen(false);
            }}
          />
          <WaterSettingsModal
            open={waterSettingsModalOpen}
            layerName={
              (waterSettingsTargetId &&
                customWaterLayers.find((layer) => layer.id === waterSettingsTargetId)?.label) ||
              "Water Layer"
            }
            initialSettings={
              (waterSettingsTargetId && waterLayerSettings[waterSettingsTargetId]) || DEFAULT_WATER_SETTINGS
            }
            onChange={(settings) => {
              if (!waterSettingsTargetId) {
                return;
              }
              mapHandleRef.current?.setWaterLayerSettings(waterSettingsTargetId, settings);
            }}
            onCancel={() => {
              if (waterSettingsTargetId && waterSettingsBaseline) {
                mapHandleRef.current?.setWaterLayerSettings(waterSettingsTargetId, waterSettingsBaseline);
              }
              setWaterSettingsModalOpen(false);
              setWaterSettingsTargetId(null);
              setWaterSettingsBaseline(null);
            }}
            onConfirm={(settings) => {
              if (!waterSettingsTargetId) {
                setWaterSettingsModalOpen(false);
                return;
              }
              setWaterLayerSettings((prev) => ({ ...prev, [waterSettingsTargetId]: settings }));
              mapHandleRef.current?.setWaterLayerSettings(waterSettingsTargetId, settings);
              setWaterSettingsModalOpen(false);
              setWaterSettingsTargetId(null);
              setWaterSettingsBaseline(null);
            }}
          />
          <LightSettingsModal
            open={lightSettingsModalOpen}
            layerName={
              (lightSettingsTargetId &&
                layerOptions.find((layer) => layer.id === lightSettingsTargetId)?.label) ||
              "Layer"
            }
            initialSettings={
              (lightSettingsTargetId && layerLightSettings[lightSettingsTargetId]) || defaultLightSettings
            }
            defaultSettings={defaultLightSettings}
            min={lightIntensityRange.min}
            max={lightIntensityRange.max}
            step={lightIntensityRange.step}
            onChange={(settings) => {
              if (!lightSettingsTargetId) {
                return;
              }
              previewLightSettings(lightSettingsTargetId, settings);
            }}
            onCancel={() => {
              if (lightSettingsTargetId && lightSettingsBaseline) {
                previewLightSettings(lightSettingsTargetId, lightSettingsBaseline);
              }
              setLightSettingsModalOpen(false);
              setLightSettingsTargetId(null);
              setLightSettingsBaseline(null);
            }}
            onConfirm={(settings) => {
              if (!lightSettingsTargetId) {
                setLightSettingsModalOpen(false);
                return;
              }
              applyLightSettings(lightSettingsTargetId, settings);
              setLightSettingsModalOpen(false);
              setLightSettingsTargetId(null);
              setLightSettingsBaseline(null);
            }}
          />
        </>
      ) : null}
      <LoginModal
        open={loginModalOpen}
        onLogin={(username, password) => {
          const ok = login(username, password);
          if (ok) setLoginModalOpen(false);
          return ok;
        }}
        onCancel={() => setLoginModalOpen(false)}
      />
    </div>
  );
}

export default App;
