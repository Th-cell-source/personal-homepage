import { useEffect, useRef, useState } from "react";

/** 顶部滚动进度（0~100） */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const top = window.scrollY || document.documentElement.scrollTop;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? (top / max) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return progress;
}

/** 当前区块高亮：取屏幕中线附近进入视口的区块 */
export function useSectionSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? "");
  const idsRef = useRef(ids);
  idsRef.current = ids;

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    idsRef.current.forEach((id) => {
      const el = document.querySelector(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return active;
}
