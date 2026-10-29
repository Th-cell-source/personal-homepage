import { useEffect, useRef } from "react";

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  warm: boolean;
  phase: number;
}

/**
 * Canvas 粒子背景：
 * - 节点数量按屏幕面积自适应，上限 72，低端机不吃 CPU
 * - 连线按距离分三档，分桶后只调用 3 次 stroke
 * - DPR 上限 2，避免 3x 屏画 3 倍像素
 * - 页面隐藏时暂停；prefers-reduced-motion 时只画静态一帧
 */
export function useParticles(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let points: Point[] = [];
    let last = 0;
    const pointer = { x: -9999, y: -9999, on: false };
    const LINK = 128;
    const PTR = 160;

    const build = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(72, Math.max(22, (width * height) / 26000)));
      points = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: 0.9 + Math.random() * 1.6,
        warm: i % 3 !== 0,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const buckets: number[][][] = [[], [], []];
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            const bucket = d < 44 ? 0 : d < 88 ? 1 : 2;
            buckets[bucket].push([points[i].x, points[i].y, points[j].x, points[j].y]);
          }
        }
      }
      const alphas = [0.3, 0.17, 0.075];
      ctx.lineWidth = 1;
      buckets.forEach((segments, index) => {
        if (!segments.length) return;
        ctx.strokeStyle = `rgba(0, 240, 255, ${alphas[index]})`;
        ctx.beginPath();
        segments.forEach(([x1, y1, x2, y2]) => {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        });
        ctx.stroke();
      });

      ctx.globalCompositeOperation = "lighter";
      points.forEach((p) => {
        const rad = p.r * (0.75 + 0.25 * Math.sin(p.phase));
        const tint = p.warm ? "255, 45, 149" : "0, 240, 255";
        ctx.beginPath();
        ctx.fillStyle = `rgba(${tint}, 0.16)`;
        ctx.arc(p.x, p.y, rad * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = `rgba(${tint}, 0.9)`;
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      });

      if (pointer.on) {
        ctx.strokeStyle = "rgba(0, 240, 255, 0.2)";
        ctx.beginPath();
        points.forEach((p) => {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          if (Math.sqrt(dx * dx + dy * dy) < PTR) {
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pointer.x, pointer.y);
          }
        });
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const tick = (now: number) => {
      const dt = Math.min(48, now - last) / 16.67;
      last = now;
      points.forEach((p) => {
        if (pointer.on) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < PTR && d > 1) {
            const f = (1 - d / PTR) * 0.5 * dt;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.994;
        p.vy *= 0.994;
        p.vx += (Math.random() - 0.5) * 0.004;
        p.vy += (Math.random() - 0.5) * 0.004;
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;
        p.phase += 0.014 * dt;
      });
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };

    const onPointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.on = true;
    };
    const onPointerLeave = () => {
      pointer.on = false;
    };
    const onResize = () => {
      build();
      if (reduce) draw();
    };
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafRef.current);
      } else if (!reduce) {
        last = performance.now();
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    build();
    if (reduce) {
      draw();
    } else {
      last = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    }

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [canvasRef]);
}
