import { useMemo, useState } from "react";
import type { AssetDto } from "@/services/assetService";

type Props = {
  assets: AssetDto[];
  loading: boolean;
  selectedId: string | null;
  onChangeSelectedId: (id: string | null) => void;
  title?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  className?: string;
};

export default function MyWaterImagePicker({
  assets,
  loading,
  selectedId,
  onChangeSelectedId,
  title = "Texture from your library",
  emptyText = "No images in your library.",
  searchPlaceholder = "Search images...",
  className = "",
}: Props) {
  const [search, setSearch] = useState("");
  const filteredAssets = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return assets;
    }
    return assets.filter((asset) => {
      const displayName = (asset.name?.trim() || asset.filename).toLowerCase();
      return (
        displayName.includes(keyword) ||
        asset.filename.toLowerCase().includes(keyword)
      );
    });
  }, [assets, search]);

  return (
    <div className={className}>
      <div className="text-[11px] font-semibold text-(--section-heading)">
        {title}
      </div>
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="mt-1 h-8 w-full rounded-md border border-(--btn-border) bg-(--btn-bg) px-2.5 text-[12px] text-(--text) outline-none transition focus:border-(--btn-active-border) focus:ring-2 focus:ring-(--focus-ring)/40"
        placeholder={searchPlaceholder}
      />
      <div className="mt-1 max-h-[160px] overflow-y-auto rounded-md border border-(--btn-border) bg-(--btn-bg) p-2">
        {loading ? (
          <div className="px-1.5 py-3 text-[11px] text-(--text-muted)">
            Loading images...
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="px-1.5 py-3 text-[11px] text-(--text-muted)">
            {emptyText}
          </div>
        ) : (
          <div className="grid gap-1">
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => onChangeSelectedId(asset.id)}
                className={`truncate rounded px-2 py-1 text-left text-[12px] transition ${
                  selectedId === asset.id
                    ? "bg-(--btn-active-bg)/20 text-(--text)"
                    : "text-(--text) hover:bg-(--btn-hover)"
                }`}
              >
                {asset.name?.trim() || asset.filename}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
