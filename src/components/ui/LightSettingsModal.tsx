import { useEffect, useId, useState } from "react";

export type LightIntensitySettings = {
  directional: number;
  hemisphere: number;
  ambient: number;
};

type LightSettingsModalProps = {
  open: boolean;
  layerName: string;
  initialSettings: LightIntensitySettings;
  defaultSettings: LightIntensitySettings;
  min?: number;
  max?: number;
  step?: number;
  onConfirm: (settings: LightIntensitySettings) => void;
  onCancel: () => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function LightSettingsModal({
  open,
  layerName,
  initialSettings,
  defaultSettings,
  min = 0.2,
  max = 3,
  step = 0.05,
  onConfirm,
  onCancel,
}: LightSettingsModalProps) {
  const [settings, setSettings] = useState<LightIntensitySettings>(initialSettings);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    setSettings(initialSettings);
  }, [initialSettings, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, open]);

  if (!open) {
    return null;
  }

  const updateIntensity = (key: keyof LightIntensitySettings, value: number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: clamp(value, min, max),
    }));
  };

  const controls: Array<{ key: keyof LightIntensitySettings; label: string }> = [
    { key: "directional", label: "Directional Light" },
    { key: "hemisphere", label: "Hemisphere Light" },
    { key: "ambient", label: "Ambient Light" },
  ];

  return (
    <div className="fixed inset-0 z-4000 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-1 w-[min(92vw,420px)] rounded-xl border border-(--panel-border) bg-(--panel-bg) p-4 text-(--text) shadow-(--panel-shadow)"
      >
        <div id={titleId} className="text-[15px] font-semibold">
          Light Settings
        </div>
        <div id={descriptionId} className="mt-1 text-[12px] text-(--text-muted)">
          Adjust light intensity for {layerName}.
        </div>

        <div className="mt-4 grid gap-3 text-[12px]">
          <span className="font-semibold text-(--section-heading)">Light Intensity</span>
          {controls.map((control) => (
            <div key={control.key} className="grid gap-2">
              <span className="text-[11px] font-semibold text-(--text-muted)">{control.label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={settings[control.key]}
                  onChange={(event) => updateIntensity(control.key, Number(event.target.value))}
                  className="h-2 w-full cursor-pointer"
                />
                <input
                  type="number"
                  min={min}
                  max={max}
                  step={step}
                  value={settings[control.key]}
                  onChange={(event) => updateIntensity(control.key, Number(event.target.value))}
                  className="h-8 w-20 rounded-md border border-(--btn-border) bg-(--btn-bg) px-2 text-[12px] text-(--text) outline-none transition focus:border-(--btn-active-border) focus:ring-2 focus:ring-(--focus-ring)/40"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setSettings(defaultSettings)}
            className="h-9 rounded-md border border-(--btn-border) bg-(--btn-bg) px-3 text-[13px] font-semibold text-(--text) transition hover:border-(--btn-border-hover) hover:bg-(--btn-hover)"
          >
            Reset Default
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-9 rounded-md border border-(--btn-border) bg-(--btn-bg) px-3 text-[13px] font-semibold text-(--text) transition hover:border-(--btn-border-hover) hover:bg-(--btn-hover)"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(settings)}
              className="h-9 rounded-md border border-(--btn-active-border) bg-(--btn-active-bg) px-3 text-[13px] font-semibold text-(--btn-active-text) shadow-(--btn-active-ring) transition hover:brightness-105"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
