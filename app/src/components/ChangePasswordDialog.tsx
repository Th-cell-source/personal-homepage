import { useEffect, useState } from "react";
import type { AuthApi } from "../hooks/useAuth";

interface ChangePasswordDialogProps {
  open: boolean;
  auth: AuthApi;
  onClose: () => void;
  onDone: () => void;
}

/** 修改登录口令：校验当前口令 → 写新的 PBKDF2 哈希 */
export function ChangePasswordDialog({ open, auth, onClose, onDone }: ChangePasswordDialogProps) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 6) {
      setError("新口令至少 6 位");
      return;
    }
    if (next !== confirm) {
      setError("两次输入的新口令不一致");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const ok = await auth.changePassword(current, next);
      if (!ok) {
        setError("当前口令不正确");
        return;
      }
      onDone();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="change-pw-title">
      <button className="modal__backdrop" aria-label="关闭" onClick={onClose} />
      <form className="modal__panel modal__panel--narrow" onSubmit={submit}>
        <header className="modal__head">
          <div>
            <h2 id="change-pw-title">修改登录口令</h2>
            <p>新口令只保存在本机浏览器；换设备登录请用默认口令。</p>
          </div>
          <button type="button" className="modal__close" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="form form--single">
          <label className="form__row">
            <span>当前口令</span>
            <input
              type="password"
              value={current}
              autoComplete="current-password"
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label className="form__row">
            <span>
              新口令<em>至少 6 位</em>
            </span>
            <input
              type="password"
              value={next}
              autoComplete="new-password"
              onChange={(e) => setNext(e.target.value)}
            />
          </label>
          <label className="form__row">
            <span>确认新口令</span>
            <input
              type="password"
              value={confirm}
              autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
        </div>

        {error ? (
          <p className="form__error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="modal__foot">
          <span className="passcode__attempts">{auth.hasCustomPassword ? "当前使用的是自定义口令" : "当前使用的是默认口令"}</span>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? "保存中…" : "保存"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
