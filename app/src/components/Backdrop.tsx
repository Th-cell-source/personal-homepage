import { useRef } from "react";
import { useParticles } from "../hooks/useParticles";
import { useScrollProgress } from "../hooks/useScrollFx";

/** 背景层：极光渐变 + 网格 + 粒子画布 + 顶部滚动进度 */
export function Backdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progress = useScrollProgress();
  useParticles(canvasRef);

  return (
    <>
      <div className="bg-aurora" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />
      <canvas id="particles" ref={canvasRef} aria-hidden="true" />
      <div className="progress" style={{ width: `${progress}%` }} aria-hidden="true" />
    </>
  );
}
