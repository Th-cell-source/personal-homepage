import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "article" | "header" | "li";
  ariaHidden?: boolean;
}

/** 进入视口时加 .in 触发进场动画；不支持 IntersectionObserver 的浏览器直接显示 */
export function Reveal({ children, delay = 0, className = "", as = "div", ariaHidden }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShown(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Tag = as as "div";
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${shown ? "in" : ""} ${className}`.trim()}
      style={{ "--d": `${delay}ms` } as CSSProperties}
      aria-hidden={ariaHidden}
    >
      {children}
    </Tag>
  );
}
