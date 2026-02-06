import { useEffect, useId, useRef, useState } from "react";

type WaterLayerModalProps = {
  open: boolean;
  nameValue: string;
  onChangeName: (value: string) => void;
  defaultTileUrl: string;
  defaultSourceLayer: string;
  selectedFile: File | null;
  onChangeFile: (file: File | null) => void;
  onConfirm: (data: {
    name: string;
    file: File | null;
    tileUrl: string;
    sourceLayer: string;
  }) => void;
  onCancel: () => void;
};

export default function WaterLayerModal({
  open,
  nameValue,
  onChangeName,
  defaultTileUrl,
  defaultSourceLayer,
  selectedFile,
  onChangeFile,
  onConfirm,
  onCancel,
}: WaterLayerModalProps) {
  const [localName, setLocalName] = useState(nameValue);
  const [tileUrl, setTileUrl] = useState(defaultTileUrl);
  const [sourceLayer, setSourceLayer] = useState(defaultSourceLayer);
  const [tileUrlError, setTileUrlError] = useState("");
  const [sourceLayerError, setSourceLayerError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const nameId = useId();
  const tileId = useId();
  const sourceId = useId();
  const fileId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    setLocalName(nameValue);
    setTileUrl(defaultTileUrl);
    setSourceLayer(defaultSourceLayer);
    setTileUrlError("");
    setSourceLayerError("");
  }, [defaultSourceLayer, defaultTileUrl, nameValue, open]);

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

  useEffect(() => {
    if (!open) {
      return;
    }
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [open]);

  if (!open) {
    return null;
  }

  const handleConfirm = () => {
    const cleaned = localName.trim();
    const cleanedTileUrl = tileUrl.trim();
    const cleanedSourceLayer = sourceLayer.trim();
    let hasError = false;
    if (!cleanedTileUrl) {
      setTileUrlError("Tile URL is required.");
      hasError = true;
    } else if (!(cleanedTileUrl.includes("{z}") && cleanedTileUrl.includes("{x}") && cleanedTileUrl.includes("{y}"))) {
      setTileUrlError("Tile URL must include {z}, {x}, and {y}.");
      hasError = true;
    } else {
      setTileUrlError("");
    }

    if (!cleanedSourceLayer) {
      setSourceLayerError("Source layer is required.");
      hasError = true;
    } else {
      setSourceLayerError("");
    }

    if (hasError) {
      return;
    }
    onConfirm({
      name: cleaned,
      file: selectedFile,
      tileUrl: cleanedTileUrl,
      sourceLayer: cleanedSourceLayer || defaultSourceLayer,
    });
  };

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
        className="relative z-1 w-[min(92vw,360px)] rounded-xl border border-(--panel-border) bg-(--panel-bg) p-4 text-(--text) shadow-(--panel-shadow)"
      >
        <div id={titleId} className="text-[15px] font-semibold">
          Add Water Layer
        </div>
        <div className="mt-1 text-[12px] text-(--text-muted)">
          Choose a texture to drive the water normal map.
        </div>

        <label
          className="mt-3 block text-[11px] font-semibold text-(--section-heading)"
          htmlFor={nameId}
        >
          Layer Name
        </label>
        <input
          id={nameId}
          ref={inputRef}
          value={localName}
          onChange={(event) => {
            setLocalName(event.target.value);
            onChangeName(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleConfirm();
            }
          }}
          className="mt-1 h-10 w-full rounded-md border border-(--btn-border) bg-(--btn-bg) px-3 text-[13px] font-medium text-(--text) outline-none transition focus:border-(--btn-active-border) focus:ring-2 focus:ring-(--focus-ring)/40"
          placeholder="Custom Water"
        />

        <label
          className="mt-3 block text-[11px] font-semibold text-(--section-heading)"
          htmlFor={tileId}
        >
          Vector Tile URL
        </label>
        <input
          id={tileId}
          value={tileUrl}
          onChange={(event) => {
            setTileUrl(event.target.value);
            if (tileUrlError) {
              setTileUrlError("");
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleConfirm();
            }
          }}
          className="mt-1 h-10 w-full rounded-md border border-(--btn-border) bg-(--btn-bg) px-3 text-[13px] font-medium text-(--text) outline-none transition focus:border-(--btn-active-border) focus:ring-2 focus:ring-(--focus-ring)/40"
          placeholder="https://example.com/{z}/{x}/{y}"
        />
        {tileUrlError ? (
          <div className="mt-1 text-[11px] text-(--btn-danger-text)">
            {tileUrlError}
          </div>
        ) : null}

        <label
          className="mt-3 block text-[11px] font-semibold text-(--section-heading)"
          htmlFor={sourceId}
        >
          Source Layer
        </label>
        <input
          id={sourceId}
          value={sourceLayer}
          onChange={(event) => {
            setSourceLayer(event.target.value);
            if (sourceLayerError) {
              setSourceLayerError("");
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleConfirm();
            }
          }}
          className="mt-1 h-10 w-full rounded-md border border-(--btn-border) bg-(--btn-bg) px-3 text-[13px] font-medium text-(--text) outline-none transition focus:border-(--btn-active-border) focus:ring-2 focus:ring-(--focus-ring)/40"
          placeholder="region_river_index"
        />
        {sourceLayerError ? (
          <div className="mt-1 text-[11px] text-(--btn-danger-text)">
            {sourceLayerError}
          </div>
        ) : null}

        <label
          className="mt-3 block text-[11px] font-semibold text-(--section-heading)"
          htmlFor={fileId}
        >
          Normal Texture
        </label>
        <input
          id={fileId}
          type="file"
          accept="image/*"
          onChange={(event) => onChangeFile(event.target.files?.[0] ?? null)}
          className="mt-1 block w-full cursor-pointer text-[12px] text-(--text-muted) file:mr-3 file:h-9 file:rounded-md file:border file:border-(--btn-border) file:bg-(--btn-bg) file:px-3 file:text-[13px] file:font-semibold file:text-(--text) file:transition hover:file:border-(--btn-border-hover) hover:file:bg-(--btn-hover)"
        />
        <div className="mt-1 text-[11px] text-(--text-muted)">
          {selectedFile ? `Selected: ${selectedFile.name}` : "No file selected. Default texture will be used."}
        </div>
        <div className="mt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={() => onChangeFile(null)}
            className="h-8 rounded-md border border-(--btn-border) bg-(--btn-bg) px-2.5 text-[12px] font-semibold text-(--text) transition hover:border-(--btn-border-hover) hover:bg-(--btn-hover)"
          >
            Clear
          </button>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-md border border-(--btn-border) bg-(--btn-bg) px-3 text-[13px] font-semibold text-(--text) transition hover:border-(--btn-border-hover) hover:bg-(--btn-hover)"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="h-9 rounded-md border border-(--btn-active-border) bg-(--btn-active-bg) px-3 text-[13px] font-semibold text-(--btn-active-text) shadow-(--btn-active-ring) transition hover:brightness-105"
          >
            Add Layer
          </button>
        </div>
      </div>
    </div>
  );
}
