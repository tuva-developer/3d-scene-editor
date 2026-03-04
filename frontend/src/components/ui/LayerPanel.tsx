import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { LayerModelInfo, LayerOption } from "@/types/common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faClone,
  faEllipsisVertical,
  faEye,
  faEyeSlash,
  faLayerGroup,
  faLocationDot,
  faTrash,
  faPlus,
  faCubes,
  faWater,
  faSliders,
  faCheck,
  faXmark,
  faLock,
  faLockOpen,
  faPenToSquare,
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
  onRenameLayer: (id: string, nextName: string) => void;
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
  baseLayerLocked?: boolean;
  onToggleBaseLayerLock?: (locked: boolean) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  embedded?: boolean;
  showHeader?: boolean;
  showHeaderCollapseButton?: boolean;
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
  onRenameLayer,
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
  baseLayerLocked = true,
  onToggleBaseLayerLock,
  isOpen,
  onToggleOpen,
  embedded = false,
  showHeader = true,
  showHeaderCollapseButton = true,
}: Props) {
  const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({});
  const [openLayerActionMenu, setOpenLayerActionMenu] = useState<{
    layerId: string;
    kind: LayerKind;
    top: number;
    left: number;
  } | null>(null);
  const [pendingDeleteModel, setPendingDeleteModel] = useState<{ layerId: string; modelId: string } | null>(null);
  const handleAddModel = (layerId: string) => {
    setExpandedLayers((prev) => ({
      ...prev,
      [layerId]: true,
    }));
    onAddModel(layerId);
  };
  const panelClassName =
    embedded
      ? "h-full w-full min-h-0 overflow-hidden bg-transparent text-[var(--text)]"
      : "absolute left-4 top-20 z-[2000] w-[300px] overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text)] shadow-[var(--panel-shadow)]";
  const headerClassName =
    "sticky top-0 z-10 border-b border-[var(--divider)] bg-[var(--panel-bg)]/95 px-3 py-2 backdrop-blur";
  const titleClassName = "text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]";
  const headerRowClassName = "flex w-full items-center gap-2";
  const headerActionsClassName =
    "ml-auto flex flex-nowrap items-center gap-1.5 overflow-x-auto";
  const headerButtonClassName =
    "flex h-6 w-6 items-center justify-center rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[10px] text-[var(--text)] transition hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]";
  const listClassName =
    embedded
      ? "flex h-full min-h-0 flex-col gap-2.5 px-3 py-3"
      : "layer-panel-scroll flex max-h-[calc(100vh-220px)] flex-col gap-2.5 overflow-y-auto px-3 py-3";
  const rowClassName =
    "group flex items-center gap-2 rounded-md border border-[var(--seg-border)]/70 bg-[var(--panel-bg)]/28 px-2 py-1.5 transition hover:bg-[var(--seg-hover)]";
  const rowActiveClassName =
    "bg-[var(--btn-active-bg)] text-[var(--btn-active-text)]";
  const nameClassName = "text-[12px] font-semibold leading-tight tracking-[0.01em] text-[var(--text)]";
  const nameStackClassName = "flex flex-col items-start gap-0.5";
  const buttonBaseClassName =
    "flex h-6 w-6 items-center justify-center rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[10px] text-[var(--text)] transition hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]";
  const layerActionButtonBaseClassName =
    "flex h-6 w-6 items-center justify-center rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[10px] text-[var(--text)] transition hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]";
  const indicatorBaseClassName = "h-3 w-3 rounded-full";
  const indicatorActiveClassName = "bg-[var(--btn-active-bg)]";
  const indicatorInactiveClassName = "border border-[var(--btn-border)] bg-transparent";
  const expandButtonClassName =
    "flex h-6 w-6 items-center justify-center rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[9px] text-[var(--text)] transition hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]";
  const expandIconClassName = "transition-transform";
  const rowActionsClassName = "ml-auto flex items-center gap-1";
  const modelListClassName =
    "rounded-b-md border border-[var(--seg-border)] border-t-0 bg-[var(--panel-bg)]/40 px-2 py-1.5 text-[10px]";
  const modelItemClassName = "flex items-center justify-between gap-2 py-1";
  const modelNameClassName = "truncate text-[10px] text-[var(--text)]";
  const modelCountClassName = "text-[9px] text-[var(--text-muted)]";
  const modelButtonClassName =
    "flex h-5 w-5 items-center justify-center rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[9px] text-[var(--text)] transition hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]";
  const modelDeleteButtonClassName =
    "!border-[var(--btn-danger-border)] !bg-[var(--btn-danger-bg)] !text-[var(--btn-danger-text)] hover:!border-[var(--btn-danger-hover)] hover:!bg-[var(--btn-danger-hover)]";
  const modelRowClassName =
    "border-b border-[var(--seg-border)]/60 last:border-b-0";
  const filteredLayers = layers;
  const selectedMenuLayer = useMemo(() => {
    if (!openLayerActionMenu) {
      return null;
    }
    const layer = filteredLayers.find((entry) => entry.id === openLayerActionMenu.layerId);
    if (!layer) {
      return null;
    }
    const kind = openLayerActionMenu.kind;
    return { layer, kind };
  }, [filteredLayers, openLayerActionMenu]);
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
    "flex items-center justify-between px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]";
  const groupHeaderToneClassName =
    "bg-[var(--panel-bg)]/40";
  const groupTitleClassName = "flex items-center gap-2";
  const groupCountClassName =
    "ml-2 rounded-full border border-[var(--seg-border)] bg-[var(--panel-bg)] px-2 py-0.5 text-[10px] font-semibold";
  const groupWrapperClassName =
    "rounded-lg border border-[var(--seg-border)] bg-[var(--seg-bg)] overflow-visible";
  const groupItemsClassName = "border-t border-[var(--seg-border)]/70";
  const contentOpen = embedded ? true : isOpen;

  useEffect(() => {
    if (!openLayerActionMenu) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      if (target.closest("[data-layer-menu='true']") || target.closest("[data-layer-menu-trigger='true']")) {
        return;
      }
      setOpenLayerActionMenu(null);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenLayerActionMenu(null);
      }
    };
    const handleScrollOrResize = () => {
      setOpenLayerActionMenu(null);
    };
    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [openLayerActionMenu]);

  return (
    <div className={panelClassName} aria-label="Layer panel">
      {showHeader ? (
        <div className={headerClassName}>
          <div className={headerRowClassName}>
            <div className={titleClassName}>Layers</div>
            <div className={headerActionsClassName}>
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
              {showHeaderCollapseButton ? (
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
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {contentOpen ? (
        <div className={listClassName}>
        {embedded ? (
          <div className="sticky top-0 z-10">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--seg-border)] bg-[var(--seg-bg)] px-2 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--section-heading)]">
                Quick Actions
              </span>
              <div className="flex items-center gap-1">
                <div className="inline-flex items-center overflow-hidden rounded-md border border-[var(--seg-border)] bg-transparent divide-x divide-[var(--seg-border)]">
                  <button
                    className="flex h-7 w-8 items-center justify-center bg-transparent text-[11px] text-[var(--text)] transition hover:bg-[var(--btn-hover)]"
                    onClick={onShowAll}
                    title="Show all layers"
                    aria-label="Show all layers"
                    type="button"
                  >
                    <FontAwesomeIcon icon={faEye} />
                  </button>
                  <button
                    className="flex h-7 w-8 items-center justify-center bg-transparent text-[11px] text-[var(--text)] transition hover:bg-[var(--btn-hover)]"
                    onClick={onHideAll}
                    title="Hide all layers"
                    aria-label="Hide all layers"
                    type="button"
                  >
                    <FontAwesomeIcon icon={faEyeSlash} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className={embedded ? "flex min-h-0 flex-1 flex-col gap-2.5" : "flex flex-col gap-2.5"}>
        {(["base", "edit", "instance", "water"] as LayerKind[]).map((groupKind) => {
          const groupLayers = layersByKind[groupKind];
          const groupLabel =
            groupKind === "base"
              ? "Base"
              : groupKind === "edit"
                ? "Edit"
                : groupKind === "instance"
                  ? "Custom"
                  : "Water";
          return (
            <div
              key={groupKind}
              className={`${groupWrapperClassName} ${
                embedded
                  ? groupKind === "base"
                    ? "shrink-0"
                    : "flex min-h-0 flex-1 flex-col"
                  : ""
              }`}
            >
              <div
                className={`${groupHeaderClassName} ${groupHeaderToneClassName} rounded-t-lg`}
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
                      onClick={onAddLayer}
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
                      onClick={onAddInstanceLayer}
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
                      onClick={onAddWaterLayer}
                      title="Add water layer"
                      aria-label="Add water layer"
                      type="button"
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                    </button>
                  ) : null}
                  {groupKind === "base" && onToggleBaseLayerLock ? (
                    <button
                      className={headerButtonClassName}
                      onClick={() => onToggleBaseLayerLock(!baseLayerLocked)}
                      title={baseLayerLocked ? "Unlock base layer selection" : "Lock base layer selection"}
                      aria-label={baseLayerLocked ? "Unlock base layer selection" : "Lock base layer selection"}
                      type="button"
                    >
                      <FontAwesomeIcon icon={baseLayerLocked ? faLock : faLockOpen} className="text-[10px]" />
                    </button>
                  ) : null}
                </div>
              </div>
                <div
                  className={`${groupItemsClassName} ${
                    embedded && groupKind !== "base"
                      ? "layer-panel-scroll min-h-0 flex-1 overflow-y-auto"
                      : ""
                  }`}
                >
                  {groupLayers.length === 0 ? (
                    <div className="px-3 py-3 text-[11px] text-[var(--text-muted)]">
                      No layers in this group.
                    </div>
                  ) : null}
                  {groupLayers.map((layer) => {
                    const isActive = activeLayerId === layer.id;
                    const isVisible = visibility[layer.id] ?? true;
                    const kind = (layer.kind ?? (layer.id === "models" ? "base" : "edit")) as LayerKind;
                    const isBase = kind === "base";
                    const isEditable = kind === "edit";
                    const isWater = kind === "water";
                    const canEditLight = !isWater;
                    const isSelectable = kind === "edit" || (kind === "base" && !baseLayerLocked);
                    const showIndicator = isSelectable;
                    const models = modelsByLayer[layer.id] ?? [];
                    const isExpanded = expandedLayers[layer.id] ?? false;
                    return (
                      <div
                        key={layer.id}
                        className="relative px-1 py-1"
                      >
                        <div
                          className={`${rowClassName} ${isActive ? rowActiveClassName : ""} ${
                            isSelectable ? "cursor-pointer" : "cursor-default"
                          } ${isExpanded && isEditable ? "rounded-b-none border-b border-(--seg-border)/70 bg-(--panel-bg)/40" : ""}`}
                          onClick={() => {
                            if (isSelectable) {
                              onSelectLayer(layer.id);
                              setPendingDeleteModel(null);
                              setOpenLayerActionMenu(null);
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
                              setPendingDeleteModel(null);
                              setOpenLayerActionMenu(null);
                            }
                          }}
                        >
                          {showIndicator ? (
                            <button
                              className={buttonBaseClassName}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (isSelectable) {
                                    onSelectLayer(layer.id);
                                    setPendingDeleteModel(null);
                                    setOpenLayerActionMenu(null);
                                  }
                                }}
                              title="Select layer"
                              aria-label="Select layer"
                              type="button"
                            >
                              <span
                                className={`${indicatorBaseClassName} ${
                                  isActive ? indicatorActiveClassName : indicatorInactiveClassName
                                }`}
                              />
                            </button>
                          ) : null}
                          <div className={`${nameStackClassName} min-w-0 flex-1`}>
                            <div className={`${nameClassName} truncate`}>{layer.label}</div>
                            {isEditable ? (
                              <div className={modelCountClassName}>{models.length} model(s)</div>
                            ) : null}
                          </div>
                          <div className={rowActionsClassName}>
                            <button
                              className={`${layerActionButtonBaseClassName} ${(isVisible ? "border-[var(--btn-active-border)] bg-[var(--btn-active-bg)] text-[var(--btn-active-text)]" : "")}`}
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
                                className="text-[10px]"
                                style={{ shapeRendering: "geometricPrecision" }}
                              />
                            </button>
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
                            <button
                              className={layerActionButtonBaseClassName}
                              onClick={(event) => {
                                event.stopPropagation();
                                const buttonRect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                const menuWidth = 170;
                                const hasLightSettings = !isWater;
                                const hasAddModel = isEditable;
                                const hasRename = !isBase;
                                const hasDelete = !isBase;
                                const menuActionCount =
                                  Number(hasLightSettings) + Number(hasAddModel) + Number(hasRename) + Number(hasDelete);
                                const menuHeight = 10 + menuActionCount * 30;
                                const margin = 8;
                                const left = Math.min(
                                  window.innerWidth - menuWidth - margin,
                                  Math.max(margin, buttonRect.right - menuWidth)
                                );
                                let top = buttonRect.bottom + 6;
                                if (top + menuHeight > window.innerHeight - margin) {
                                  top = Math.max(margin, buttonRect.top - menuHeight - 6);
                                }
                                setOpenLayerActionMenu((prev) =>
                                  prev?.layerId === layer.id
                                    ? null
                                    : { layerId: layer.id, kind, top, left }
                                );
                              }}
                              title="Layer actions"
                              aria-label="Layer actions"
                              data-layer-menu-trigger="true"
                              type="button"
                            >
                              <FontAwesomeIcon icon={faEllipsisVertical} className="text-[10px]" />
                            </button>
                          </div>
                        </div>
                        {isExpanded && isEditable ? (
                          <div className={modelListClassName}>
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
                                    {pendingDeleteModel?.layerId === layer.id && pendingDeleteModel?.modelId === model.id ? (
                                      <>
                                        <button
                                          className={modelButtonClassName}
                                          onClick={() => setPendingDeleteModel(null)}
                                          title="Cancel delete"
                                          aria-label="Cancel delete"
                                          type="button"
                                        >
                                          <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
                                        </button>
                                        <button
                                          className={`${modelButtonClassName} ${modelDeleteButtonClassName}`}
                                          onClick={() => {
                                            onDeleteModel(layer.id, model);
                                            setPendingDeleteModel(null);
                                          }}
                                          title="Confirm delete model"
                                          aria-label="Confirm delete model"
                                          type="button"
                                        >
                                          <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        className={`${modelButtonClassName} ${modelDeleteButtonClassName}`}
                                        onClick={() => setPendingDeleteModel({ layerId: layer.id, modelId: model.id })}
                                        title="Delete model"
                                        aria-label="Delete model"
                                        type="button"
                                      >
                                        <FontAwesomeIcon icon={faTrash} className="text-[9px]" />
                                      </button>
                                    )}
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
            </div>
          );
        })}
        </div>
        {selectedMenuLayer && openLayerActionMenu && typeof document !== "undefined"
          ? createPortal(
              <div
                className="fixed z-[2600] w-[170px] rounded-md border border-[var(--seg-border)] bg-[var(--panel-bg)] p-1 shadow-[var(--panel-shadow)]"
                style={{ top: `${openLayerActionMenu.top}px`, left: `${openLayerActionMenu.left}px` }}
                data-layer-menu="true"
                onClick={(event) => event.stopPropagation()}
              >
                {selectedMenuLayer.kind !== "water" ? (
                  <button
                    className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-[11px] text-[var(--text)] transition hover:bg-[var(--btn-hover)]"
                    onClick={() => {
                      onEditLayerLight(selectedMenuLayer.layer.id);
                      setOpenLayerActionMenu(null);
                    }}
                    type="button"
                  >
                    <FontAwesomeIcon icon={faSliders} className="text-[9px]" />
                    <span>Light settings</span>
                  </button>
                ) : null}
                {selectedMenuLayer.kind === "edit" ? (
                  <button
                    className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-[11px] text-[var(--text)] transition hover:bg-[var(--btn-hover)]"
                    onClick={() => {
                      handleAddModel(selectedMenuLayer.layer.id);
                      setOpenLayerActionMenu(null);
                    }}
                    type="button"
                  >
                    <FontAwesomeIcon icon={faPlus} className="text-[9px]" />
                    <span>Add model</span>
                  </button>
                ) : null}
                {selectedMenuLayer.kind === "water" ? (
                  <button
                    className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-[11px] text-[var(--text)] transition hover:bg-[var(--btn-hover)]"
                    onClick={() => {
                      onEditWaterLayer(selectedMenuLayer.layer.id);
                      setOpenLayerActionMenu(null);
                    }}
                    type="button"
                  >
                    <FontAwesomeIcon icon={faSliders} className="text-[9px]" />
                    <span>Water settings</span>
                  </button>
                ) : null}
                {selectedMenuLayer.kind !== "base" ? (
                  <button
                    className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-[11px] text-[var(--text)] transition hover:bg-[var(--btn-hover)]"
                    onClick={() => {
                      const raw = window.prompt("Enter new layer name", selectedMenuLayer.layer.label);
                      const nextName = raw?.trim();
                      if (!nextName) {
                        return;
                      }
                      if (nextName === selectedMenuLayer.layer.label) {
                        setOpenLayerActionMenu(null);
                        return;
                      }
                      onRenameLayer(selectedMenuLayer.layer.id, nextName);
                      setOpenLayerActionMenu(null);
                    }}
                    type="button"
                  >
                    <FontAwesomeIcon icon={faPenToSquare} className="text-[9px]" />
                    <span>Edit name</span>
                  </button>
                ) : null}
                {selectedMenuLayer.kind !== "base" ? (
                  <button
                    className="mt-1 flex h-7 w-full items-center gap-2 rounded-md px-2 text-[11px] text-[var(--btn-danger-text)] transition hover:opacity-90"
                    style={{ backgroundColor: "var(--btn-danger-bg)" }}
                    onClick={() => {
                      const confirmed = window.confirm(`Delete layer "${selectedMenuLayer.layer.label}"?`);
                      if (!confirmed) {
                        return;
                      }
                      onDeleteLayer(selectedMenuLayer.layer.id);
                      setOpenLayerActionMenu(null);
                    }}
                    type="button"
                  >
                    <FontAwesomeIcon icon={faTrash} className="text-[9px]" />
                    <span>Delete layer</span>
                  </button>
                ) : null}
              </div>,
              document.body
            )
          : null}
        </div>
      ) : null}
    </div>
  );
}
