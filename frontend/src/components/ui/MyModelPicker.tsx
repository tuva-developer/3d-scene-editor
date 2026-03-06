import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AssetDto } from "@/services/assetService";
import { apiRequest } from "@/services/apiClient";

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
  gridCols?: 2 | 3;
  listMaxHeightClass?: string;
};

export default function MyModelPicker({
  assets,
  loading,
  selectedIds,
  onChangeSelectedIds,
  onUpload,
  onRefresh,
  onClear,
  title = "Model in your library",
  emptyText = "No models in your library.",
  multi = true,
  readOnlyList = false,
  renderItemActions,
  renderItemSubtitle,
  searchPlaceholder = "Search models...",
  className = "",
  gridCols = 2,
  listMaxHeightClass = "max-h-[280px]",
}: Props) {
  const [search, setSearch] = useState("");
  const [privateImagePreviewUrls, setPrivateImagePreviewUrls] = useState<Record<string, string>>({});
  const privateImagePreviewRef = useRef<Record<string, string>>({});

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

  useEffect(() => {
    const revokeUrls = (map: Record<string, string>) => {
      Object.values(map).forEach((url) => URL.revokeObjectURL(url));
    };

    let cancelled = false;
    revokeUrls(privateImagePreviewRef.current);
    privateImagePreviewRef.current = {};
    setPrivateImagePreviewUrls({});

    const privateImages = assets.filter(
      (asset) => asset.kind === "IMAGE" && !asset.isPublic,
    );
    if (privateImages.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    const load = async () => {
      const entries = await Promise.all(
        privateImages.map(async (asset) => {
          try {
            const bytes = await apiRequest<ArrayBuffer>(`/assets/${asset.id}/content`);
            const blob = new Blob([bytes], {
              type: asset.mimeType || "application/octet-stream",
            });
            const url = URL.createObjectURL(blob);
            return [asset.id, url] as const;
          } catch {
            return null;
          }
        }),
      );
      const nextMap: Record<string, string> = {};
      for (const entry of entries) {
        if (!entry) {
          continue;
        }
        const [id, url] = entry;
        nextMap[id] = url;
      }

      if (cancelled) {
        revokeUrls(nextMap);
        return;
      }

      privateImagePreviewRef.current = nextMap;
      setPrivateImagePreviewUrls(nextMap);
    };

    void load();

    return () => {
      cancelled = true;
      revokeUrls(privateImagePreviewRef.current);
      privateImagePreviewRef.current = {};
    };
  }, [assets]);
  const myAssets = useMemo(
    () => filteredAssets.filter((asset) => !asset.isPublic),
    [filteredAssets],
  );
  const publicAssets = useMemo(
    () => filteredAssets.filter((asset) => !!asset.isPublic),
    [filteredAssets],
  );
  const hasData = myAssets.length > 0 || publicAssets.length > 0;

  const toggleMulti = (assetId: string, checked: boolean) => {
    if (checked) {
      onChangeSelectedIds([...selectedIds, assetId]);
      return;
    }
    onChangeSelectedIds(selectedIds.filter((id) => id !== assetId));
  };

  const renderAssetCard = (asset: AssetDto) => {
    const checked = selectedIds.includes(asset.id);
    const selected = selectedIds[0] === asset.id;
    const displayName = asset.name?.trim() || asset.filename;
    const ext = asset.filename.includes(".")
      ? asset.filename.split(".").pop()?.toUpperCase() || "3D"
      : "3D";
    return (
      <div
        key={asset.id}
        className={`rounded-md border p-1.5 transition ${
          multi ? "cursor-default" : "cursor-pointer"
        } ${
          (multi && checked) || (!multi && selected)
            ? "border-(--btn-active-border) bg-(--btn-active-bg)/12"
            : "border-(--btn-border) bg-(--panel-raised) hover:border-(--btn-border-hover)"
        }`}
        onClick={() => {
          if (readOnlyList) {
            return;
          }
          if (multi) {
            toggleMulti(asset.id, !checked);
            return;
          }
          onChangeSelectedIds([asset.id]);
        }}
      >
        <div className="relative h-24 overflow-hidden rounded border border-(--btn-border) bg-(--btn-bg)">
          {asset.kind === "IMAGE" ? (
            (() => {
              const src = asset.isPublic ? asset.url : privateImagePreviewUrls[asset.id];
              return src ? (
                <img
                  src={src}
                  alt={displayName}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-[11px] font-semibold tracking-[0.08em] text-(--text-muted)">
                    IMG
                  </span>
                </div>
              );
            })()
          ) : asset.isPublic ? (
            <img
              src="/thumnail.png"
              alt={displayName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-[11px] font-semibold tracking-[0.08em] text-(--text-muted)">
                {ext}
              </span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/65 to-transparent px-1.5 py-1">
            <div className="truncate text-[11px] font-medium text-white">
              {displayName}
            </div>
            {renderItemSubtitle ? (
              <div className="truncate text-[10px] text-white/80">
                {renderItemSubtitle(asset)}
              </div>
            ) : null}
          </div>
        </div>
        {readOnlyList && renderItemActions ? (
          <div className="mt-1.5 flex items-center justify-end gap-1">
            {renderItemActions(asset)}
          </div>
        ) : null}
      </div>
    );
  };

  const renderGroup = (heading: string, items: AssetDto[]) => {
    if (items.length === 0) {
      return null;
    }
    return (
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
          {heading} ({items.length})
        </div>
        <div className={`grid ${gridCols === 3 ? "grid-cols-3" : "grid-cols-2"} gap-1.5`}>
          {items.map(renderAssetCard)}
        </div>
      </div>
    );
  };

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
      <div
        className={`mt-1 ${listMaxHeightClass} overflow-y-auto rounded-md border border-(--btn-border) bg-(--btn-bg) p-2`}
      >
        {loading ? (
          <div className="px-1.5 py-3 text-[11px] text-(--text-muted)">
            Loading models...
          </div>
        ) : !hasData ? (
          <div className="px-1.5 py-3 text-[11px] text-(--text-muted)">
            {emptyText}
          </div>
        ) : (
          <div className="grid gap-2">
            {renderGroup("My Assets", myAssets)}
            {renderGroup("Public Assets", publicAssets)}
          </div>
        )}
      </div>
    </div>
  );
}
