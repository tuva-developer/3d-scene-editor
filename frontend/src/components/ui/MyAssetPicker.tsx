import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faExclamation } from "@fortawesome/free-solid-svg-icons";
import type { AssetDto } from "@/services/assetService";
import { apiRequest } from "@/services/apiClient";
import { captureModelThumbnail } from "@/services/modelThumbnail";
import ModelPreviewModal from "@/components/ui/ModelPreviewModal";
import AssetInfoModal from "@/components/ui/AssetInfoModal";

export type AssetPickerProps = {
  assets: AssetDto[];
  loading: boolean;
  selectedIds: string[];
  onChangeSelectedIds: (ids: string[]) => void;
  onUpload?: () => void;
  onRefresh?: () => void;
  onClear?: () => void;
  title?: string;
  emptyText?: string;
  loadingText?: string;
  multi?: boolean;
  readOnlyList?: boolean;
  renderItemActions?: (asset: AssetDto) => ReactNode;
  renderItemSubtitle?: (asset: AssetDto) => ReactNode;
  searchPlaceholder?: string;
  className?: string;
  gridCols?: 2 | 3 | 4 | 5 | 6;
  listMaxHeightClass?: string;
};

export default function MyAssetPicker({
  assets,
  loading,
  selectedIds,
  onChangeSelectedIds,
  onUpload,
  onRefresh,
  onClear,
  title = "Assets",
  emptyText = "No assets in your library.",
  loadingText = "Loading assets...",
  multi = true,
  readOnlyList = false,
  renderItemActions,
  renderItemSubtitle,
  searchPlaceholder = "Search assets...",
  className = "",
  gridCols = 2,
  listMaxHeightClass = "max-h-[280px]",
}: AssetPickerProps) {
  const [search, setSearch] = useState("");
  const [viewingAsset, setViewingAsset] = useState<AssetDto | null>(null);
  const [infoAsset, setInfoAsset] = useState<AssetDto | null>(null);
  const [privatePreviewUrls, setPrivatePreviewUrls] = useState<Record<string, string>>({});
  const privatePreviewRef = useRef<Record<string, string>>({});
  const [thumbnailLoadFailed, setThumbnailLoadFailed] = useState<Record<string, boolean>>({});
  const [generatedModelPreviewUrls, setGeneratedModelPreviewUrls] = useState<Record<string, string>>({});
  const generatedModelPreviewRef = useRef<Record<string, string>>({});
  const modelCaptureLoadingRef = useRef<Set<string>>(new Set());
  const modelCaptureFailedRef = useRef<Set<string>>(new Set());
  const toolbarBtnBase =
    "h-8 rounded-md border px-2.5 text-[11px] font-semibold transition outline-none focus:ring-2 focus:ring-(--focus-ring)/40";

  const filteredAssets = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return assets;
    }
    return assets.filter((asset) => {
      const displayName = (asset.name?.trim() || asset.filename).toLowerCase();
      return displayName.includes(keyword) || asset.filename.toLowerCase().includes(keyword);
    });
  }, [assets, search]);

  useEffect(() => {
    const revokeUrls = (map: Record<string, string>) => {
      Object.values(map).forEach((url) => URL.revokeObjectURL(url));
    };

    let cancelled = false;
    revokeUrls(privatePreviewRef.current);
    privatePreviewRef.current = {};
    setPrivatePreviewUrls({});

    const previewTargets = assets.filter(
      (asset) =>
        !asset.isPublic &&
        (asset.kind === "IMAGE" || (asset.kind === "MODEL" && !!asset.thumbnailUrl)),
    );
    if (previewTargets.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    const load = async () => {
      const entries = await Promise.all(
        previewTargets.map(async (asset) => {
          try {
            const path = asset.kind === "IMAGE" ? `/assets/${asset.id}/content` : `/assets/${asset.id}/thumbnail`;
            const bytes = await apiRequest<ArrayBuffer>(path);
            const blobType =
              asset.kind === "MODEL" ? "image/webp" : asset.mimeType || "application/octet-stream";
            const blob = new Blob([bytes], { type: blobType });
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

      privatePreviewRef.current = nextMap;
      setPrivatePreviewUrls(nextMap);
    };

    void load();

    return () => {
      cancelled = true;
      revokeUrls(privatePreviewRef.current);
      privatePreviewRef.current = {};
    };
  }, [assets]);

  useEffect(() => {
    setThumbnailLoadFailed({});
  }, [assets]);

  useEffect(() => {
    return () => {
      Object.values(generatedModelPreviewRef.current).forEach((url) => URL.revokeObjectURL(url));
      generatedModelPreviewRef.current = {};
    };
  }, []);

  useEffect(() => {
    const keepIds = new Set(assets.map((asset) => asset.id));
    const current = generatedModelPreviewRef.current;
    const next: Record<string, string> = {};
    for (const [id, url] of Object.entries(current)) {
      if (keepIds.has(id)) {
        next[id] = url;
      } else {
        URL.revokeObjectURL(url);
      }
    }
    generatedModelPreviewRef.current = next;
    setGeneratedModelPreviewUrls(next);
  }, [assets]);

  useEffect(() => {
    const targets = assets.filter(
      (asset) =>
        asset.kind === "MODEL" &&
        !generatedModelPreviewRef.current[asset.id] &&
        !modelCaptureFailedRef.current.has(asset.id) &&
        (!asset.thumbnailUrl || thumbnailLoadFailed[asset.id]),
    );
    if (targets.length === 0) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      const batch = targets.slice(0, 8);
      for (const asset of batch) {
        if (cancelled) {
          return;
        }
        if (modelCaptureLoadingRef.current.has(asset.id)) {
          continue;
        }
        modelCaptureLoadingRef.current.add(asset.id);
        try {
          const contentPath = asset.isPublic && asset.url
            ? asset.url.replace(/^\/api/, "")
            : `/assets/${asset.id}/content`;
          const bytes = await apiRequest<ArrayBuffer>(contentPath);
          const file = new File([bytes], asset.filename, {
            type: asset.mimeType || "application/octet-stream",
          });
          const thumbnailBlob = await captureModelThumbnail(file);
          if (!thumbnailBlob) {
            modelCaptureFailedRef.current.add(asset.id);
            continue;
          }
          const url = URL.createObjectURL(thumbnailBlob);
          const previous = generatedModelPreviewRef.current[asset.id];
          if (previous) {
            URL.revokeObjectURL(previous);
          }
          generatedModelPreviewRef.current = {
            ...generatedModelPreviewRef.current,
            [asset.id]: url,
          };
          if (!cancelled) {
            setGeneratedModelPreviewUrls(generatedModelPreviewRef.current);
          }
        } catch {
          modelCaptureFailedRef.current.add(asset.id);
        } finally {
          modelCaptureLoadingRef.current.delete(asset.id);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [assets, thumbnailLoadFailed]);

  const myAssets = useMemo(() => filteredAssets.filter((asset) => !asset.isPublic), [filteredAssets]);
  const publicAssets = useMemo(() => filteredAssets.filter((asset) => !!asset.isPublic), [filteredAssets]);
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
    const ext = asset.filename.includes(".") ? asset.filename.split(".").pop()?.toUpperCase() || "3D" : "3D";
    const modelGeneratedSrc = generatedModelPreviewUrls[asset.id];
    const modelStoredSrc = asset.isPublic ? asset.thumbnailUrl : privatePreviewUrls[asset.id] || asset.thumbnailUrl;
    const canViewModel = asset.kind === "MODEL";
    return (
      <div
        key={asset.id}
        className={`rounded-md p-1.5 transition ${multi ? "cursor-default" : "cursor-pointer"} ${
          (multi && checked) || (!multi && selected)
            ? "bg-sky-500/20 ring-1 ring-sky-400/50"
            : "bg-(--panel-raised) hover:bg-(--btn-hover)/40"
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
        <div className="relative aspect-square w-full overflow-hidden rounded border border-(--btn-border) bg-(--btn-bg)">
          {asset.kind === "IMAGE" ? (
            (() => {
              const src = asset.isPublic ? asset.url : privatePreviewUrls[asset.id];
              return src ? (
                <img src={src} alt={displayName} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-[11px] font-semibold tracking-[0.08em] text-(--text-muted)">IMG</span>
                </div>
              );
            })()
          ) : modelStoredSrc && !thumbnailLoadFailed[asset.id] ? (
            <img
              src={modelStoredSrc}
              alt={displayName}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => {
                setThumbnailLoadFailed((prev) => ({ ...prev, [asset.id]: true }));
              }}
            />
          ) : modelGeneratedSrc ? (
            <img src={modelGeneratedSrc} alt={displayName} className="h-full w-full object-cover" loading="lazy" />
          ) : asset.isPublic ? (
            <img src="/thumnail.png" alt={displayName} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-[11px] font-semibold tracking-[0.08em] text-(--text-muted)">{ext}</span>
            </div>
          )}
          <div className="pointer-events-none absolute left-1.5 right-8 top-1.5">
            <div className="inline-block max-w-full truncate rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-[1px]">
              {displayName}
            </div>
          </div>
          {renderItemSubtitle ? (
            <button
              type="button"
              className="absolute right-1.5 top-1.5 z-[2] flex h-5 w-5 items-center justify-center rounded-full border border-white/55 bg-black/45 text-[10px] text-white transition hover:bg-black/65"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setInfoAsset(asset);
              }}
              title="View asset info"
              aria-label={`View info for ${displayName}`}
            >
              <FontAwesomeIcon icon={faExclamation} />
            </button>
          ) : null}
          {canViewModel || (readOnlyList && renderItemActions) ? (
            <div className="absolute bottom-1.5 right-1.5 z-[1] flex items-center gap-0.5">
              {canViewModel ? (
                <button
                  type="button"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-(--btn-border) bg-(--panel-bg) text-[11px] text-(--text) transition hover:border-(--btn-active-border)"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setViewingAsset(asset);
                  }}
                  title="View model in 3D"
                  aria-label={`View 3D model ${displayName}`}
                >
                  <FontAwesomeIcon icon={faEye} />
                </button>
              ) : null}
              {readOnlyList && renderItemActions ? renderItemActions(asset) : null}
            </div>
          ) : null}
        </div>
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
        <div
          className={`grid ${
            gridCols === 6
              ? "grid-cols-6"
              : gridCols === 5
              ? "grid-cols-5"
              : gridCols === 4
                ? "grid-cols-4"
                : gridCols === 3
                  ? "grid-cols-3"
                  : "grid-cols-2"
          } gap-1.5`}
        >
          {items.map(renderAssetCard)}
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-(--section-heading)">{title}</div>
        <div className="flex items-center gap-1.5">
          {onUpload ? (
            <button
              type="button"
              onClick={onUpload}
              className={`${toolbarBtnBase} border-(--btn-active-border) bg-(--btn-active-bg) text-(--btn-active-text)`}
            >
              Upload
            </button>
          ) : null}
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className={`${toolbarBtnBase} border-(--btn-border) bg-(--btn-bg) text-(--text) hover:border-(--btn-border-hover) hover:bg-(--btn-hover)`}
            >
              Refresh
            </button>
          ) : null}
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className={`${toolbarBtnBase} border-amber-300/60 bg-amber-500/12 text-amber-100 hover:border-amber-300 hover:bg-amber-500/20`}
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
      <div className={`mt-1 ${listMaxHeightClass} overflow-y-auto rounded-md border border-(--btn-border) bg-(--btn-bg) p-2`}>
        {loading ? (
          <div className="px-1.5 py-3 text-[11px] text-(--text-muted)">{loadingText}</div>
        ) : !hasData ? (
          <div className="px-1.5 py-3 text-[11px] text-(--text-muted)">{emptyText}</div>
        ) : (
          <div className="grid gap-2">
            {renderGroup("Public Assets", publicAssets)}
            {renderGroup("My Assets", myAssets)}
          </div>
        )}
      </div>
      {viewingAsset ? <ModelPreviewModal asset={viewingAsset} onClose={() => setViewingAsset(null)} /> : null}
      {infoAsset ? (
        <AssetInfoModal
          asset={infoAsset}
          extraInfo={renderItemSubtitle ? renderItemSubtitle(infoAsset) : null}
          onClose={() => setInfoAsset(null)}
        />
      ) : null}
    </div>
  );
}
