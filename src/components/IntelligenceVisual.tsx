"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type Point = {
  x: number; y: number; angle: number; radius: number; size: number;
  speed: number; phase: number; tint: number; spark: number; scatter: number;
};

const TAU = Math.PI * 2;
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const color = (tint: number, alpha: number) =>
  tint < .67 ? `rgba(194,240,175,${alpha})` : `rgba(149,221,232,${alpha})`;

function makePoints(count: number): Point[] {
  // Repeatable composition: visual rhythm remains consistent across re-renders.
  let seed = 310728;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  return Array.from({ length: count }, () => {
    const x = rand(), y = rand();
    return {
      x, y, angle: Math.atan2(y - .5, x - .5), radius: .12 + rand() * .88,
      size: .45 + Math.pow(rand(), 4) * 2.1,
      speed: .6 + rand() * 1.3, phase: rand() * TAU,
      tint: rand(), spark: rand(), scatter: rand() * TAU,
    };
  });
}

function drawField(
  ctx: CanvasRenderingContext2D, points: Point[], width: number, height: number,
  elapsed: number, cursorX: number, cursorY: number, reduced: boolean,
) {
  ctx.clearRect(0, 0, width, height);
  const cx = width * .5;
  const cy = height * .5;
  const scale = Math.min(width, height);
  const t = reduced ? 12 : elapsed;
  const gather = ease((t - 2.2) / 3.3);
  const collapse = ease((t - 5.25) / 1.05);
  const eruption = ease((t - 6.30) / .9);
  const novaAge = t - 6.34;
  const settled = ease((t - 7.5) / 2.8);

  // Keep the background truly dark until the brief, earned burst.
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * .53);
  const intensity = .045 + gather * .07 + collapse * .10 + (1 - settled) * eruption * .13;
  halo.addColorStop(0, `rgba(177,242,166,${intensity})`);
  halo.addColorStop(.3, `rgba(68,161,150,${intensity * .26})`);
  halo.addColorStop(1, "rgba(7,15,21,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);

  // Deliberate dust -> ordered inward spiral -> brilliant nova -> quiet orbit.
  ctx.globalCompositeOperation = "lighter";
  for (const p of points) {
    const driftX = Math.sin(t * .16 * p.speed + p.phase) * .013;
    const driftY = Math.cos(t * .13 * p.speed + p.phase) * .013;
    const startX = (p.x + driftX) * width;
    const startY = (p.y + driftY) * height;

    const initialAngle = p.angle + gather * (2.8 + p.speed * .65) + t * .085;
    const ring = (.07 + p.radius * .47) * scale;
    const spiralRadius = ring * (1 - collapse * .97);
    const flowX = cx + Math.cos(initialAngle) * spiralRadius;
    const flowY = cy + Math.sin(initialAngle) * spiralRadius * .92;
    const sinkX = startX * (1 - gather) + flowX * gather;
    const sinkY = startY * (1 - gather) + flowY * gather;

    const blastRadius = scale * (.06 + eruption * (.34 + p.radius * .38));
    const burstAngle = p.scatter + p.angle * .25;
    const burstX = cx + Math.cos(burstAngle) * blastRadius;
    const burstY = cy + Math.sin(burstAngle) * blastRadius;
    // Most remnants resolve to a sparse, elegant constellation, not a repeating screensaver.
    const restAngle = p.scatter + p.angle * .4;
    const restRadius = scale * (.20 + p.radius * .37);
    const restX = cx + Math.cos(restAngle) * restRadius;
    const restY = cy + Math.sin(restAngle) * restRadius * .94;
    const postX = burstX * (1 - settled) + restX * settled;
    const postY = burstY * (1 - settled) + restY * settled;

    const px = sinkX * (1 - eruption) + postX * eruption;
    const py = sinkY * (1 - eruption) + postY * eruption;
    const disturb = (1 - collapse) * (1 - settled);
    const dx = px - cursorX, dy = py - cursorY;
    const distance2 = dx * dx + dy * dy + 3000;
    const offset = 8500 / distance2 * disturb;
    const x = px + (dx / Math.sqrt(distance2)) * offset * 12;
    const y = py + (dy / Math.sqrt(distance2)) * offset * 12;

    const bright = .25 + p.spark * .48 + Math.sin(t * 1.8 + p.phase) * .12;
    const visibility = (1 - collapse * .37) * (1 - settled * .50);
    const alpha = clamp(bright * visibility + gather * .24);
    if (x < -4 || x > width + 4 || y < -4 || y > height + 4) continue;

    if (gather > .1 && gather < 1 && p.spark > .57) {
      const vx = -(x - cx) * (.025 + gather * .04);
      const vy = -(y - cy) * (.025 + gather * .04);
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x - vx, y - vy);
      ctx.strokeStyle = color(p.tint, alpha * gather * .21);
      ctx.lineWidth = Math.max(.35, p.size * .48);
      ctx.stroke();
    }
    if (eruption > .03 && settled < .98 && p.spark > .35) {
      const trail = (1 - settled) * eruption * (8 + p.radius * 27);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - Math.cos(burstAngle) * trail, y - Math.sin(burstAngle) * trail);
      ctx.strokeStyle = color(p.tint, alpha * .38);
      ctx.lineWidth = Math.max(.45, p.size * .65);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, Math.max(.35, p.size * (1 + collapse * .55) * (1 - settled * .15)), 0, TAU);
    ctx.fillStyle = color(p.tint, alpha);
    ctx.fill();
  }

  // High-energy core: dramatic but short, with a soft physical falloff.
  if (!reduced && novaAge > -.65 && novaAge < 2.7) {
    const flash = Math.exp(-Math.pow((novaAge - .18) / .24, 2));
    const after = Math.exp(-Math.max(0, novaAge) * 1.35);
    const coreRadius = scale * (.045 + flash * .34 + after * .10);
    const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
    bloom.addColorStop(0, `rgba(255,255,240,${Math.min(1, flash * .95 + after * .8)})`);
    bloom.addColorStop(.11, `rgba(232,255,198,${Math.min(1, flash * .84 + after * .56)})`);
    bloom.addColorStop(.36, `rgba(164,239,209,${flash * .51 + after * .25})`);
    bloom.addColorStop(1, "rgba(115,198,170,0)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, width, height);

    const ringProgress = clamp(novaAge / 1.7);
    for (let i = 0; i < 2; i++) {
      const local = clamp((novaAge - i * .24) / 1.5);
      if (local <= 0 || local >= 1) continue;
      ctx.beginPath();
      ctx.ellipse(cx, cy, scale * (.035 + local * .65), scale * (.035 + local * .62), 0, 0, TAU);
      ctx.strokeStyle = `rgba(215,255,217,${.48 * (1 - local) * (1 - local)})`;
      ctx.lineWidth = 1.2 + (1 - local) * 2;
      ctx.stroke();
    }
    if (ringProgress > 0 && ringProgress < .9) {
      ctx.strokeStyle = `rgba(240,255,233,${.65 * (1 - ringProgress)})`;
      ctx.lineWidth = .7;
      ctx.beginPath();
      ctx.moveTo(cx - scale * (.15 + ringProgress * .3), cy);
      ctx.lineTo(cx + scale * (.15 + ringProgress * .3), cy);
      ctx.moveTo(cx, cy - scale * (.11 + ringProgress * .23));
      ctx.lineTo(cx, cy + scale * (.11 + ringProgress * .23));
      ctx.stroke();
    }
  }

  // Settled state retains a quiet, living center instead of looping the explosion.
  if (settled > .01 || reduced) {
    const glow = (reduced ? 1 : settled) * (.14 + .018 * Math.sin(t * 1.2));
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * .25);
    core.addColorStop(0, `rgba(197,244,176,${glow})`);
    core.addColorStop(1, "rgba(151,227,206,0)");
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.globalCompositeOperation = "source-over";
}

