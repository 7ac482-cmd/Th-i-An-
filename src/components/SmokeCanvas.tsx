import { useEffect, useRef } from 'react';

interface SmokeCanvasProps {
  variant: 'intro' | 'main';
}

interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  color: string;
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
  isButterfly: boolean;
}

export function SmokeCanvas({ variant }: SmokeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const puffCount = variant === 'intro' ? 14 : 18;
    const puffs: SmokePuff[] = Array.from({ length: puffCount }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.35) * 0.28,
      vy: -0.15 - Math.random() * 0.25,
      radius: Math.max(width, height) * (0.16 + Math.random() * 0.18),
      alpha: variant === 'intro' ? 0.08 + (i % 3) * 0.03 : 0.05 + (i % 3) * 0.02,
      phase: Math.random() * Math.PI * 2,
      color:
        variant === 'intro'
          ? i % 2 === 0
            ? 'rgba(158, 27, 20,'
            : 'rgba(18, 4, 4,'
          : i % 3 === 0
            ? 'rgba(110, 16, 14,'
            : 'rgba(28, 12, 14,',
    }));

    const emberCount = variant === 'intro' ? 22 : 16;
    const embers: Ember[] = Array.from({ length: emberCount }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.25 - Math.random() * 0.4,
      size: 1.4 + Math.random() * 2.4,
      alpha: 0.2 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      isButterfly: i % 5 === 0,
    }));

    let time = 0;

    const render = () => {
      time += 0.012;
      ctx.clearRect(0, 0, width, height);

      // Drifting volumetric smoke puffs
      for (const p of puffs) {
        if (!prefersReduced) {
          p.x += p.vx + Math.sin(time + p.phase) * 0.18;
          p.y += p.vy;
          if (p.y < -p.radius) {
            p.y = height + p.radius * 0.8;
            p.x = Math.random() * width;
          }
          if (p.x < -p.radius) p.x = width + p.radius * 0.6;
          if (p.x > width + p.radius) p.x = -p.radius * 0.6;
        }

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, `${p.color} ${p.alpha})`);
        grad.addColorStop(0.55, `${p.color} ${p.alpha * 0.4})`);
        grad.addColorStop(1, `${p.color} 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Gentle drifting ash & dark butterfly silhouettes
      for (const e of embers) {
        if (!prefersReduced) {
          e.x += e.vx + Math.sin(time * 1.4 + e.phase) * 0.35;
          e.y += e.vy;
          if (e.y < -20) {
            e.y = height + 20;
            e.x = Math.random() * width;
          }
          if (e.x < -20) e.x = width + 20;
          if (e.x > width + 20) e.x = -20;
        }

        if (e.isButterfly) {
          const wingFlap = Math.abs(Math.sin(time * 2.5 + e.phase));
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(Math.sin(time * 0.8 + e.phase) * 0.25);
          ctx.fillStyle =
            variant === 'intro'
              ? `rgba(8, 2, 2, ${0.55})`
              : `rgba(140, 22, 18, ${0.32})`;
          // Left wing
          ctx.beginPath();
          ctx.ellipse(-3 * wingFlap - 1, 0, 4.5 * wingFlap + 1, 3, -0.4, 0, Math.PI * 2);
          ctx.fill();
          // Right wing
          ctx.beginPath();
          ctx.ellipse(3 * wingFlap + 1, 0, 4.5 * wingFlap + 1, 3, 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = `rgba(205, 52, 38, ${e.alpha * (0.6 + 0.4 * Math.sin(time * 2 + e.phase))})`;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!prefersReduced) {
        animId = window.requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animId) window.cancelAnimationFrame(animId);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
