import { useEffect, useRef, useState } from "react";
import type { AuthApi } from "../hooks/useAuth";
import { useFailureGuard } from "../hooks/useAuth";

interface LoginPageProps {
  auth: AuthApi;
}

/** 全站登录页：不登录看不到个人主页内容 */
export function LoginPage({ auth }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const guard = useFailureGuard();
  const userRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => userRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, []);

  const wait = Math.max(0, Math.ceil((guard.lockedUntil - Date.now()) / 1000));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wait > 0) {
      setError(`尝试次数过多，请 ${wait} 秒后再试`);
      return;
    }
    if (!username.trim() || !password) {
      setError("请输入账号和口令");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const ok = await auth.login(username, password, remember);
      if (!ok) {
        guard.noteFailure();
        setError("账号或口令不正确");
        setPassword("");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login__bg" aria-hidden="true" />
      <main className="login__card">
        <div className="login__brand">
          <span className="brand__mark">田</span>
          <div>
            <b>田昊 · 个人主页</b>
            <span>TIAN HAO · PORTFOLIO</span>
          </div>
        </div>

        <h1>登录后查看</h1>
        <p className="login__lead">这是需要身份验证的页面，输入账号与口令后才能进入。</p>

        <form className="login__form" onSubmit={submit}>
          <label className="login__row">
            <span>账号</span>
            <input
              ref={userRef}
              type="text"
              value={username}
              autoComplete="username"
              placeholder="请输入账号"
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          <label className="login__row">
            <span>口令</span>
            <div className="login__pw">
              <input
                type={show ? "text" : "password"}
                value={password}
                autoComplete="current-password"
                placeholder="请输入口令"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="login__eye" onClick={() => setShow((v) => !v)}>
                {show ? "隐藏" : "显示"}
              </button>
            </div>
          </label>

          <label className="login__remember">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            记住登录状态（7 天免登录，公共电脑请勿勾选）
          </label>

          {error ? (
            <p className="login__error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="btn btn--primary login__submit" type="submit" disabled={busy || wait > 0}>
            {busy ? "验证中…" : wait > 0 ? `锁定 ${wait}s` : "登录"}
          </button>
        </form>

        <p className="login__note">
          说明：本站为课程作业的静态站点，没有后端服务器。账号口令在本机用 PBKDF2-SHA256（15 万次迭代 + 随机盐）
          校验，口令本身不会上传；登录状态只保存在你的浏览器里。
        </p>
      </main>
    </div>
  );
}