export default function IntelligenceVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: -10000, y: -10000 });
  const [revealed, setRevealed] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let width = 0, height = 0, raf = 0;
    let visible = !document.hidden;
    let elapsed = 0, last = 0;
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    const points = makePoints(mobile ? 450 : 1050);
    const still = reduced === true;
    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawField(context, points, width, height, elapsed, pointerRef.current.x, pointerRef.current.y, still);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    resize();
    if (still) {
      setRevealed(true);
      return () => observer.disconnect();
    }

    const frame = (now: number) => {
      if (!last) last = now;
      elapsed += Math.min((now - last) / 1000, .05);
      last = now;
      if (visible && width && height) {
        drawField(context, points, width, height, elapsed, pointerRef.current.x, pointerRef.current.y, false);
        if (elapsed >= 8.2) setRevealed((was) => was || true);
      }
      raf = requestAnimationFrame(frame);
    };
    const visibility = () => { visible = !document.hidden; last = 0; };
    document.addEventListener("visibilitychange", visibility);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [reduced]);

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  return (
    <div
      ref={wrapperRef}
      className="relative mx-auto aspect-square w-full max-w-[570px] select-none overflow-hidden"
      onPointerMove={handleMove}
      onPointerLeave={() => { pointerRef.current = { x: -10000, y: -10000 }; }}
      role="img"
      aria-label="Hundreds of points of light converge into a brilliant nova, revealing the Metanomic symbol: intelligence emerging from complexity."
    >
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        initial={false}
        animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1 : .86 }}
        transition={reduced ? { duration: 0 } : { duration: 1.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative flex h-[25%] w-[25%] items-center justify-center rounded-[30%] border border-[#d5f2c1]/25 bg-[#10231f]/75 shadow-[0_0_65px_#bdf2a438,inset_0_0_30px_#b7edab17] backdrop-blur-[2px]">
          <svg viewBox="0 0 96 96" fill="none" className="h-[69%] w-[69%]">
            <path d="M16 72V24L48 56L80 24V72" stroke="#d7f7b2" strokeWidth="9" strokeLinecap="square" strokeLinejoin="miter" />
          </svg>
        </div>
        <div className="mt-7 text-[10px] font-semibold tracking-[.33em] text-[#c6e9c2]">INTELLIGENCE, REALIZED</div>
      </motion.div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,#091019_82%)]" />
    </div>
  );
}
