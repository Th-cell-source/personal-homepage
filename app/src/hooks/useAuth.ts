import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * 登录凭据：默认账号在构建时就以 PBKDF2 哈希形式写死，
 * 源码里没有明文口令；用户登录后可改密码，改后的哈希存本机 localStorage。
 */
const DEFAULT_ACCOUNT = {
  username: "tianhao",
  salt: "4cm3r2QNWvOBakpzorOC2g==",
  hash: "sp4dX4+0d19xlux2NqLREaSuet7eoHea33FJ5Ni1CCQ=",
  iter: 150000,
};

const OVERRIDE_KEY = "tianhao:auth:v1";
const SESSION_KEY = "tianhao:auth:session";
const REMEMBER_KEY = "tianhao:auth:remember";
const REMEMBER_DAYS = 7;

/** 记住登录：存过期时间戳，过期即失效 */
function readRemember(): boolean {
  try {
    const raw = window.localStorage.getItem(REMEMBER_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { exp?: number };
    if (!parsed.exp || parsed.exp < Date.now()) {
      window.localStorage.removeItem(REMEMBER_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export interface Credential {
  salt: string;
  hash: string;
  iter: number;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return window.btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  const binary = window.atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await window.crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await window.crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

function readOverride(): Credential | null {
  try {
    const raw = window.localStorage.getItem(OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Credential>;
    if (!parsed.salt || !parsed.hash || !parsed.iter) return null;
    return { salt: parsed.salt, hash: parsed.hash, iter: Number(parsed.iter) };
  } catch {
    return null;
  }
}

function currentCredential(): Credential {
  return readOverride() ?? { salt: DEFAULT_ACCOUNT.salt, hash: DEFAULT_ACCOUNT.hash, iter: DEFAULT_ACCOUNT.iter };
}

export interface AuthApi {
  /** 已登录 */
  authed: boolean;
  username: string;
  remember: boolean;
  login: (username: string, password: string, remember: boolean) => Promise<boolean>;
  logout: () => void;
  changePassword: (current: string, next: string) => Promise<boolean>;
  failures: number;
  lockedUntil: number;
  hasCustomPassword: boolean;
}

export function useAuth(): AuthApi {
  const [authed, setAuthed] = useState<boolean>(() => {
    try {
      return window.sessionStorage.getItem(SESSION_KEY) === "1" || readRemember();
    } catch {
      return false;
    }
  });
  const [remember, setRemember] = useState<boolean>(() => readRemember());
  const [failures, setFailures] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [hasCustomPassword, setHasCustomPassword] = useState<boolean>(() => Boolean(readOverride()));

  useEffect(() => {
    if (authed) {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } else {
      window.sessionStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(REMEMBER_KEY);
    }
  }, [authed]);

  const login = useCallback(async (username: string, password: string, rememberMe: boolean) => {
    const cred = currentCredential();
    const hash = await derive(password, fromBase64(cred.salt), cred.iter);
    const userOk = username.trim().toLowerCase() === DEFAULT_ACCOUNT.username;
    if (!userOk || hash !== cred.hash) return false;
    setAuthed(true);
    setRemember(rememberMe);
    if (rememberMe) {
      const exp = Date.now() + REMEMBER_DAYS * 24 * 60 * 60 * 1000;
      window.localStorage.setItem(REMEMBER_KEY, JSON.stringify({ exp }));
    } else {
      window.localStorage.removeItem(REMEMBER_KEY);
    }
    setFailures(0);
    setLockedUntil(0);
    return true;
  }, []);

  const logout = useCallback(() => {
    setAuthed(false);
    setRemember(false);
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(REMEMBER_KEY);
    } catch {
      // 忽略
    }
  }, []);

  const changePassword = useCallback(async (current: string, next: string) => {
    const cred = currentCredential();
    const currentHash = await derive(current, fromBase64(cred.salt), cred.iter);
    if (currentHash !== cred.hash) return false;
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const hash = await derive(next, salt, cred.iter);
    window.localStorage.setItem(
      OVERRIDE_KEY,
      JSON.stringify({ salt: toBase64(salt), hash, iter: cred.iter }),
    );
    setHasCustomPassword(true);
    return true;
  }, []);

  return useMemo(
    () => ({
      authed,
      username: DEFAULT_ACCOUNT.username,
      remember,
      login,
      logout,
      changePassword,
      failures,
      lockedUntil,
      hasCustomPassword,
      // 失败计数由登录页自己维护，这里透传占位
      ...({} as Record<string, never>),
    }),
    [authed, remember, login, logout, changePassword, failures, lockedUntil, hasCustomPassword],
  );
}

/** 供登录页记录失败次数用 */
export function useFailureGuard() {
  const [failures, setFailures] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const noteFailure = useCallback(() => {
    setFailures((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setLockedUntil(Date.now() + 30_000);
        return 0;
      }
      return next;
    });
  }, []);
  return { failures, lockedUntil, noteFailure, reset: () => setFailures(0) };
}
