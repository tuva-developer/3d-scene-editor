import { useState } from "react";
import type { LayerModelInfo, LayerOption } from "@/types/common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faClone,
  faEye,
  faEyeSlash,
  faLayerGroup,
  faLocationDot,
  faTrash,
  faChevronUp,
  faAnglesDown,
  faAnglesUp,
  faPlus,
  faCubes,
  faWater,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";

interface Props {
  layers: LayerOption[];
  activeLayerId: string;
  visibility: Record<string, boolean>;
  modelsByLayer: Record<string, LayerModelInfo[]>;
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string, visible: boolean) => void;
  onAddModel: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onJumpToModel: (model: LayerModelInfo) => void;
  onCloneModel: (layerId: string, model: LayerModelInfo) => void;
  onDeleteModel: (layerId: string, model: LayerModelInfo) => void;
  onEditWaterLayer: (id: string) => void;
  onEditLayerLight: (id: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onAddLayer: () => void;
  onAddInstanceLayer: () => void;
  onAddWaterLayer: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

type LayerKind = "base" | "edit" | "instance" | "water";

export default function LayerPanel({
  layers,
  activeLayerId,
  visibility,
  modelsByLayer,
  onSelectLayer,
  onToggleVisibility,
  onAddModel,
  onDeleteLayer,
  onJumpToModel,
  onCloneModel,
  onDeleteModel,
  onEditWaterLayer,
  onEditLayerLight,
  onShowAll,
  onHideAll,
  onAddLayer,
  onAddInstanceLayer,
  onAddWaterLayer,
  isOpen,
  onToggleOpen,
}: Props) {
  const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({});
  const [groupExpanded, setGroupExpanded] = useState<Record<LayerKind, boolean>>({
    base: true,
    edit: true,
    instance: true,
    water: true,
  });
  const handleAddModel = (layerId: string) => {
    setExpandedLayers((prev) => ({
      ...prev,
      [layerId]: true,
    }));
    onAddModel(layerId);
  };
  const openGroup = (kind: LayerKind) => {
    setGroupExpanded((prev) => ({
      ...prev,
      [kind]: true,
    }));
  };
  const panelClassName =
    "absolute left-4 top-20 z-[2000] w-[300px] overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text)] shadow-[var(--panel-shadow)]";
  const headerClassName =
    "sticky top-0 z-10 border-b border-[var(--divider)] bg-[var(--panel-bg)]/95 px-3 py-2 backdrop-blur";
  const titleClassName = "text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]";
  const headerRowClassName = "flex w-full items-center gap-2";
  const headerActionsClassName =
    "ml-auto flex flex-nowrap items-center gap-1.5 overflow-x-auto";
  const headerButtonClassName =
    "flex h-6 w-6 items-center justify-center rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[10px] text-[var(--text)] transition hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]";
  const listClassName =
    "layer-panel-scroll flex max-h-[calc(100vh-220px)] flex-col gap-2.5 overflow-y-auto px-3 py-3";
  const rowClassName =
    "group grid grid-cols-[auto_1fr_auto] items-center gap-1.5 rounded-md border border-transparent bg-transparent px-2 py-1 transition hover:bg-[var(--seg-hover)]";
  const rowActiveClassName =
    "bg-[var(--btn-active-bg)] text-[var(--btn-active-text)]";
  const nameClassName = "text-[11px] font-semibold leading-tight tracking-[0.02em] text-[var(--text)]";
  const nameStackClassName = "flex flex-col items-start gap-0.5";
  const buttonBaseClassName =
    "flex h-6 w-6 items-center justify-center rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[10px] text-[var(--text)] transition hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]";
  const layerActionButtonBaseClassName =
    "flex h-6 w-6 items-center justify-center rounded-md text-[10px] text-white transition hover:brightness-105";
  const layerToggleButtonClassName =
    `${layerActionButtonBaseClassName} bg-[#2f7df6]`;
  const layerLightButtonClassName =
    `${layerActionButtonBaseClassName} bg-[#f59e0b]`;
  const layerAddButtonClassName =
    `${layerActionButtonBaseClassName} bg-[#22c55e]`;
  const layerWaterButtonClassName =
    `${layerActionButtonBaseClassName} bg-[#14b8a6]`;
  const layerDeleteButtonClassName =
    `${layerActionButtonBaseClassName} bg-[#e35d4f]`;
  const buttonActiveClassName =
    "border-[var(--btn-active-border)] bg-[var(--btn-active-bg)] text-[var(--btn-active-text)] shadow-[var(--btn-active-ring)]";
  const buttonActiveNoShadowClassName =
    "border-[var(--btn-active-border)] bg-[var(--btn-active-bg)] text-[var(--btn-active-text)]";
  const deleteButtonClassName =
    "border-[var(--btn-danger-border)] bg-[var(--btn-danger-bg)] text-[var(--btn-danger-text)] hover:!border-[var(--btn-danger-hover)] hover:!bg-[var(--btn-danger-hover)]";
  const badgeClassName =
    "inline-flex items-center rounded-full border border-[var(--seg-border)] bg-[var(--panel-bg)] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[var(--text-muted)]";
  const indicatorBaseClassName = "h-3 w-3 rounded-full";
  const indicatorActiveClassName = "bg-[var(--btn-active-bg)]";
  const indicatorInactiveClassName = "border border-[var(--btn-border)] bg-transparent";
  const expandButtonClassName =
    "flex h-6 w-6 items-center justify-center rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[9px] text-[var(--text)] transition hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]";
  const expandIconClassName = "transition-transform";
  const rowLeftClassName = "flex items-center gap-1";
  const rowRightClassName = "flex items-center gap-1";
  const modelListClassName =
    "mx-2 mb-2 mt-0 rounded-b-md border border-[var(--seg-border)] border-t-0 bg-[var(--panel-bg)]/40 px-2 py-1.5 text-[10px]";
  const modelItemClassName = "flex items-center justify-between gap-2 py-1";
  const modelNameClassName = "truncate text-[10px] text-[var(--text)]";
  const modelCountClassName = "text-[9px] text-[var(--text-muted)]";
  const modelButtonClassName =
    "flex h-5 w-5 items-center justify-center rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[9px] text-[var(--text)] transition hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]";
  const modelDeleteButtonClassName =
    "border-[var(--btn-danger-border)] bg-[var(--btn-danger-bg)] text-[var(--btn-danger-text)] hover:!border-[var(--btn-danger-hover)] hover:!bg-[var(--btn-danger-hover)]";
  const modelRowClassName =
    "border-b border-[var(--seg-border)]/60 last:border-b-0";
  const filteredLayers = layers;
  const layersByKind: Record<LayerKind, LayerOption[]> = {
    base: [],
    edit: [],
    instance: [],
    water: [],
  };
  filteredLayers.forEach((layer) => {
    const kind = (layer.kind ?? (layer.id === "models" ? "base" : "edit")) as LayerKind;
    layersByKind[kind].push(layer);
  });
  const groupHeaderClassName =
    "flex items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]";
  const groupHeaderToneClassName =
    "bg-[var(--panel-bg)]/60";
  const groupTitleClassName = "flex items-center gap-2";
  const groupToggleClassName =
    "flex h-6 w-6 items-center justify-center rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[9px] text-[var(--text)] transition hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]";
  const groupCountClassName =
    "ml-2 rounded-full border border-[var(--seg-border)] bg-[var(--panel-bg)] px-2 py-0.5 text-[10px] font-semibold";
  const groupWrapperClassName =
    "rounded-lg border border-[var(--seg-border)] bg-[var(--seg-bg)] overflow-hidden";
  const groupItemsClassName =
    "border-t border-[var(--seg-border)]/70";
  const setAllGroups = (expanded: boolean) => {
    setGroupExpanded({
      base: expanded,
      edit: expanded,
      instance: expanded,
      water: expanded,
    });
  };

  return (
    <div className={panelClassName} aria-label="Layer panel">
      <div className={headerClassName}>
        <div className={headerRowClassName}>
          <div className={titleClassName}>Layers</div>
          <div className={headerActionsClassName}>
            <button
              className={headerButtonClassName}
              onClick={() => setAllGroups(true)}
              title="Expand all groups"
              aria-label="Expand all groups"
              type="button"
            >
              <FontAwesomeIcon icon={faAnglesDown} className="text-[10px] translate-y-[0.5px]" />
            </button>
            <button
              className={headerButtonClassName}
              onClick={() => setAllGroups(false)}
              title="Collapse all groups"
              aria-label="Collapse all groups"
              type="button"
            >
              <FontAwesomeIcon icon={faAnglesUp} className="text-[10px] translate-y-[0.5px]" />
            </button>
            <button
              className={headerButtonClassName}
              onClick={onShowAll}
              title="Show all layers"
              aria-label="Show all layers"
              type="button"
            >
              <FontAwesomeIcon
                icon={faEye}
                className="text-[11px] translate-y-[0.5px]"
                style={{ shapeRendering: "geometricPrecision" }}
              />
            </button>
            <button
              className={headerButtonClassName}
              onClick={onHideAll}
              title="Hide all layers"
              aria-label="Hide all layers"
              type="button"
            >
              <FontAwesomeIcon
                icon={faEyeSlash}
                className="text-[11px] translate-y-[0.5px]"
                style={{ shapeRendering: "geometricPrecision" }}
              />
            </button>
            <button
              className={headerButtonClassName}
              onClick={onToggleOpen}
              title={isOpen ? "Collapse panel" : "Expand panel"}
              aria-label={isOpen ? "Collapse panel" : "Expand panel"}
              type="button"
            >
              <FontAwesomeIcon
                icon={faChevronDown}
                className={`text-[10px] translate-y-[0.5px] ${expandIconClassName} ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>
      {isOpen ? (
        <div className={listClassName}>
        {(["base", "edit", "instance", "water"] as LayerKind[]).map((groupKind) => {
          const groupLayers = layersByKind[groupKind];
          const isGroupOpen = groupExpanded[groupKind];
          const groupLabel =
            groupKind === "base"
              ? "Base"
              : groupKind === "edit"
                ? "Edit"
                : groupKind === "instance"
                  ? "Custom"
                  : "Water";
          return (
            <div key={groupKind} className={groupWrapperClassName}>
              <div
                className={`${groupHeaderClassName} ${groupHeaderToneClassName} ${
                  isGroupOpen ? "rounded-t-lg" : "rounded-lg"
                }`}
              >
                <div className={groupTitleClassName}>
                  {groupKind === "edit" ? (
                    <FontAwesomeIcon icon={faLayerGroup} className="text-[10px]" />
                  ) : null}
                  {groupKind === "instance" ? (
                    <FontAwesomeIcon icon={faCubes} className="text-[10px]" />
                  ) : null}
                  {groupKind === "water" ? (
                    <FontAwesomeIcon icon={faWater} className="text-[10px]" />
                  ) : null}
                  <span>{groupLabel}</span>
                  <span className={groupCountClassName}>{groupLayers.length}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {groupKind === "edit" ? (
                    <button
                      className={headerButtonClassName}
                      onClick={() => {
                        openGroup("edit");
                        onAddLayer();
                      }}
                      title="Add edit layer"
                      aria-label="Add edit layer"
                      type="button"
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                    </button>
                  ) : null}
                  {groupKind === "instance" ? (
                    <button
                      className={headerButtonClassName}
                      onClick={() => {
                        openGroup("instance");
                        onAddInstanceLayer();
                      }}
                      title="Add custom layer"
                      aria-label="Add custom layer"
                      type="button"
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                    </button>
                  ) : null}
                  {groupKind === "water" ? (
                    <button
                      className={headerButtonClassName}
                      onClick={() => {
                        openGroup("water");
                        onAddWaterLayer();
                      }}
                      title="Add water layer"
                      aria-label="Add water layer"
                      type="button"
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                    </button>
                  ) : null}
                  <button
                    className={groupToggleClassName}
                    onClick={() =>
                      setGroupExpanded((prev) => ({
                        ...prev,
                        [groupKind]: !prev[groupKind],
                      }))
                    }
                    title={isGroupOpen ? "Collapse group" : "Expand group"}
                    aria-label={isGroupOpen ? "Collapse group" : "Expand group"}
                    type="button"
                  >
                    <FontAwesomeIcon icon={faChevronDown} className={`text-[9px] ${expandIconClassName} ${isGroupOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>
              {isGroupOpen ? (
                <div className={groupItemsClassName}>
                  {groupLayers.map((layer) => {
                    const isActive = activeLayerId === layer.id;
                    const isVisible = visibility[layer.id] ?? true;
                    const kind = (layer.kind ?? (layer.id === "models" ? "base" : "edit")) as LayerKind;
                    const isBase = kind === "base";
                    const isEditable = kind === "edit";
                    const isWater = kind === "water";
                    const canEditLight = !isWater;
                    const isSelectable = kind === "edit";
                    const showIndicator = isSelectable;
                    const models = modelsByLayer[layer.id] ?? [];
                    const isExpanded = expandedLayers[layer.id] ?? false;
                    return (
                      <div
                        key={layer.id}
                        className="relative border-b border-(--seg-border)/70 last:border-b-0"
                      >
                        <div
                          className={`${rowClassName} ${isActive ? rowActiveClassName : ""} ${
                            isSelectable ? "cursor-pointer" : "cursor-default"
                          } ${isExpanded && isEditable ? "rounded-b-none border-b border-(--seg-border)/70 bg-(--panel-bg)/40" : ""}`}
                          onClick={() => {
                            if (isSelectable) {
                              onSelectLayer(layer.id);
                            }
                          }}
                          role={isSelectable ? "button" : undefined}
                          tabIndex={isSelectable ? 0 : -1}
                          onKeyDown={(event) => {
                            if (!isSelectable) {
                              return;
                            }
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onSelectLayer(layer.id);
                            }
                          }}
                        >
                          <div className={rowLeftClassName}>
                            {isEditable ? (
                              <button
                                className={expandButtonClassName}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setExpandedLayers((prev) => ({
                                    ...prev,
                                    [layer.id]: !isExpanded,
                                  }));
                                }}
                                title={isExpanded ? "Collapse models" : "Expand models"}
                                aria-label={isExpanded ? "Collapse models" : "Expand models"}
                                type="button"
                              >
                                  <FontAwesomeIcon
                                    icon={faChevronDown}
                                    className={`text-[9px] ${expandIconClassName} ${isExpanded ? "rotate-180" : ""}`}
                                  />
                              </button>
                            ) : null}
                            {showIndicator ? (
                              <button
                                className={buttonBaseClassName}
                                onClick={() => {
                                  if (isSelectable) {
                                    onSelectLayer(layer.id);
                                  }
                                }}
                                title="Select layer"
                                aria-label="Select layer"
                                type="button"
                                onMouseDown={(event) => event.stopPropagation()}
                              >
                                <span
                                  className={`${indicatorBaseClassName} ${
                                    isActive ? indicatorActiveClassName : indicatorInactiveClassName
                                  }`}
                                />
                              </button>
                            ) : null}
                          </div>
                          <div className={nameStackClassName}>
                            <div className={nameClassName}>{layer.label}</div>
                          </div>
                          <div className={rowRightClassName}>
                            <button
                              className={layerToggleButtonClassName}
                              onClick={(event) => {
                                event.stopPropagation();
                                onToggleVisibility(layer.id, !isVisible);
                              }}
                              title={isVisible ? "Hide layer" : "Show layer"}
                              aria-label={isVisible ? "Hide layer" : "Show layer"}
                              type="button"
                            >
                              <FontAwesomeIcon
                                icon={isVisible ? faEye : faEyeSlash}
                                className="text-[11px]"
                                style={{ shapeRendering: "geometricPrecision" }}
                              />
                            </button>
                            {canEditLight ? (
                              <button
                                className={layerLightButtonClassName}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onEditLayerLight(layer.id);
                                }}
                                title="Edit light settings"
                                aria-label="Edit light settings"
                                type="button"
                              >
                                <FontAwesomeIcon icon={faSliders} className="text-[9px]" />
                              </button>
                            ) : null}
                            {isBase ? null : (
                              <>
                                {isEditable ? (
                                  <button
                                    className={layerAddButtonClassName}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleAddModel(layer.id);
                                    }}
                                    title="Add model to layer"
                                    aria-label="Add model to layer"
                                    type="button"
                                  >
                                    <FontAwesomeIcon icon={faPlus} className="text-[9px]" />
                                  </button>
                                ) : null}
                                {isWater ? (
                                  <button
                                    className={layerWaterButtonClassName}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onEditWaterLayer(layer.id);
                                    }}
                                    title="Edit water settings"
                                    aria-label="Edit water settings"
                                    type="button"
                                  >
                                    <FontAwesomeIcon icon={faSliders} className="text-[9px]" />
                                  </button>
                                ) : null}
                                <button
                                  className={layerDeleteButtonClassName}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onDeleteLayer(layer.id);
                                  }}
                                  title="Delete layer"
                                  aria-label="Delete layer"
                                  type="button"
                                >
                                  <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {isExpanded && isEditable ? (
                          <div className={modelListClassName}>
                            <div className={modelCountClassName}>{models.length} model(s)</div>
                            {models.length ? (
                              models.map((model) => (
                                <div key={model.id} className={`${modelItemClassName} ${modelRowClassName}`}>
                                  <div className={modelNameClassName}>{model.name}</div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      className={modelButtonClassName}
                                      onClick={() => onJumpToModel(model)}
                                      title="Zoom to model"
                                      aria-label="Zoom to model"
                                      type="button"
                                      disabled={!model.coords}
                                    >
                                      <FontAwesomeIcon icon={faLocationDot} className="text-[9px]" />
                                    </button>
                                    <button
                                      className={modelButtonClassName}
                                      onClick={() => onCloneModel(layer.id, model)}
                                      title="Clone model"
                                      aria-label="Clone model"
                                      type="button"
                                    >
                                      <FontAwesomeIcon icon={faClone} className="text-[9px]" />
                                    </button>
                                    <button
                                      className={`${modelButtonClassName} ${modelDeleteButtonClassName}`}
                                      onClick={() => onDeleteModel(layer.id, model)}
                                      title="Delete model"
                                      aria-label="Delete model"
                                      type="button"
                                    >
                                      <FontAwesomeIcon icon={faTrash} className="text-[9px]" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className={modelCountClassName}>No models yet.</div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
        </div>
      ) : null}
    </div>
  );
}
