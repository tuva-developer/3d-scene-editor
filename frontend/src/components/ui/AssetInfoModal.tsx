import { useEffect, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import type { AssetDto } from "@/services/assetService";

type AssetInfoModalProps = {
  asset: AssetDto;
  extraInfo: ReactNode;
  onClose: () => void;
};

export default function AssetInfoModal({ asset, extraInfo, onClose }: AssetInfoModalProps) {
  const displayName = asset.name?.trim() || asset.filename;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[5300] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[1] w-[min(90vw,580px)] overflow-hidden rounded-xl border border-(--panel-border) bg-(--panel-bg) text-(--text) shadow-(--panel-shadow)"
      >
        <div className="flex items-start justify-between px-4 py-3">
          <div className="min-w-0 pr-4">
            <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-(--text-muted)">Asset Details</div>
            <div className="mt-0.5 truncate text-[13px] font-medium text-(--text)">{displayName}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[12px] text-(--text) transition hover:bg-(--btn-hover)"
            aria-label="Close asset info"
            title="Close"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="grid gap-2 p-3 pt-0 text-[12px]">
          <div className="rounded-md border border-(--btn-border) bg-(--panel-section-bg) px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-(--text-muted)">Name</div>
            <div className="mt-1 break-words text-(--text)">{displayName}</div>
          </div>
          <div className="rounded-md border border-(--btn-border) bg-(--panel-section-bg) px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-(--text-muted)">File</div>
            <div className="mt-1 break-words text-(--text)">{asset.filename}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-(--btn-border) bg-(--panel-section-bg) px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-(--text-muted)">Type</div>
              <div className="mt-1 text-(--text)">{asset.kind}</div>
            </div>
            <div className="rounded-md border border-(--btn-border) bg-(--panel-section-bg) px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-(--text-muted)">Size</div>
              <div className="mt-1 text-(--text)">{asset.size.toLocaleString()} bytes</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-(--btn-border) bg-(--panel-section-bg) px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-(--text-muted)">Created</div>
              <div className="mt-1 break-words text-(--text)">{new Date(asset.createdAt).toLocaleString()}</div>
            </div>
            <div className="rounded-md border border-(--btn-border) bg-(--panel-section-bg) px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-(--text-muted)">Updated</div>
              <div className="mt-1 break-words text-(--text)">{new Date(asset.updatedAt).toLocaleString()}</div>
            </div>
          </div>
          {extraInfo ? (
            <div className="rounded-md border border-(--btn-border) bg-(--panel-section-bg) px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-(--text-muted)">Details</div>
              <div className="mt-1 break-words text-(--text-muted)">{extraInfo}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
