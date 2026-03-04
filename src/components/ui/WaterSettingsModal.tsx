import { useEffect, useId, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { DEFAULT_WATER_SETTINGS, type WaterSettings } from "@/components/map/water/WaterMaterial";

type WaterSettingsModalProps = {
  open: boolean;
  layerName: string;
  initialSettings: WaterSettings;
  onChange: (settings: WaterSettings) => void;
  onConfirm: (settings: WaterSettings) => void;
  onCancel: () => void;
};

type NumberField = {
  key: keyof WaterSettings;
  label: string;
  min: number;
  max: number;
  step: number;
};

const numberFields: NumberField[] = [
  { key: "waveSpeed", label: "Wave Speed", min: 0, max: 10, step: 0.1 },
  { key: "waveStrength", label: "Wave Strength", min: 0, max: 1, step: 0.01 },
  { key: "opacity", label: "Opacity", min: 0, max: 1, step: 0.01 },
  { key: "uvScale", label: "UV Scale", min: 0.0001, max: 0.01, step: 0.0001 },
  { key: "specularStrength", label: "Specular Strength", min: 0, max: 2, step: 0.05 },
  { key: "shininess", label: "Shininess", min: 1, max: 64, step: 1 },
  { key: "distortionScale", label: "Distortion Scale", min: 0, max: 10, step: 0.1 },
  { key: "noiseStrength", label: "Noise Strength", min: 0, max: 1, step: 0.01 },
  { key: "lightRayStrength", label: "Light Ray Strength", min: 0, max: 1, step: 0.01 },
];

const colorFields: Array<{ key: keyof WaterSettings; label: string }> = [
  { key: "waterColor", label: "Water Color" },
  { key: "deepWaterColor", label: "Deep Water Color" },
  { key: "shallowWaterColor", label: "Shallow Water Color" },
  { key: "foamColor", label: "Foam Color" },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function WaterSettingsModal({
  open,
  layerName,
  initialSettings,
  onChange,
  onConfirm,
  onCancel,
}: WaterSettingsModalProps) {
  const [settings, setSettings] = useState<WaterSettings>(initialSettings);
  const [modalOffset, setModalOffset] = useState({ x: 0, y: 0 });
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    setSettings(initialSettings);
    setModalOffset({ x: 0, y: 0 });
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

  const handleDragStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    dragStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: modalOffset.x,
      offsetY: modalOffset.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStateRef.current.active) {
        return;
      }
      const deltaX = moveEvent.clientX - dragStateRef.current.startX;
      const deltaY = moveEvent.clientY - dragStateRef.current.startY;
      setModalOffset({
        x: dragStateRef.current.offsetX + deltaX,
        y: dragStateRef.current.offsetY + deltaY,
      });
    };

    const handleMouseUp = () => {
      dragStateRef.current.active = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const updateNumber = (key: keyof WaterSettings, value: number, min: number, max: number) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: clamp(value, min, max) };
      onChange(next);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-4000">
      <div
        className="absolute inset-0 bg-transparent"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="absolute left-1/2 top-1/2 z-1 w-[min(92vw,520px)] rounded-xl border border-(--panel-border) bg-(--panel-bg) p-4 text-(--text) shadow-(--panel-shadow)"
        style={{
          transform: `translate(calc(-50% + ${modalOffset.x}px), calc(-50% + ${modalOffset.y}px))`,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-1 cursor-move select-none" onMouseDown={handleDragStart} title="Drag to move">
          <div id={titleId} className="text-[15px] font-semibold">
            Edit Water Settings
          </div>
        </div>
        <div id={descriptionId} className="text-[12px] text-(--text-muted)">
          Customize material for {layerName}.
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {colorFields.map((field) => (
            <label key={field.key} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="font-semibold text-(--section-heading)">{field.label}</span>
              <input
                type="color"
                value={settings[field.key] as string}
                onChange={(event) =>
                  setSettings((prev) => {
                    const next = { ...prev, [field.key]: event.target.value };
                    onChange(next);
                    return next;
                  })
                }
                className="h-9 w-16 cursor-pointer rounded-md border border-(--btn-border) bg-(--btn-bg) p-1"
              />
            </label>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {numberFields.map((field) => (
            <label key={field.key} className="grid gap-1 text-[12px]">
              <span className="font-semibold text-(--section-heading)">{field.label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={settings[field.key] as number}
                  onChange={(event) =>
                    updateNumber(field.key, Number(event.target.value), field.min, field.max)
                  }
                  className="h-2 w-full cursor-pointer"
                />
                <input
                  type="number"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={settings[field.key] as number}
                  onChange={(event) =>
                    updateNumber(field.key, Number(event.target.value), field.min, field.max)
                  }
                  className="h-8 w-20 rounded-md border border-(--btn-border) bg-(--btn-bg) px-2 text-[12px] text-(--text) outline-none transition focus:border-(--btn-active-border) focus:ring-2 focus:ring-(--focus-ring)/40"
                />
              </div>
            </label>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              const next = { ...DEFAULT_WATER_SETTINGS };
              setSettings(next);
              onChange(next);
            }}
            className="h-9 rounded-md border border-(--btn-border) bg-(--btn-bg) px-3 text-[13px] font-semibold text-(--text) transition hover:border-(--btn-border-hover) hover:bg-(--btn-hover)"
          >
            Reset Defaults
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
