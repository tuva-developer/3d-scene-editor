export type TransformMode = "translate" | "rotate" | "scale" | "reset";

interface Props {
  mode: TransformMode;
  onChange: (m: TransformMode) => void;
  showTiles: boolean;
  onToggleTiles: () => void;
  showReset: boolean;
}

export const TransformToolbar = ({ mode, onChange, showTiles, onToggleTiles, showReset }: Props) => {
  return (
    <div className="tc-toolbar">
      <div className="tc-group">
        <div className="tc-row">
          <button
            className={`tc-btn ${mode === "translate" ? "active" : ""}`}
            onClick={() => onChange("translate")}
            title="Move"
            aria-label="Move"
          >
            <i className="fa-solid fa-up-down-left-right" />
          </button>
          <button
            className={`tc-btn ${mode === "rotate" ? "active" : ""}`}
            onClick={() => onChange("rotate")}
            title="Rotate"
            aria-label="Rotate"
          >
            <i className="fa-solid fa-rotate" />
          </button>
          <button
            className={`tc-btn ${mode === "scale" ? "active" : ""}`}
            onClick={() => onChange("scale")}
            title="Scale"
            aria-label="Scale"
          >
            <i className="fa-solid fa-up-right-and-down-left-from-center" />
          </button>
          {showReset ? (
            <button className="tc-btn tc-btn-danger" onClick={() => onChange("reset")} title="Reset" aria-label="Reset">
              <i className="fa-solid fa-rotate-left" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="tc-divider" />
      <div className="tc-group">
        <div className="tc-row">
          <button
            className={`tc-btn ${showTiles ? "active" : ""}`}
            onClick={onToggleTiles}
            title="Tile Boundaries"
            aria-label="Tile Boundaries"
          >
            <i className="fa-solid fa-border-all" />
          </button>
        </div>
      </div>
    </div>
  );
};
