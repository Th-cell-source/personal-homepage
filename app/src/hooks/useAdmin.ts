import { useCallback, useEffect, useMemo, useState } from "react";

const STORE_KEY = "tianhao:admin:v1";
const SESSION_KEY = "tianhao:admin:unlocked";
const ITERATIONS = 150000;

interface PasscodeRecord {
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
  // 新版 TypeScript 把 Uint8Array 的 buffer 推断成 ArrayBufferLike，这里显式收窄成 BufferSource
  const bits = await window.crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

function readRecord(): PasscodeRecord | null {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PasscodeRecord>;
    if (!parsed.salt || !parsed.hash || !parsed.iter) return null;
    return { salt: parsed.salt, hash: parsed.hash, iter: Number(parsed.iter) };
  } catch {
    return null;
  }
}

export interface AdminApi {
  /** 是否已经设置过管理口令 */
  hasPasscode: boolean;
  /** 本次会话是否已解锁（存 sessionStorage，刷新仍有效、关标签页失效） */
  unlocked: boolean;
  setPasscode: (password: string) => Promise<void>;
  verify: (password: string) => Promise<boolean>;
  lock: () => void;
  clearPasscode: () => void;
  /** 连续失败次数（用于 5 次后临时锁定） */
  failures: number;
  lockedUntil: number;
  noteFailure: () => void;
}

/**
 * 管理口令：纯前端 PBKDF2-SHA256（150,000 次迭代 + 随机盐）。
 * 注意这是"防误改"级别，不是服务端鉴权——前端校验总能被开发者工具绕过。
 */
export function useAdmin(): AdminApi {
  const [record, setRecord] = useState<PasscodeRecord | null>(() => readRecord());
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [failures, setFailures] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  useEffect(() => {
    try {
      if (unlocked) window.sessionStorage.setItem(SESSION_KEY, "1");
      else window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // 忽略
    }
  }, [unlocked]);

  const setPasscode = useCallback(async (password: string) => {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const hash = await derive(password, salt, ITERATIONS);
    const next = { salt: toBase64(salt), hash, iter: ITERATIONS };
    window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
    setRecord(next);
    setUnlocked(true);
    setFailures(0);
    setLockedUntil(0);
  }, []);

  const verify = useCallback(
    async (password: string) => {
      const current = record ?? readRecord();
      if (!current) return false;
      const hash = await derive(password, fromBase64(current.salt), current.iter);
      if (hash === current.hash) {
        setUnlocked(true);
        setFailures(0);
        setLockedUntil(0);
        return true;
      }
      return false;
    },
    [record],
  );

  const lock = useCallback(() => setUnlocked(false), []);

  const clearPasscode = useCallback(() => {
    window.localStorage.removeItem(STORE_KEY);
    setRecord(null);
    setUnlocked(false);
  }, []);

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

  return useMemo(
    () => ({
      hasPasscode: Boolean(record),
      unlocked,
      setPasscode,
      verify,
      lock,
      clearPasscode,
      failures,
      lockedUntil,
      noteFailure,
    }),
    [record, unlocked, setPasscode, verify, lock, clearPasscode, failures, lockedUntil, noteFailure],
  );
}
