import { useState } from "react";
import type { ThemeMode, TransformMode } from "@/types/common";

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
  theme: ThemeMode;
  onToggleTheme: () => void;
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
  theme,
  onToggleTheme,
}: Props) => {
  const [clippingEnabled, setClippingEnabled] = useState(false);
  const [footprintEnabled, setFootprintEnabled] = useState(false);

  const panelClassName =
    "absolute left-4 top-4 z-[2000] flex w-[312px] max-w-[min(92vw,360px)] flex-col gap-2 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 text-[var(--text)] shadow-[var(--panel-shadow)]";
  const headerClassName =
    "flex items-baseline justify-between gap-2 border-b border-[var(--divider)] px-0.5 pb-2";
  const headerMetaClassName = "flex flex-col gap-px";
  const titleClassName = "text-[13px] font-semibold tracking-[0.02em]";
  const subtitleClassName = "text-[10px] uppercase tracking-[0.06em] text-[var(--text-muted)]";
  const themeToggleClassName =
    "grid h-8 w-8 place-items-center rounded-[7px] border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[var(--text)] transition hover:-translate-y-px hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]";
  const themeToggleActiveClassName =
    "border-[var(--btn-active-border)] bg-[var(--btn-active-bg)] text-[var(--btn-active-text)] shadow-[var(--btn-active-ring)]";
  const sectionsClassName = "flex flex-col gap-2.5";
  const sectionClassName = "flex flex-col gap-1.5";
  const sectionHeadingClassName = "px-0.5 text-[11px] font-semibold text-[var(--section-heading)]";
  const sectionBodyClassName = "flex flex-wrap items-center gap-1.5";
  const sectionActionsClassName = "flex flex-none items-center gap-1.5";
  const toolGridClassName = "grid w-full grid-cols-2 gap-1.5";
  const segmentedClassName =
    "inline-flex overflow-hidden rounded-[7px] border border-[var(--seg-border)] bg-[var(--seg-bg)]";
  const segmentedButtonBaseClassName =
    "flex h-10 w-11 flex-none items-center justify-center border-l border-[var(--seg-divider)] text-[15px] text-[var(--text)] transition first:border-l-0 hover:bg-[var(--seg-hover)]";
  const segmentedButtonActiveClassName =
    "bg-[var(--btn-active-bg)] text-[var(--btn-active-text)] shadow-[var(--btn-active-ring)]";
  const buttonBaseClassName =
    "flex items-center rounded-lg border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[15px] text-[var(--text)] transition hover:-translate-y-px hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]";
  const buttonStandardClassName = "h-11 w-full gap-2 px-2.5 text-left";
  const buttonActiveClassName =
    "border-[var(--btn-active-border)] bg-[var(--btn-active-bg)] text-[var(--btn-active-text)] shadow-[var(--btn-active-ring)]";
  const buttonCompactClassName = "h-7 w-7 shrink-0 justify-center gap-0 rounded-md p-0 text-[11px]";
  const buttonDangerClassName =
    "border-[var(--btn-danger-border)] bg-[var(--btn-danger-bg)] text-[var(--btn-danger-text)] hover:!border-[var(--btn-danger-hover)] hover:!bg-[var(--btn-danger-hover)]";
  const toolLabelClassName = "text-[11px] font-semibold tracking-[0.01em]";
  const srOnlyClassName =
    "sr-only";

  return (
    <div className={panelClassName}>
      <div className={headerClassName}>
        <div className={headerMetaClassName}>
          <div className={titleClassName}>Scene Editor</div>
          <div className={subtitleClassName}>Tools & View</div>
        </div>
        <button
          className={`${themeToggleClassName} ${theme === "dark" ? themeToggleActiveClassName : ""}`}
          onClick={onToggleTheme}
          type="button"
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          <i
            className={`fa-solid fa-circle-half-stroke transition-transform duration-200 ${
              theme === "dark" ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      <div className={sectionsClassName}>
        <section className={sectionClassName} aria-label="Transform tools">
          <div className={sectionHeadingClassName}>Transform</div>
          <div className={sectionBodyClassName}>
            <div className={segmentedClassName} role="radiogroup" aria-label="Transform mode">
              <button
                className={`${segmentedButtonBaseClassName} ${mode === "translate" ? segmentedButtonActiveClassName : ""}`}
                onClick={() => onChange("translate")}
                title="Move"
                aria-label="Move"
                role="radio"
                aria-checked={mode === "translate"}
              >
                <i className="fa-solid fa-up-down-left-right" />
                <span className={srOnlyClassName}>Move</span>
              </button>
              <button
                className={`${segmentedButtonBaseClassName} ${mode === "translate-box" ? segmentedButtonActiveClassName : ""}`}
                onClick={() => onChange("translate-box")}
                title="Box Move"
                aria-label="Box Move"
                role="radio"
                aria-checked={mode === "translate-box"}
              >
                <i className="fa-solid fa-cube" />
                <span className={srOnlyClassName}>Box Move</span>
              </button>
              <button
                className={`${segmentedButtonBaseClassName} ${mode === "rotate" ? segmentedButtonActiveClassName : ""}`}
                onClick={() => onChange("rotate")}
                title="Rotate"
                aria-label="Rotate"
                role="radio"
                aria-checked={mode === "rotate"}
              >
                <i className="fa-solid fa-rotate" />
                <span className={srOnlyClassName}>Rotate</span>
              </button>
              <button
                className={`${segmentedButtonBaseClassName} ${mode === "scale" ? segmentedButtonActiveClassName : ""}`}
                onClick={() => onChange("scale")}
                title="Scale"
                aria-label="Scale"
                role="radio"
                aria-checked={mode === "scale"}
              >
                <i className="fa-solid fa-up-right-and-down-left-from-center" />
                <span className={srOnlyClassName}>Scale</span>
              </button>
            </div>

            {showSnapToGround || showReset ? (
              <div className={sectionActionsClassName} aria-label="Transform actions">
                {showSnapToGround ? (
                  <button
                    className={`${buttonBaseClassName} ${buttonCompactClassName}`}
                    onClick={onSnapToGround}
                    title="Snap to Ground"
                    aria-label="Snap to Ground"
                  >
                    <i className="fa-solid fa-arrow-down text-[10px]" />
                    <span className={srOnlyClassName}>Snap</span>
                  </button>
                ) : null}
                {showReset ? (
                  <button
                    className={`${buttonBaseClassName} ${buttonCompactClassName} ${buttonDangerClassName}`}
                    onClick={() => onChange("reset")}
                    title="Reset"
                    aria-label="Reset"
                  >
                    <i className="fa-solid fa-rotate-left text-[10px]" />
                    <span className={srOnlyClassName}>Reset</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className={sectionClassName} aria-label="View tools">
          <div className={sectionHeadingClassName}>View</div>
          <div className={toolGridClassName}>
            <button
              className={`${buttonBaseClassName} ${buttonStandardClassName} ${clippingEnabled ? buttonActiveClassName : ""}`}
              onClick={() => {
                const next = !clippingEnabled;
                setClippingEnabled(next);
                enableClippingPlane(next);
              }}
              title="Clipping Plane"
              aria-label="Clipping Plane"
            >
              <i className="fa-solid fa-scissors" />
              <span className={toolLabelClassName}>Clip</span>
            </button>
            <button
              className={`${buttonBaseClassName} ${buttonStandardClassName} ${footprintEnabled ? buttonActiveClassName : ""}`}
              onClick={() => {
                const next = !footprintEnabled;
                setFootprintEnabled(next);
                enableFootPrintWhenEdit(next);
              }}
              title="Footprint"
              aria-label="Footprint"
            >
              <i className="fa-solid fa-shoe-prints" />
              <span className={toolLabelClassName}>Footprint</span>
            </button>
          </div>
        </section>

        <div className="my-0.5 h-px w-full bg-[var(--divider)]" />

        <section className={sectionClassName} aria-label="Layer tools">
          <div className={sectionHeadingClassName}>Layer</div>
          <div className={sectionBodyClassName}>
            <button
              className={`${buttonBaseClassName} ${buttonStandardClassName}`}
              onClick={onAddLayer}
              title="Add Edit Layer"
              aria-label="Add Edit Layer"
            >
              <i className="fa-solid fa-layer-group" />
              <span className={toolLabelClassName}>Add Layer</span>
            </button>
          </div>
        </section>

        <section className={sectionClassName} aria-label="Tile tools">
          <div className={sectionHeadingClassName}>Tiles</div>
          <div className={sectionBodyClassName}>
            <button
              className={`${buttonBaseClassName} ${buttonStandardClassName} ${showTiles ? buttonActiveClassName : ""}`}
              onClick={onToggleTiles}
              title="Tile Boundaries"
              aria-label="Tile Boundaries"
            >
              <i className="fa-solid fa-border-all" />
              <span className={toolLabelClassName}>Boundaries</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
