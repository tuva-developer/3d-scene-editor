import { useEffect, useMemo, useState } from "react";
import type { SceneDto } from "@/services/sceneService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faXmark } from "@fortawesome/free-solid-svg-icons";

type Mode = "save" | "load";

type Props = {
  open: boolean;
  mode: Mode;
  scenes: SceneDto[];
  loading: boolean;
  submitting: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onCreateScene: (name: string) => void;
  onUpdateScene: (sceneId: string, name?: string) => void;
  onConfirmLoad: (sceneId: string) => void;
  onDeleteScene: (sceneId: string) => void;
};

export default function SceneLibraryModal({
  open,
  mode,
  scenes,
  loading,
  submitting,
  onClose,
  onRefresh,
  onCreateScene,
  onUpdateScene,
  onConfirmLoad,
  onDeleteScene,
}: Props) {
  const [name, setName] = useState("");
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (mode === "load") {
      setSelectedSceneId(scenes[0]?.id ?? null);
      return;
    }
    setSelectedSceneId(null);
  }, [mode, open, scenes]);

  const normalizedName = name.trim().toLowerCase();
  const nameConflict = useMemo(
    () => scenes.find((scene) => scene.name.trim().toLowerCase() === normalizedName) ?? null,
    [normalizedName, scenes]
  );
  const selectedScene = useMemo(
    () => scenes.find((scene) => scene.id === selectedSceneId) ?? null,
    [scenes, selectedSceneId]
  );

  if (!open) {
    return null;
  }

  const title = mode === "save" ? "Save Scene" : "Load Scene";
  const submitLabel = submitting ? "Processing..." : "Load";

  return (
    <div className="fixed inset-0 z-[3500] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} aria-hidden="true" />
      <div className="relative z-[1] w-[min(92vw,520px)] rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 text-[var(--text)] shadow-[var(--panel-shadow)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[14px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scene modal"
            title="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-[13px] text-[var(--text)] transition hover:bg-[var(--btn-hover)]"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {mode === "save" ? (
          <div className="mb-3 grid gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Scene Name
            </label>
            <input
              className="h-10 rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] px-3 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--btn-active-border)] focus:ring-2 focus:ring-[color:var(--focus-ring)]/30"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Scene name"
            />
            {nameConflict ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-400">
                Scene name already exists: <span className="font-semibold">{nameConflict.name}</span>. Use update to
                modify an existing scene.
              </div>
            ) : null}
            {selectedScene ? (
              <div className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-300">
                Update target: <span className="font-semibold">{selectedScene.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSceneId(null)}
                  className="ml-2 underline hover:opacity-80"
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-section-bg)]">
          <div className="flex items-center justify-between border-b border-[var(--divider)] px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Scene List
            </div>
            <button
              type="button"
              onClick={onRefresh}
              className="h-7 rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] px-2.5 text-[11px] text-[var(--text)] hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]"
            >
              Refresh
            </button>
          </div>
          <div className="max-h-[300px] overflow-y-auto px-2 py-2">
            {loading ? (
              <div className="px-2 py-5 text-center text-[12px] text-[var(--text-muted)]">Loading scenes...</div>
            ) : scenes.length === 0 ? (
              <div className="px-2 py-5 text-center text-[12px] text-[var(--text-muted)]">No scenes found.</div>
            ) : (
              <div className="space-y-1">
                {scenes.map((scene) => {
                  const selected = selectedSceneId === scene.id;
                  return (
                    <div
                      key={scene.id}
                      className={`flex items-center gap-2 rounded-md border px-2 py-2 transition ${
                        selected
                          ? "border-[var(--btn-active-border)] bg-[var(--btn-active-bg)]/15"
                          : "border-transparent hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSceneId(scene.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="truncate text-[13px] font-semibold text-[var(--text)]">{scene.name}</div>
                        <div className="truncate text-[11px] text-[var(--text-muted)]">{scene.id}</div>
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => onDeleteScene(scene.id)}
                        aria-label={`Delete scene ${scene.name}`}
                        title="Delete scene"
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-9 rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] px-3 text-[12px] text-[var(--text)] hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          {mode === "save" ? (
            <>
              <button
                type="button"
                disabled={submitting || loading || name.trim().length === 0}
                onClick={() => onCreateScene(name.trim())}
                className="h-9 rounded-md border border-[var(--btn-active-border)] bg-[var(--btn-active-bg)] px-3 text-[12px] font-semibold text-[var(--btn-active-text)] shadow-[var(--btn-active-ring)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Processing..." : "Save New"}
              </button>
              <button
                type="button"
                disabled={submitting || loading || !selectedSceneId}
                onClick={() => {
                  if (!selectedSceneId) {
                    return;
                  }
                  onUpdateScene(selectedSceneId, name.trim() || undefined);
                }}
                className="h-9 rounded-md border border-sky-500/40 bg-sky-500/15 px-3 text-[12px] font-semibold text-sky-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Processing..." : "Update Selected"}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={submitting || loading || !selectedSceneId}
              onClick={() => {
                if (selectedSceneId) {
                  onConfirmLoad(selectedSceneId);
                }
              }}
              className="h-9 rounded-md border border-[var(--btn-active-border)] bg-[var(--btn-active-bg)] px-3 text-[12px] font-semibold text-[var(--btn-active-text)] shadow-[var(--btn-active-ring)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
