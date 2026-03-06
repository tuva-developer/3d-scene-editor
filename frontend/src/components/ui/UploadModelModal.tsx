import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faXmark } from "@fortawesome/free-solid-svg-icons";

type UploadModelModalProps = {
  open: boolean;
  uploading: boolean;
  kind?: "MODEL" | "IMAGE";
  defaultName?: string;
  onCancel: () => void;
  onConfirm: (payload: { file: File; name: string }) => void;
};

function stripFileExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "").trim();
}

export default function UploadModelModal({
  open,
  uploading,
  kind = "MODEL",
  defaultName = "",
  onCancel,
  onConfirm,
}: UploadModelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(defaultName);
  const [nameTouched, setNameTouched] = useState(false);
  const titleId = useId();
  const fileId = useId();
  const nameId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setFile(null);
    setName(defaultName);
    setNameTouched(false);
  }, [defaultName, open]);

  const displayName = useMemo(() => {
    if (nameTouched) {
      return name;
    }
    if (file) {
      return stripFileExtension(file.name);
    }
    return name;
  }, [file, name, nameTouched]);

  if (!open) {
    return null;
  }

  const isModel = kind === "MODEL";
  const entityLabel = isModel ? "Model" : "Image";
  const acceptValue = isModel
    ? ".glb,.gltf,.obj,.fbx,.stl,.dae,.3ds,.usdz,.ifc,model/*"
    : "image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff,.svg";

  const handleConfirm = () => {
    if (!file) {
      return;
    }
    const resolvedName = (displayName || stripFileExtension(file.name) || file.name).trim();
    if (!resolvedName) {
      return;
    }
    onConfirm({ file, name: resolvedName });
  };

  return (
    <div className="fixed inset-0 z-[3600] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/35" onClick={onCancel} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] w-[min(92vw,440px)] rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 text-[var(--text)] shadow-[var(--panel-shadow)]"
      >
        <div className="mb-3 flex items-center justify-between">
          <div id={titleId} className="text-[14px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Upload {entityLabel}
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={`Close upload ${entityLabel.toLowerCase()} modal`}
            className="flex h-8 w-8 items-center justify-center rounded-md border-0 bg-transparent text-[13px] text-[var(--text)] transition hover:bg-[var(--btn-hover)]"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]" htmlFor={fileId}>
          {entityLabel} File
        </label>
        <input
          ref={fileInputRef}
          id={fileId}
          type="file"
          accept={acceptValue}
          onChange={(event) => {
            const nextFile = event.target.files?.[0] ?? null;
            setFile(nextFile);
            if (!nameTouched) {
              setName(nextFile ? stripFileExtension(nextFile.name) : defaultName);
            }
          }}
          className="mt-1 block w-full cursor-pointer text-[12px] text-[var(--text-muted)] file:mr-2 file:h-8 file:rounded-md file:border file:border-[var(--btn-border)] file:bg-[var(--btn-bg)] file:px-2.5 file:text-[12px] file:font-semibold file:text-[var(--text)] hover:file:border-[var(--btn-border-hover)] hover:file:bg-[var(--btn-hover)]"
        />

        <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]" htmlFor={nameId}>
          {entityLabel} Name
        </label>
        <input
          id={nameId}
          value={displayName}
          onChange={(event) => {
            setNameTouched(true);
            setName(event.target.value);
          }}
          className="mt-1 h-10 w-full rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] px-3 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--btn-active-border)] focus:ring-2 focus:ring-[var(--focus-ring)]/40"
          placeholder={`Enter ${entityLabel.toLowerCase()} name`}
        />

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] px-3 text-[13px] font-semibold text-[var(--text)] transition hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!file || uploading || !displayName.trim()}
            className="flex h-9 items-center gap-2 rounded-md border border-[var(--btn-active-border)] bg-[var(--btn-active-bg)] px-3 text-[13px] font-semibold text-[var(--btn-active-text)] shadow-[var(--btn-active-ring)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FontAwesomeIcon icon={faUpload} />
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
