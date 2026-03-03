import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock, faRightToBracket } from "@fortawesome/free-solid-svg-icons";

interface Props {
  open: boolean;
  onLogin: (username: string, password: string) => boolean;
  onCancel: () => void;
}

export default function LoginModal({ open, onLogin, onCancel }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const ok = onLogin(username, password);
    setLoading(false);
    if (!ok) {
      setError("Tên đăng nhập hoặc mật khẩu không đúng.");
    } else {
      setUsername("");
      setPassword("");
    }
  };

  const overlayClassName =
    "fixed inset-0 z-[2100] flex items-center justify-center bg-gradient-to-b from-black/50 via-black/40 to-black/60 backdrop-blur-md";
  const panelClassName =
    "w-[320px] rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 text-[var(--text)] shadow-[var(--panel-shadow)]";
  const titleClassName =
    "text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]";
  const subtitleClassName = "mt-0.5 text-[11px] text-[var(--text-muted)]";
  const inputWrapperClassName = "relative";
  const inputIconClassName =
    "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[11px]";
  const inputClassName =
    "h-9 w-full rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] pl-7 pr-3 text-[12px] text-[var(--text)] outline-none transition focus:border-[var(--btn-active-border)] focus:ring-2 focus:ring-[color:var(--focus-ring)]/30";
  const labelClassName =
    "text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]";
  const buttonBaseClassName =
    "flex h-9 items-center justify-center rounded-md border border-[var(--btn-border)] bg-[var(--btn-bg)] px-3 text-[12px] text-[var(--text)] transition hover:border-[var(--btn-border-hover)] hover:bg-[var(--btn-hover)]";
  const buttonPrimaryClassName =
    "flex-1 border-[var(--btn-active-border)] bg-[var(--btn-active-bg)] text-[var(--btn-active-text)] shadow-[var(--btn-active-ring)] hover:opacity-90";

  return (
    <div className={overlayClassName} role="dialog" aria-modal="true" aria-label="Đăng nhập">
      <div className={panelClassName}>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--btn-active-border)] bg-[var(--btn-active-bg)] text-[var(--btn-active-text)]">
            <FontAwesomeIcon icon={faRightToBracket} />
          </span>
          <div>
            <div className={titleClassName}>Editor Login</div>
            <div className={subtitleClassName}>Đăng nhập để sử dụng chức năng chỉnh sửa</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <label className="grid gap-1">
            <span className={labelClassName}>Tên đăng nhập</span>
            <div className={inputWrapperClassName}>
              <span className={inputIconClassName}>
                <FontAwesomeIcon icon={faUser} />
              </span>
              <input
                className={inputClassName}
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
          </label>

          <label className="grid gap-1">
            <span className={labelClassName}>Mật khẩu</span>
            <div className={inputWrapperClassName}>
              <span className={inputIconClassName}>
                <FontAwesomeIcon icon={faLock} />
              </span>
              <input
                className={inputClassName}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </label>

          {error ? (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-500">
              {error}
            </div>
          ) : null}

          <div className="mt-1 flex gap-2">
            <button
              type="button"
              className={buttonBaseClassName}
              onClick={() => {
                setUsername("");
                setPassword("");
                setError(null);
                onCancel();
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              className={`${buttonBaseClassName} ${buttonPrimaryClassName}`}
              disabled={loading}
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
