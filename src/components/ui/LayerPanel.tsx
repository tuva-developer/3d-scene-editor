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
  faPlus,
  faTrash,
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
  onShowAll: () => void;
  onHideAll: () => void;
  onAddLayer: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

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
  onShowAll,
  onHideAll,
  onAddLayer,
  isOpen,
  onToggleOpen,
}: Props) {
  const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({});
  const handleAddModel = (layerId: string) => {
    setExpandedLayers((prev) => ({
      ...prev,
      [layerId]: true,
    }));
    onAddModel(layerId);
  };
  const panelClassName =
    "absolute left-4 top-20 z-[2000] w-[300px] overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text)] shadow-[var(--panel-shadow)]";
  const headerClassName =
    "sticky top-0 z-10 flex items-center justify-between border-b border-[var(--divider)] bg-[var(--panel-bg)]/95 px-4 py-3 backdrop-blur";
  const titleClassName = "text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]";
  const headerActionsClassName = "flex items-center gap-1.5";
  const headerButtonClassName =
    "flex h-7 w-7 items-center justify-center rounded-full border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[11px] text-[var(--text)] transition hover:-translate-y-px hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]";
  const listClassName =
    "layer-panel-scroll flex max-h-[calc(100vh-220px)] flex-col gap-2 overflow-y-auto px-4 py-3";
  const rowClassName =
    "group grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-xl border border-[var(--seg-border)] bg-[var(--seg-bg)] px-2.5 py-2 transition hover:border-[var(--btn-border-hover)] hover:bg-[var(--seg-hover)]";
  const rowActiveClassName =
    "border-[var(--btn-active-border)] bg-[var(--btn-active-bg)] text-[var(--btn-active-text)] shadow-[var(--btn-active-ring)]";
  const nameClassName = "text-[12px] font-semibold leading-tight tracking-[0.02em] text-[var(--text)]";
  const buttonBaseClassName =
    "flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[11px] text-[var(--text)] transition hover:-translate-y-px hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]";
  const buttonActiveClassName =
    "border-[var(--btn-active-border)] bg-[var(--btn-active-bg)] text-[var(--btn-active-text)] shadow-[var(--btn-active-ring)]";
  const deleteButtonClassName =
    "border-[var(--btn-danger-border)] bg-[var(--btn-danger-bg)] text-[var(--btn-danger-text)] hover:!border-[var(--btn-danger-hover)] hover:!bg-[var(--btn-danger-hover)]";
  const badgeClassName =
    "mt-0.5 text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)]";
  const indicatorBaseClassName = "h-3.5 w-3.5 rounded-full";
  const indicatorActiveClassName = "bg-[var(--btn-active-bg)]";
  const indicatorInactiveClassName = "border border-[var(--btn-border)] bg-transparent";
  const expandButtonClassName =
    "flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[10px] text-[var(--text)] transition hover:-translate-y-px hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]";
  const expandIconClassName = "transition-transform";
  const rowLeftClassName = "flex items-center gap-1";
  const rowRightClassName = "flex items-center gap-1";
  const modelListClassName =
    "relative ml-10 mt-2 rounded-xl border border-[var(--seg-border)] bg-[var(--panel-bg)]/70 px-2.5 py-2 text-[11px]";
  const modelItemClassName = "flex items-center justify-between gap-2 py-1.5";
  const modelNameClassName = "truncate text-[11px] text-[var(--text)]";
  const modelCountClassName = "text-[10px] text-[var(--text-muted)]";
  const modelButtonClassName =
    "flex h-6 w-6 items-center justify-center rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[10px] text-[var(--text)] transition hover:-translate-y-px hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]";
  const modelDeleteButtonClassName =
    "border-[var(--btn-danger-border)] bg-[var(--btn-danger-bg)] text-[var(--btn-danger-text)] hover:!border-[var(--btn-danger-hover)] hover:!bg-[var(--btn-danger-hover)]";
  const treeConnectorClassName =
    "absolute left-[-12px] top-0 h-full w-px bg-[var(--seg-border)]/70";
  const treeBranchClassName =
    "absolute left-[-12px] top-4 h-px w-4 bg-[var(--seg-border)]/70";
  const modelRowClassName =
    "relative pl-4";

  return (
    <div className={panelClassName} aria-label="Layer panel">
      <div className={headerClassName}>
        <div className={titleClassName}>Layers</div>
        <div className={headerActionsClassName}>
          <button
            className={headerButtonClassName}
            onClick={onAddLayer}
            title="Add edit layer"
            aria-label="Add edit layer"
            type="button"
          >
            <FontAwesomeIcon icon={faLayerGroup} className="text-[12px]" />
          </button>
          <button
            className={headerButtonClassName}
            onClick={onShowAll}
            title="Show all layers"
            aria-label="Show all layers"
            type="button"
          >
            <FontAwesomeIcon icon={faEye} className="text-[13px]" style={{ shapeRendering: "geometricPrecision" }} />
          </button>
          <button
            className={headerButtonClassName}
            onClick={onHideAll}
            title="Hide all layers"
            aria-label="Hide all layers"
            type="button"
          >
            <FontAwesomeIcon icon={faEyeSlash} className="text-[13px]" style={{ shapeRendering: "geometricPrecision" }} />
          </button>
          <button
            className={headerButtonClassName}
            onClick={onToggleOpen}
            title={isOpen ? "Collapse panel" : "Expand panel"}
            aria-label={isOpen ? "Collapse panel" : "Expand panel"}
            type="button"
          >
            <FontAwesomeIcon icon={faChevronDown} className={`${expandIconClassName} ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
      {isOpen ? (
        <div className={listClassName}>
        {layers.map((layer) => {
          const isActive = activeLayerId === layer.id;
          const isVisible = visibility[layer.id] ?? true;
          const isBase = layer.id === "models";
          const models = modelsByLayer[layer.id] ?? [];
          const isExpanded = expandedLayers[layer.id] ?? false;
          return (
            <div key={layer.id} className="relative">
              <div
                className={`${rowClassName} ${isActive ? rowActiveClassName : ""}`}
                onClick={() => onSelectLayer(layer.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectLayer(layer.id);
                  }
                }}
              >
                <div className={rowLeftClassName}>
                  {!isBase ? (
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
                      className={`${expandIconClassName} ${isExpanded ? "rotate-180" : ""}`}
                    />
                    </button>
                  ) : null}
                  <button
                    className={buttonBaseClassName}
                    onClick={() => onSelectLayer(layer.id)}
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
                </div>
                <div className={nameClassName}>
                  {layer.label}
                  {isBase ? <div className={badgeClassName}>Base</div> : null}
                </div>
                <div className={rowRightClassName}>
                <button
                  className={`${buttonBaseClassName} ${isVisible ? buttonActiveClassName : ""}`}
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
                    className="text-[13px]"
                    style={{ shapeRendering: "geometricPrecision" }}
                  />
                </button>
                  {isBase ? null : (
                    <>
                      <button
                      className={buttonBaseClassName}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleAddModel(layer.id);
                      }}
                        title="Add model to layer"
                        aria-label="Add model to layer"
                        type="button"
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </button>
                      <button
                        className={`${buttonBaseClassName} ${deleteButtonClassName}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteLayer(layer.id);
                        }}
                        title="Delete layer"
                        aria-label="Delete layer"
                        type="button"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {isExpanded && !isBase ? (
                <div className={modelListClassName}>
                  <div className={treeConnectorClassName} />
                  <div className={modelCountClassName}>{models.length} model(s)</div>
                  {models.length ? (
                    models.map((model) => (
                      <div key={model.id} className={`${modelItemClassName} ${modelRowClassName}`}>
                        <div className={treeBranchClassName} />
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
                            <FontAwesomeIcon icon={faLocationDot} />
                          </button>
                          <button
                            className={modelButtonClassName}
                            onClick={() => onCloneModel(layer.id, model)}
                            title="Clone model"
                            aria-label="Clone model"
                            type="button"
                          >
                            <FontAwesomeIcon icon={faClone} />
                          </button>
                          <button
                            className={`${modelButtonClassName} ${modelDeleteButtonClassName}`}
                            onClick={() => onDeleteModel(layer.id, model)}
                            title="Delete model"
                            aria-label="Delete model"
                            type="button"
                          >
                            <FontAwesomeIcon icon={faTrash} />
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
}
