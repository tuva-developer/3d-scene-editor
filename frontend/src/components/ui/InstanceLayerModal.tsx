import { useEffect, useId, useRef, useState } from "react";
import type { AssetDto } from "@/services/assetService";
import MyModelPicker from "@/components/ui/MyModelPicker";

type InstanceLayerModalProps = {
  open: boolean;
  nameValue: string;
  onChangeName: (value: string) => void;
  defaultTileUrl: string;
  defaultSourceLayer: string;
  modelAssets: AssetDto[];
  selectedModelAssetIds: string[];
  onChangeSelectedModelAssetIds: (ids: string[]) => void;
  onConfirm: (data: {
    name: string;
    tileUrl: string;
    sourceLayer: string;
    modelAssetIds: string[];
  }) => void;
  onCancel: () => void;
};

export default function InstanceLayerModal({
  open,
  nameValue,
  onChangeName,
  defaultTileUrl,
  defaultSourceLayer,
  modelAssets,
  selectedModelAssetIds,
  onChangeSelectedModelAssetIds,
  onConfirm,
  onCancel,
}: InstanceLayerModalProps) {
  const [tileUrl, setTileUrl] = useState(defaultTileUrl);
  const [sourceLayer, setSourceLayer] = useState(defaultSourceLayer);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const nameId = useId();
  const tileId = useId();
  const sourceId = useId();
  const modelLibraryId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    setTileUrl(defaultTileUrl);
    setSourceLayer(defaultSourceLayer);
  }, [defaultSourceLayer, defaultTileUrl, open]);

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
    const cleanedTileUrl = tileUrl.trim();
    const cleanedSourceLayer = sourceLayer.trim();
    const hasLibraryModels = selectedModelAssetIds.length > 0;
    if (!cleanedTileUrl || !hasLibraryModels) {
      return;
    }
    onConfirm({
      name: nameValue.trim(),
      tileUrl: cleanedTileUrl,
      sourceLayer: cleanedSourceLayer || defaultSourceLayer,
      modelAssetIds: selectedModelAssetIds,
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
        className="relative z-1 w-[min(92vw,420px)] rounded-xl border border-(--panel-border) bg-(--panel-bg) p-4 text-(--text) shadow-(--panel-shadow)"
      >
        <div id={titleId} className="text-[15px] font-semibold">
          Add Custom Instance Layer
        </div>
        <div className="mt-1 text-[12px] text-(--text-muted)">
          Configure a custom instance layer and models.
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
          value={nameValue}
          onChange={(event) => onChangeName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleConfirm();
            }
          }}
          className="mt-1 h-10 w-full rounded-md border border-(--btn-border) bg-(--btn-bg) px-3 text-[13px] font-medium text-(--text) outline-none transition focus:border-(--btn-active-border) focus:ring-2 focus:ring-(--focus-ring)/40"
          placeholder="Custom Layer"
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
          onChange={(event) => setTileUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleConfirm();
            }
          }}
          className="mt-1 h-10 w-full rounded-md border border-(--btn-border) bg-(--btn-bg) px-3 text-[13px] font-medium text-(--text) outline-none transition focus:border-(--btn-active-border) focus:ring-2 focus:ring-(--focus-ring)/40"
          placeholder="https://example.com/{z}/{x}/{y}"
        />

        <label
          className="mt-3 block text-[11px] font-semibold text-(--section-heading)"
          htmlFor={sourceId}
        >
          Source Layer
        </label>
        <input
          id={sourceId}
          value={sourceLayer}
          onChange={(event) => setSourceLayer(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleConfirm();
            }
          }}
          className="mt-1 h-10 w-full rounded-md border border-(--btn-border) bg-(--btn-bg) px-3 text-[13px] font-medium text-(--text) outline-none transition focus:border-(--btn-active-border) focus:ring-2 focus:ring-(--focus-ring)/40"
          placeholder="trees"
        />

        <div id={modelLibraryId} className="mt-3">
          <MyModelPicker
            assets={modelAssets}
            loading={false}
            selectedIds={selectedModelAssetIds}
            onChangeSelectedIds={onChangeSelectedModelAssetIds}
            onClear={() => onChangeSelectedModelAssetIds([])}
          />
        </div>
        <div className="mt-1 text-[11px] text-(--text-muted)">
          {selectedModelAssetIds.length > 0
            ? `${selectedModelAssetIds.length} model(s) selected from library.`
            : "Select model(s) from your library."}
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
