import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCopy,
  faTrash,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { AssetDto } from "@/services/assetService";
import MyModelPicker from "@/components/ui/MyModelPicker";

type Props = {
  open: boolean;
  assets: AssetDto[];
  loading: boolean;
  deletingAssetId: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onOpenUpload: () => void;
  onDelete: (asset: AssetDto) => void;
  onCopyUrl: (asset: AssetDto) => void;
};

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ModelLibraryModal({
  open,
  assets,
  loading,
  deletingAssetId,
  onClose,
  onRefresh,
  onOpenUpload,
  onDelete,
  onCopyUrl,
}: Props) {
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
      <div className="relative z-[1] w-[min(94vw,700px)] rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 text-[var(--text)] shadow-[var(--panel-shadow)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[14px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Model Library
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

        <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-section-bg)] p-2">
          <MyModelPicker
            assets={assets}
            loading={loading}
            selectedIds={[]}
            onChangeSelectedIds={() => {}}
            onUpload={onOpenUpload}
            onRefresh={onRefresh}
            title="Models"
            emptyText="No models found."
            readOnlyList
            searchPlaceholder="Search models..."
            renderItemSubtitle={(asset) =>
              `${asset.filename} - ${formatBytes(asset.size)} - ${new Date(asset.createdAt).toLocaleString()}`
            }
            renderItemActions={(asset) => (
              <>
                <button
                  type="button"
                  onClick={() => onCopyUrl(asset)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[11px] text-[var(--text)] hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]"
                  title="Copy model URL"
                  aria-label={`Copy URL for ${asset.filename}`}
                >
                  <FontAwesomeIcon icon={faCopy} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(asset)}
                  disabled={deletingAssetId === asset.id}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500 text-[11px] text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Delete model"
                  aria-label={`Delete model ${asset.filename}`}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </>
            )}
          />
        </div>
      </div>
    </div>
  );
}
