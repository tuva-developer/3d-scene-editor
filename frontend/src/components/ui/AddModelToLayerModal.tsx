import { useEffect, useId, useState } from "react";
import type { AssetDto } from "@/services/assetService";
import MyAssetPicker from "@/components/ui/MyAssetPicker";

type Props = {
  open: boolean;
  title: string;
  assets: AssetDto[];
  loading: boolean;
  onRefresh: () => void;
  onCancel: () => void;
  onConfirm: (assetId: string, coords: { lat: number; lng: number } | null) => void;
};

export default function AddModelToLayerModal({
  open,
  title,
  assets,
  loading,
  onRefresh,
  onCancel,
  onConfirm,
}: Props) {
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [latValue, setLatValue] = useState("");
  const [lngValue, setLngValue] = useState("");
  const titleId = useId();
  const latId = useId();
  const lngId = useId();

  useEffect(() => {
    if (!open) return;
    setSelectedAssetId((prev) => prev || assets[0]?.id || "");
    setLatValue("");
    setLngValue("");
  }, [assets, open]);

  if (!open) {
    return null;
  }

  const handleConfirm = () => {
    if (!selectedAssetId) {
      return;
    }
    const lat = Number.parseFloat(latValue.trim());
    const lng = Number.parseFloat(lngValue.trim());
    const coords = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    onConfirm(selectedAssetId, coords);
  };

  return (
    <div className="fixed inset-0 z-4000 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" onClick={onCancel} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-1 max-h-[92vh] w-[min(94vw,760px)] overflow-hidden rounded-xl border border-(--panel-border) bg-(--panel-bg) p-4 text-(--text) shadow-(--panel-shadow)"
      >
        <div id={titleId} className="text-[15px] font-semibold">
          {title}
        </div>
        <div className="mt-1 text-[12px] text-(--text-muted)">
          Choose a model from your library.
        </div>

        <div className="mt-3 rounded-lg border border-(--panel-border) bg-(--panel-section-bg)">
          <div className="px-3 py-2">
            <MyAssetPicker
              assets={assets}
              loading={loading}
              selectedIds={selectedAssetId ? [selectedAssetId] : []}
              onChangeSelectedIds={(ids) => setSelectedAssetId(ids[0] ?? "")}
              onRefresh={onRefresh}
              multi={false}
              gridCols={4}
              listMaxHeightClass="max-h-[40vh]"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-(--section-heading)" htmlFor={latId}>
              Latitude
            </label>
            <input
              id={latId}
              type="number"
              inputMode="decimal"
              value={latValue}
              onChange={(event) => setLatValue(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-(--btn-border) bg-(--btn-bg) px-3 text-[13px] font-medium text-(--text) outline-none transition focus:border-(--btn-active-border) focus:ring-2 focus:ring-(--focus-ring)/40"
              placeholder="10.8231"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-(--section-heading)" htmlFor={lngId}>
              Longitude
            </label>
            <input
              id={lngId}
              type="number"
              inputMode="decimal"
              value={lngValue}
              onChange={(event) => setLngValue(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-(--btn-border) bg-(--btn-bg) px-3 text-[13px] font-medium text-(--text) outline-none transition focus:border-(--btn-active-border) focus:ring-2 focus:ring-(--focus-ring)/40"
              placeholder="106.6297"
            />
          </div>
        </div>
        <div className="mt-1 text-[11px] text-(--text-muted)">
          Optional. Leave empty to place at current map center.
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
            disabled={!selectedAssetId}
            className="h-9 rounded-md border border-(--btn-active-border) bg-(--btn-active-bg) px-3 text-[13px] font-semibold text-(--btn-active-text) shadow-(--btn-active-ring) transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add Model
          </button>
        </div>
      </div>
    </div>
  );
}
