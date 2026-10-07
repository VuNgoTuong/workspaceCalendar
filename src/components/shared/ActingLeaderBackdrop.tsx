import React, { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
}

interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  speed: number;
}

const NODE_COUNT = 55;
const MAX_LINK_DIST = 150;
const DUST_COUNT = 80;
const FRAME_INTERVAL_MS = 1000 / 30;

export const ActingLeaderBackdrop: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let nodes: Node[] = [];
    let dust: Dust[] = [];
    let frameId = 0;
    let t = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const init = () => {
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.5 + 1,
        phase: Math.random() * Math.PI * 2,
      }));
      dust = Array.from({ length: DUST_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
        r: Math.random() * 0.9 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.015 + 0.008,
      }));
    };

    resize();
    init();

    let lastFrameTime = 0;

    const render = () => {
      t += 1;
      ctx.clearRect(0, 0, width, height);

      if (!reduceMotion) {
        for (const p of dust) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = width;
          else if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          else if (p.y > height) p.y = 0;
        }
        for (const p of nodes) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = width;
          else if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          else if (p.y > height) p.y = 0;
        }
      }

      for (const p of dust) {
        const twinkle = 0.35 + 0.35 * Math.sin(t * p.speed + p.phase);
        ctx.fillStyle = `rgba(147, 197, 253, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_LINK_DIST) {
            ctx.strokeStyle = `rgba(96, 165, 250, ${(1 - dist / MAX_LINK_DIST) * 0.7})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Cheap fake glow (a soft low-alpha ring behind the dot) instead of
      // ctx.shadowBlur, which forces a slow software-rendering path per draw.
      for (const p of nodes) {
        const twinkle = 0.75 + 0.25 * Math.sin(t * 0.02 + p.phase);
        ctx.fillStyle = `rgba(96, 165, 250, ${twinkle * 0.25})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(239, 246, 255, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      frameId = requestAnimationFrame(step);
    };

    const step = (time: number) => {
      if (time - lastFrameTime < FRAME_INTERVAL_MS) {
        frameId = requestAnimationFrame(step);
        return;
      }
      lastFrameTime = time;
      render();
    };

    frameId = requestAnimationFrame(step);

    let resizeTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimeoutId !== null) clearTimeout(resizeTimeoutId);
      resizeTimeoutId = setTimeout(() => {
        resizeTimeoutId = null;
        resize();
        init();
      }, 200);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      if (resizeTimeoutId !== null) clearTimeout(resizeTimeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#050a18]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#101c42] via-[#122451] to-[#060c1e]" />
      <div className="absolute top-1/4 left-1/4 w-[480px] h-[480px] rounded-full bg-[#3b82f6]/35 blur-[130px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[480px] h-[480px] rounded-full bg-[#6366f1]/30 blur-[140px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full bg-[#0ea5e9]/15 blur-[160px]" />
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
};

export default ActingLeaderBackdrop;
