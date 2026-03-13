import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCopy,
  faImage,
  faPen,
  faTrash,
  faXmark,
  faCube,
} from "@fortawesome/free-solid-svg-icons";
import { useMemo, useState } from "react";
import type { AssetDto } from "@/services/assetService";
import MyAssetPicker from "@/components/ui/MyAssetPicker";

type Props = {
  open: boolean;
  modelAssets: AssetDto[];
  imageAssets: AssetDto[];
  modelLoading: boolean;
  imageLoading: boolean;
  deletingAssetId: string | null;
  onClose: () => void;
  onRefresh: (kind: "MODEL" | "IMAGE") => void;
  onOpenUpload: (kind: "MODEL" | "IMAGE") => void;
  onDelete: (asset: AssetDto) => void;
  onUpdate: (asset: AssetDto) => void;
  onCopyUrl: (asset: AssetDto) => void;
};

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssetLibraryModal({
  open,
  modelAssets,
  imageAssets,
  modelLoading,
  imageLoading,
  deletingAssetId,
  onClose,
  onRefresh,
  onOpenUpload,
  onDelete,
  onUpdate,
  onCopyUrl,
}: Props) {
  const [activeKind, setActiveKind] = useState<"MODEL" | "IMAGE">("MODEL");
  const assets = useMemo(
    () => (activeKind === "MODEL" ? modelAssets : imageAssets),
    [activeKind, imageAssets, modelAssets],
  );
  const loading = activeKind === "MODEL" ? modelLoading : imageLoading;

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[3500] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-[1] h-[min(94vh,860px)] w-[min(96vw,1080px)] overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 text-[var(--text)] shadow-[var(--panel-shadow)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[14px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Asset Library
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close model modal"
            title="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[13px] text-[var(--text)] transition hover:bg-[var(--btn-hover)]"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="mb-3 grid grid-cols-2 overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[var(--btn-bg)]">
          <button
            type="button"
            className={`group relative flex h-16 flex-col items-center justify-center gap-1 text-[12px] font-semibold uppercase transition ${
              activeKind === "MODEL"
                ? "bg-[var(--btn-active-bg)] text-[var(--btn-active-text)]"
                : "bg-transparent text-[var(--text-muted)] hover:bg-[var(--btn-hover)]"
            }`}
            onClick={() => setActiveKind("MODEL")}
          >
            <FontAwesomeIcon icon={faCube} className="text-[15px]" />
            <span>Models</span>
          </button>
          <button
            type="button"
            className={`group relative flex h-16 flex-col items-center justify-center gap-1 border-l border-[var(--panel-border)] text-[12px] font-semibold uppercase transition ${
              activeKind === "IMAGE"
                ? "bg-[var(--btn-active-bg)] text-[var(--btn-active-text)]"
                : "bg-transparent text-[var(--text-muted)] hover:bg-[var(--btn-hover)]"
            }`}
            onClick={() => setActiveKind("IMAGE")}
          >
            <FontAwesomeIcon icon={faImage} className="text-[15px]" />
            <span>Images</span>
          </button>
        </div>

        <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-section-bg)] p-2">
          {activeKind === "MODEL" ? (
            <MyAssetPicker
              assets={assets}
              loading={loading}
              selectedIds={[]}
              onChangeSelectedIds={() => {}}
              onUpload={() => onOpenUpload(activeKind)}
              onRefresh={() => onRefresh(activeKind)}
              title="Models"
              emptyText="No models found."
              readOnlyList
              gridCols={6}
              listMaxHeightClass="max-h-[68vh]"
              searchPlaceholder="Search models..."
              renderItemSubtitle={(asset) =>
                `${asset.filename} - ${formatBytes(asset.size)} - ${new Date(asset.createdAt).toLocaleString()}`
              }
              renderItemActions={(asset) => (
                <>
                  <button
                    type="button"
                    onClick={() => onCopyUrl(asset)}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[var(--btn-border)] bg-[var(--panel-bg)] text-[11px] text-[var(--text)] transition hover:border-[var(--btn-active-border)]"
                    title="Copy asset URL"
                    aria-label={`Copy URL for ${asset.filename}`}
                  >
                    <FontAwesomeIcon icon={faCopy} />
                  </button>
                  {!asset.isPublic ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onUpdate(asset)}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[var(--btn-border)] bg-[var(--panel-bg)] text-[11px] text-[var(--text)] transition hover:border-[var(--btn-active-border)]"
                        title="Edit asset name"
                        aria-label={`Edit asset ${asset.filename}`}
                      >
                        <FontAwesomeIcon icon={faPen} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(asset)}
                        disabled={deletingAssetId === asset.id}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[var(--btn-danger-border)] bg-[var(--btn-danger-bg)] text-[11px] text-[var(--btn-danger-text)] transition hover:bg-[var(--btn-danger-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                        title="Delete asset"
                        aria-label={`Delete asset ${asset.filename}`}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </>
                  ) : null}
                </>
              )}
            />
          ) : (
            <MyAssetPicker
              assets={assets}
              loading={loading}
              selectedIds={[]}
              onChangeSelectedIds={() => {}}
              onUpload={() => onOpenUpload(activeKind)}
              onRefresh={() => onRefresh(activeKind)}
              title="Images"
              emptyText="No images found."
              readOnlyList
              gridCols={6}
              listMaxHeightClass="max-h-[68vh]"
              searchPlaceholder="Search images..."
              renderItemSubtitle={(asset) =>
                `${asset.filename} - ${formatBytes(asset.size)} - ${new Date(asset.createdAt).toLocaleString()}`
              }
              renderItemActions={(asset) => (
                <>
                  <button
                    type="button"
                    onClick={() => onCopyUrl(asset)}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[var(--btn-border)] bg-[var(--panel-bg)] text-[11px] text-[var(--text)] transition hover:border-[var(--btn-active-border)]"
                    title="Copy asset URL"
                    aria-label={`Copy URL for ${asset.filename}`}
                  >
                    <FontAwesomeIcon icon={faCopy} />
                  </button>
                  {!asset.isPublic ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onUpdate(asset)}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[var(--btn-border)] bg-[var(--panel-bg)] text-[11px] text-[var(--text)] transition hover:border-[var(--btn-active-border)]"
                        title="Edit asset name"
                        aria-label={`Edit asset ${asset.filename}`}
                      >
                        <FontAwesomeIcon icon={faPen} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(asset)}
                        disabled={deletingAssetId === asset.id}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[var(--btn-danger-border)] bg-[var(--btn-danger-bg)] text-[11px] text-[var(--btn-danger-text)] transition hover:bg-[var(--btn-danger-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                        title="Delete asset"
                        aria-label={`Delete asset ${asset.filename}`}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </>
                  ) : null}
                </>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
