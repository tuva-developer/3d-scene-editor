import { useEffect, useRef, useState } from "react";
import LayerPanel from "@/components/ui/LayerPanel";
import TransformPanel from "@/components/ui/TransformPanel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLayerGroup, faSliders, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { LayerModelInfo, LayerOption, TransformMode, TransformValues } from "@/types/common";

type RightInspectorPanelProps = {
  isOpen: boolean;
  activeTab: "layers" | "selection";
  hasSelection: boolean;
  onClose: () => void;
  onChangeTab: (tab: "layers" | "selection") => void;
  layers: LayerOption[];
  activeLayerId: string;
  visibility: Record<string, boolean>;
  modelsByLayer: Record<string, LayerModelInfo[]>;
  onSelectLayer: (id: string) => void;
  onToggleLayerVisibility: (id: string, visible: boolean) => void;
  onAddModel: (id: string) => void;
  onCloneModel: (layerId: string, model: LayerModelInfo) => void;
  onDeleteModel: (layerId: string, model: LayerModelInfo) => void;
  onDeleteLayer: (id: string) => void;
  onRenameLayer: (id: string, nextName: string) => void;
  onJumpToModel: (model: LayerModelInfo) => void;
  onShowAllLayers: () => void;
  onHideAllLayers: () => void;
  onAddLayer: () => void;
  onAddInstanceLayer: () => void;
  onAddWaterLayer: () => void;
  baseLayerLocked: boolean;
  onToggleBaseLayerLock: (locked: boolean) => void;
  onEditWaterLayer: (id: string) => void;
  onEditLayerLight: (id: string) => void;
  transformValues: TransformValues | null;
  mode: TransformMode;
  onChangeMode: (mode: TransformMode) => void;
  onSnapToGround: () => void;
  onFlyToSelected: () => void;
  onEnableClippingPlane: (enable: boolean) => void;
  onEnableFootPrintWhenEdit: (enable: boolean) => void;
  onChangeTransform: (next: Partial<TransformValues>) => void;
};

