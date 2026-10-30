import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultSite, type SiteData } from "../data/site";

const STORAGE_KEY = "tianhao:site:v1";

/** 只做浅层结构校验：缺字段用默认值补，类型不对就退回默认 */
function sanitize(raw: unknown): SiteData {
  if (!raw || typeof raw !== "object") return defaultSite;
  const saved = raw as Partial<SiteData>;
  const merged: SiteData = {
    profile: { ...defaultSite.profile, ...(saved.profile ?? {}) },
    hero: { ...defaultSite.hero, ...(saved.hero ?? {}) },
    stats: Array.isArray(saved.stats) && saved.stats.length ? saved.stats : defaultSite.stats,
    facts: Array.isArray(saved.facts) && saved.facts.length ? saved.facts : defaultSite.facts,
    about: Array.isArray(saved.about) && saved.about.length ? saved.about : defaultSite.about,
    skills: Array.isArray(saved.skills) && saved.skills.length ? saved.skills : defaultSite.skills,
    projects: Array.isArray(saved.projects) && saved.projects.length ? saved.projects : defaultSite.projects,
    journey: Array.isArray(saved.journey) && saved.journey.length ? saved.journey : defaultSite.journey,
    deliverables:
      Array.isArray(saved.deliverables) && saved.deliverables.length ? saved.deliverables : defaultSite.deliverables,
    locals: Array.isArray(saved.locals) && saved.locals.length ? saved.locals : defaultSite.locals,
    heads: { ...defaultSite.heads, ...(saved.heads ?? {}) },
    contact: { ...defaultSite.contact, ...(saved.contact ?? {}) },
  };
  return merged;
}

function readStorage(): SiteData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSite;
    return sanitize(JSON.parse(raw));
  } catch {
    return defaultSite;
  }
}

export interface SiteApi {
  site: SiteData;
  /** 局部更新某个顶层字段 */
  patch: <K extends keyof SiteData>(key: K, value: SiteData[K]) => void;
  reset: () => void;
  exportJson: () => string;
  importJson: (text: string) => boolean;
  isCustom: boolean;
}

const SiteContext = createContext<SiteApi | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [site, setSite] = useState<SiteData>(readStorage);

  useEffect(() => {
    try {
      const isDefault = JSON.stringify(site) === JSON.stringify(defaultSite);
      if (isDefault) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(site));
      }
    } catch {
      // 隐私模式或存储已满：忽略，页面仍可用
    }
  }, [site]);

  const patch = useCallback(<K extends keyof SiteData>(key: K, value: SiteData[K]) => {
    setSite((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 忽略
    }
    setSite(defaultSite);
  }, []);

  const exportJson = useCallback(() => JSON.stringify(site, null, 2), [site]);

  const importJson = useCallback((text: string) => {
    try {
      const parsed = JSON.parse(text);
      setSite(sanitize(parsed));
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = useMemo<SiteApi>(
    () => ({ site, patch, reset, exportJson, importJson, isCustom: JSON.stringify(site) !== JSON.stringify(defaultSite) }),
    [site, patch, reset, exportJson, importJson],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteApi {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite 必须在 SiteProvider 内使用");
  return ctx;
}
