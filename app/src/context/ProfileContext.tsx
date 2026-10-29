import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface ProfileState {
  name: string;
  role: string;
  school: string;
  major: string;
  grade: string;
  studentId: string;
  teacher: string;
  email: string;
}

export const DEFAULT_PROFILE: ProfileState = {
  name: "田昊",
  role: "全栈开发 / 嵌入式 / 大模型应用",
  school: "大连民族大学",
  major: "物联网工程",
  grade: "2024 级",
  studentId: "2023250718",
  teacher: "兰艳",
  email: "",
};

const STORAGE_KEY = "tianhao:profile:v1";

const FIELDS: Array<keyof ProfileState> = [
  "name",
  "role",
  "school",
  "major",
  "grade",
  "studentId",
  "teacher",
  "email",
];

function sanitize(raw: unknown): ProfileState {
  const next = { ...DEFAULT_PROFILE };
  if (!raw || typeof raw !== "object") return next;
  const source = raw as Record<string, unknown>;
  FIELDS.forEach((key) => {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      next[key] = value.trim().slice(0, 40);
    }
  });
  return next;
}

function readStorage(): ProfileState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return sanitize(JSON.parse(raw));
  } catch {
    return DEFAULT_PROFILE;
  }
}

interface ProfileContextValue {
  profile: ProfileState;
  isCustom: boolean;
  save: (next: ProfileState) => void;
  reset: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileState>(readStorage);

  useEffect(() => {
    try {
      const isDefault = FIELDS.every((key) => profile[key] === DEFAULT_PROFILE[key]);
      if (isDefault) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      }
    } catch {
      // 隐私模式 / 存储已满：忽略即可，页面仍然可用
    }
  }, [profile]);

  const save = useCallback((next: ProfileState) => {
    setProfile(sanitize(next));
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 忽略
    }
    setProfile(DEFAULT_PROFILE);
  }, []);

  const value = useMemo<ProfileContextValue>(() => {
    const isCustom = FIELDS.some((key) => profile[key] !== DEFAULT_PROFILE[key]);
    return { profile, isCustom, save, reset };
  }, [profile, save, reset]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile 必须在 ProfileProvider 内使用");
  return ctx;
}