export default function RightInspectorPanel({
  isOpen,
  activeTab,
  hasSelection,
  onClose,
  onChangeTab,
  layers,
  activeLayerId,
  visibility,
  modelsByLayer,
  onSelectLayer,
  onToggleLayerVisibility,
  onAddModel,
  onCloneModel,
  onDeleteModel,
  onDeleteLayer,
  onRenameLayer,
  onJumpToModel,
  onShowAllLayers,
  onHideAllLayers,
  onAddLayer,
  onAddInstanceLayer,
  onAddWaterLayer,
  baseLayerLocked,
  onToggleBaseLayerLock,
  onEditWaterLayer,
  onEditLayerLight,
  transformValues,
  mode,
  onChangeMode,
  onSnapToGround,
  onFlyToSelected,
  onEnableClippingPlane,
  onEnableFootPrintWhenEdit,
  onChangeTransform,
}: RightInspectorPanelProps) {
  const ANIM_DURATION = 280;
  const [rendered, setRendered] = useState(isOpen);
  const [animClass, setAnimClass] = useState<"side-panel-enter" | "side-panel-exit" | "">(
    isOpen ? "side-panel-enter" : ""
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isOpen) {
      setRendered(true);
      setAnimClass("side-panel-enter");
    } else {
      setAnimClass("side-panel-exit");
      timerRef.current = setTimeout(() => setRendered(false), ANIM_DURATION);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen]);

  if (!rendered) return null;
  const tabBaseClassName =
    "relative h-11 px-3 text-center uppercase tracking-[0.08em] transition";
  const tabActiveClassName = "border-b-0 bg-[var(--tab-active-bg)] text-[12px] font-semibold text-[var(--tab-active-text)]";
  const tabInactiveClassName =
    "border-b border-b-[var(--seg-border)] bg-[var(--tab-inactive-bg)] text-[11px] font-medium text-[var(--tab-inactive-text)] hover:bg-[var(--tab-inactive-hover-bg)] hover:text-[var(--tab-active-text)]";
  const tabDisabledClassName =
    "pointer-events-none cursor-not-allowed border-b border-b-[var(--seg-border)] bg-[var(--tab-disabled-bg)] text-[11px] font-medium text-[var(--tab-disabled-text)]";

  return (
    <div className={`absolute right-0 top-0 z-[2000] flex h-screen w-[380px] max-w-[94vw] flex-col overflow-hidden border-l border-[var(--panel-border)] bg-[var(--panel-bg)]/98 text-[var(--text)] shadow-[-14px_0_28px_rgba(15,23,42,0.22)] backdrop-blur-md ${animClass}`}>
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-[var(--divider)] px-3 py-2.5">
          <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Scene Panel
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md border-0 bg-transparent text-[13px] text-[var(--text)] cursor-pointer transition hover:bg-[var(--btn-hover)]"
            type="button"
            onClick={onClose}
            aria-label="Close Scene Panel"
            title="Close Scene Panel"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="grid w-full grid-cols-2 border-t border-[var(--seg-border)] bg-[var(--tab-strip-bg)]">
          <button
            className={`${tabBaseClassName} border-r border-[var(--seg-border)] ${
              activeTab === "layers" ? tabActiveClassName : tabInactiveClassName
            }`}
            type="button"
            onClick={() => onChangeTab("layers")}
          >
            <span
              className={`pointer-events-none absolute left-0 top-0 h-[2px] w-full ${
                activeTab === "layers" ? "bg-[var(--btn-active-bg)]" : "bg-transparent"
              }`}
            />
            <span className="inline-flex items-center gap-1.5">
              <FontAwesomeIcon icon={faLayerGroup} className="text-[11px]" />
              <span>Layers</span>
            </span>
          </button>
          <button
            className={`${tabBaseClassName} ${
              activeTab === "selection"
                ? tabActiveClassName
                : hasSelection
                  ? tabInactiveClassName
                  : tabDisabledClassName
            }`}
            type="button"
            onClick={() => onChangeTab("selection")}
            disabled={!hasSelection}
            aria-disabled={!hasSelection}
            title={hasSelection ? "Selection properties" : "Click an object on the map to select it"}
          >
            <span
              className={`pointer-events-none absolute left-0 top-0 h-[2px] w-full ${
                activeTab === "selection" ? "bg-[var(--btn-active-bg)]" : "bg-transparent"
              }`}
            />
            <span className="inline-flex items-center gap-1.5">
              <FontAwesomeIcon icon={faSliders} className="text-[11px]" />
              <span>Selection</span>
            </span>
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {activeTab === "layers" ? (
          <LayerPanel
            layers={layers}
            activeLayerId={activeLayerId}
            visibility={visibility}
            modelsByLayer={modelsByLayer}
            onSelectLayer={onSelectLayer}
            onToggleVisibility={onToggleLayerVisibility}
            onAddModel={onAddModel}
            onCloneModel={onCloneModel}
            onDeleteModel={onDeleteModel}
            onDeleteLayer={onDeleteLayer}
            onRenameLayer={onRenameLayer}
            onJumpToModel={onJumpToModel}
            onShowAll={onShowAllLayers}
            onHideAll={onHideAllLayers}
            onAddLayer={onAddLayer}
            onAddInstanceLayer={onAddInstanceLayer}
            onAddWaterLayer={onAddWaterLayer}
            baseLayerLocked={baseLayerLocked}
            onToggleBaseLayerLock={onToggleBaseLayerLock}
            onEditWaterLayer={onEditWaterLayer}
            onEditLayerLight={onEditLayerLight}
            isOpen
            onToggleOpen={() => {}}
            embedded
            showHeader={false}
            showHeaderCollapseButton={false}
          />
        ) : (
          <TransformPanel
            values={transformValues}
            disabled={!hasSelection}
            mode={mode}
            onChangeMode={onChangeMode}
            onSnapToGround={onSnapToGround}
            onFlyToSelected={onFlyToSelected}
            enableClippingPlane={onEnableClippingPlane}
            enableFootPrintWhenEdit={onEnableFootPrintWhenEdit}
            onChange={onChangeTransform}
            embedded
            showHeader={false}
            showCollapseButton={false}
          />
        )}
      </div>
    </div>
  );
}
