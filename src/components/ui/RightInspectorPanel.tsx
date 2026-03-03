import LayerPanel from "@/components/ui/LayerPanel";
import TransformPanel from "@/components/ui/TransformPanel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
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
  onJumpToModel: (model: LayerModelInfo) => void;
  onShowAllLayers: () => void;
  onHideAllLayers: () => void;
  onAddLayer: () => void;
  onAddInstanceLayer: () => void;
  onAddWaterLayer: () => void;
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
  onJumpToModel,
  onShowAllLayers,
  onHideAllLayers,
  onAddLayer,
  onAddInstanceLayer,
  onAddWaterLayer,
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
  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute right-0 top-0 z-[2000] flex h-screen w-[380px] max-w-[94vw] flex-col overflow-hidden border-l border-[var(--panel-border)] bg-[var(--panel-bg)]/98 text-[var(--text)] shadow-[-14px_0_28px_rgba(15,23,42,0.22)] backdrop-blur-md">
      <div className="border-b border-[var(--divider)] px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Scene Panel
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md border border-none bg-none text-[13px] text-[var(--text)] cursor-pointer"
            type="button"
            onClick={onClose}
            aria-label="Close Scene Panel"
            title="Close Scene Panel"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="mt-2 inline-flex rounded-[10px] border border-[var(--seg-border)] bg-[var(--seg-bg)] p-1">
          <button
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
              activeTab === "layers"
                ? "bg-[var(--btn-active-bg)] text-[var(--btn-active-text)] shadow-[var(--btn-active-ring)]"
                : "text-[var(--text)] hover:bg-[var(--seg-hover)]"
            }`}
            type="button"
            onClick={() => onChangeTab("layers")}
          >
            Layers
          </button>
          <button
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
              activeTab === "selection"
                ? "bg-[var(--btn-active-bg)] text-[var(--btn-active-text)] shadow-[var(--btn-active-ring)]"
                : hasSelection
                  ? "text-[var(--text)] hover:bg-[var(--seg-hover)]"
                  : "cursor-not-allowed text-[var(--text-muted)]/70"
            }`}
            type="button"
            onClick={() => onChangeTab("selection")}
            disabled={!hasSelection}
            aria-disabled={!hasSelection}
            title={hasSelection ? "Selection properties" : "Select a model to edit properties"}
          >
            Selection
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
            onJumpToModel={onJumpToModel}
            onShowAll={onShowAllLayers}
            onHideAll={onHideAllLayers}
            onAddLayer={onAddLayer}
            onAddInstanceLayer={onAddInstanceLayer}
            onAddWaterLayer={onAddWaterLayer}
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
