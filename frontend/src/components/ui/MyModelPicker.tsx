import { useMemo, useState, type ReactNode } from "react";
import type { AssetDto } from "@/services/assetService";

type Props = {
  assets: AssetDto[];
  loading: boolean;
  selectedIds: string[];
  onChangeSelectedIds: (ids: string[]) => void;
  onUpload?: () => void;
  onRefresh?: () => void;
  onClear?: () => void;
  title?: string;
  emptyText?: string;
  multi?: boolean;
  readOnlyList?: boolean;
  renderItemActions?: (asset: AssetDto) => ReactNode;
  renderItemSubtitle?: (asset: AssetDto) => ReactNode;
  searchPlaceholder?: string;
  className?: string;
};

export default function MyModelPicker({
  assets,
  loading,
  selectedIds,
  onChangeSelectedIds,
  onUpload,
  onRefresh,
  onClear,
  title = "Models",
  emptyText = "No models in your library.",
  multi = true,
  readOnlyList = false,
  renderItemActions,
  renderItemSubtitle,
  searchPlaceholder = "Search models...",
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
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-(--section-heading)">
          {title}
        </div>
        <div className="flex items-center gap-1.5">
          {onUpload ? (
            <button
              type="button"
              onClick={onUpload}
              className="h-7 rounded-md border border-(--btn-active-border) bg-(--btn-active-bg) px-2.5 text-[11px] font-semibold text-(--btn-active-text) transition hover:brightness-105"
            >
              Upload
            </button>
          ) : null}
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="h-7 rounded-md border border-(--btn-border) bg-(--btn-bg) px-2.5 text-[11px] text-(--text) transition hover:border-(--btn-border-hover) hover:bg-(--btn-hover)"
            >
              Refresh
            </button>
          ) : null}
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="h-7 rounded-md border border-(--btn-border) bg-(--btn-bg) px-2.5 text-[11px] text-(--text) transition hover:border-(--btn-border-hover) hover:bg-(--btn-hover)"
            >
              Clear
            </button>
          ) : null}
        </div>
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
            Loading models...
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="px-1.5 py-3 text-[11px] text-(--text-muted)">
            {emptyText}
          </div>
        ) : readOnlyList ? (
          <div className="grid gap-1">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-2 rounded px-1.5 py-1 text-[12px] hover:bg-(--btn-hover)"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-(--text)">
                    {asset.name?.trim() || asset.filename}
                  </div>
                  {renderItemSubtitle ? (
                    <div className="truncate text-[11px] text-(--text-muted)">
                      {renderItemSubtitle(asset)}
                    </div>
                  ) : null}
                </div>
                {renderItemActions ? (
                  <div className="flex items-center gap-1">
                    {renderItemActions(asset)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : multi ? (
          <div className="grid gap-1">
            {filteredAssets.map((asset) => {
              const checked = selectedIds.includes(asset.id);
              return (
                <label
                  key={asset.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[12px] hover:bg-(--btn-hover)"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      if (event.target.checked) {
                        onChangeSelectedIds([...selectedIds, asset.id]);
                        return;
                      }
                      onChangeSelectedIds(
                        selectedIds.filter((id) => id !== asset.id),
                      );
                    }}
                  />
                  <span className="truncate">
                    {asset.name?.trim() || asset.filename}
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-1">
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => onChangeSelectedIds([asset.id])}
                className={`truncate rounded px-2 py-1 text-left text-[12px] transition ${
                  selectedIds[0] === asset.id
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
