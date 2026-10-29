import { useEffect, useRef, useState } from "react";
import type { AdminApi } from "../hooks/useAdmin";

interface PasscodeDialogProps {
  open: boolean;
  admin: AdminApi;
  onClose: () => void;
  onUnlocked: () => void;
}

/** 管理口令弹窗：第一次是"设置口令"，之后是"输入口令解锁" */
export function PasscodeDialog({ open, admin, onClose, onUnlocked }: PasscodeDialogProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setConfirm("");
    setError("");
    const timer = window.setTimeout(() => firstRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const isSetup = !admin.hasPasscode;
  const wait = Math.max(0, Math.ceil((admin.lockedUntil - Date.now()) / 1000));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wait > 0) {
      setError(`尝试次数过多，请 ${wait} 秒后再试`);
      return;
    }
    if (password.length < 4) {
      setError("口令至少 4 位");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (isSetup) {
        if (password !== confirm) {
          setError("两次输入不一致");
          return;
        }
        await admin.setPasscode(password);
        onUnlocked();
        onClose();
      } else {
        const ok = await admin.verify(password);
        if (ok) {
          onUnlocked();
          onClose();
        } else {
          admin.noteFailure();
          setError("口令不正确");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="passcode-title">
      <button className="modal__backdrop" aria-label="关闭" onClick={onClose} />
      <form className="modal__panel modal__panel--narrow" onSubmit={submit}>
        <header className="modal__head">
          <div>
            <h2 id="passcode-title">{isSetup ? "设置管理口令" : "输入管理口令"}</h2>
            <p>
              {isSetup
                ? "编辑个人信息前先设一个口令。口令只保存在本机浏览器，用于防止别人随手修改。"
                : "个人信息受口令保护，输入口令后才能编辑。"}
            </p>
          </div>
          <button type="button" className="modal__close" aria-label="关闭" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="form form--single">
          <label className="form__row">
            <span>
              管理口令
              {isSetup ? <em>至少 4 位，建议 6 位以上</em> : null}
            </span>
            <input
              ref={firstRef}
              type="password"
              value={password}
              autoComplete={isSetup ? "new-password" : "current-password"}
              placeholder="请输入口令"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {isSetup ? (
            <label className="form__row">
              <span>再输一次</span>
              <input
                type="password"
                value={confirm}
                autoComplete="new-password"
                placeholder="确认口令"
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
          ) : null}
        </div>

        {error ? (
          <p className="form__error" role="alert">
            {error}
          </p>
        ) : null}

        <p className="passcode__hint">
          说明：这是浏览器端的口令校验（PBKDF2-SHA256，15 万次迭代 + 随机盐），能挡住随手修改；
          它不等同于服务端登录，懂开发者工具的人仍可绕过——真正的身份认证在智语 Chat 里（bcrypt + 令牌）。
        </p>

        <footer className="modal__foot">
          <span className="passcode__attempts">
            {!isSetup && admin.failures > 0 ? `已失败 ${admin.failures} 次，连续 5 次将锁定 30 秒` : ""}
          </span>
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy || wait > 0}>
              {busy ? "校验中…" : isSetup ? "设置并进入" : "解锁"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
