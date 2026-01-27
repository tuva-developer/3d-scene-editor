import { useState } from "react";
import type { TransformMode } from "@/types/common";

interface Props {
  mode: TransformMode;
  onChange: (m: TransformMode) => void;
  showTiles: boolean;
  onToggleTiles: () => void;
  showReset: boolean;
  showSnapToGround: boolean;
  onSnapToGround: () => void;
  enableClippingPlane: (enable: boolean) => void;
  enableFootPrintWhenEdit: (enable: boolean) => void;
  onAddLayer: () => void;
}

export const EditorToolbar = ({
  mode,
  onChange,
  showTiles,
  onToggleTiles,
  showReset,
  showSnapToGround,
  onSnapToGround,
  enableClippingPlane,
  enableFootPrintWhenEdit,
  onAddLayer,
}: Props) => {
  const [clippingEnabled, setClippingEnabled] = useState(false);
  const [footprintEnabled, setFootprintEnabled] = useState(false);

  return (
    <div className="editor-toolbar">
      <div className="editor-row">
        <div className="editor-group">
          <div className="editor-group-stack">
            <span className="editor-group-label">Transform Tools</span>
            <div className="editor-group-row">
              <div className="editor-segmented" role="radiogroup" aria-label="Transform mode">
                <button
                  className={`editor-segment-btn ${mode === "translate" ? "active" : ""}`}
                  onClick={() => onChange("translate")}
                  title="Move"
                  aria-label="Move"
                  role="radio"
                  aria-checked={mode === "translate"}
                >
                  <i className="fa-solid fa-up-down-left-right" />
                </button>
                <button
                  className={`editor-segment-btn ${mode === "translate-box" ? "active" : ""}`}
                  onClick={() => onChange("translate-box")}
                  title="Box Move"
                  aria-label="Box Move"
                  role="radio"
                  aria-checked={mode === "translate-box"}
                >
                  <i className="fa-solid fa-vector-square" />
                </button>
                <button
                  className={`editor-segment-btn ${mode === "rotate" ? "active" : ""}`}
                  onClick={() => onChange("rotate")}
                  title="Rotate"
                  aria-label="Rotate"
                  role="radio"
                  aria-checked={mode === "rotate"}
                >
                  <i className="fa-solid fa-rotate" />
                </button>
                <button
                  className={`editor-segment-btn ${mode === "scale" ? "active" : ""}`}
                  onClick={() => onChange("scale")}
                  title="Scale"
                  aria-label="Scale"
                  role="radio"
                  aria-checked={mode === "scale"}
                >
                  <i className="fa-solid fa-up-right-and-down-left-from-center" />
                </button>
              </div>
              {showSnapToGround || showReset ? (
                <>
                  <div className="editor-group-actions" aria-label="Transform actions">
                    {showSnapToGround ? (
                      <button
                        className="editor-btn editor-btn-compact"
                        onClick={onSnapToGround}
                        title="Snap to Ground"
                        aria-label="Snap to Ground"
                      >
                        <i className="fa-solid fa-arrow-down" />
                      </button>
                    ) : null}
                    {showReset ? (
                      <button
                        className="editor-btn editor-btn-danger editor-btn-compact"
                        onClick={() => onChange("reset")}
                        title="Reset"
                        aria-label="Reset"
                      >
                        <i className="fa-solid fa-rotate-left" />
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="editor-divider" />
        <div className="editor-group-stack">
          <span className="editor-group-label">View</span>
          <div className="editor-group">
            <button
              className={`editor-btn ${clippingEnabled ? "active" : ""}`}
              onClick={() => {
                const next = !clippingEnabled;
                setClippingEnabled(next);
                enableClippingPlane(next);
              }}
              title="Clipping Plane"
              aria-label="Clipping Plane"
            >
              <i className="fa-solid fa-scissors" />
            </button>
            <button
              className={`editor-btn ${footprintEnabled ? "active" : ""}`}
              onClick={() => {
                const next = !footprintEnabled;
                setFootprintEnabled(next);
                enableFootPrintWhenEdit(next);
              }}
              title="Footprint"
              aria-label="Footprint"
            >
              <i className="fa-solid fa-shoe-prints" />
            </button>
          </div>
        </div>
        <div className="editor-divider" />
        <div className="editor-group-stack">
          <span className="editor-group-label">Layer</span>
          <div className="editor-group">
            <button
              className="editor-btn"
              onClick={onAddLayer}
              title="Add Edit Layer"
              aria-label="Add Edit Layer"
            >
              <i className="fa-solid fa-layer-group" />
            </button>
          </div>
        </div>
        <div className="editor-divider" />
        <div className="editor-group-stack">
          <span className="editor-group-label">Tiles</span>
          <div className="editor-group">
            <button
              className={`editor-btn ${showTiles ? "active" : ""}`}
              onClick={onToggleTiles}
              title="Tile Boundaries"
              aria-label="Tile Boundaries"
            >
              <i className="fa-solid fa-border-all" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
