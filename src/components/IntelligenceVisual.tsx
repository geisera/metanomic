"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

type Particle = {
  x: number;
  y: number;
  angle: number;
  radius: number;
  size: number;
  speed: number;
  phase: number;
  tint: number;
  offset: number;
};

const TAU = Math.PI * 2;
const CYCLE = 18;
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, f: number) => a + (b - a) * f;

function particles(count: number, seed: number): Particle[] {
  let state = seed;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
  return Array.from({ length: count }, () => ({
    x: random(), y: random(),
    angle: random() * TAU, radius: .12 + random() * .88,
    size: .35 + Math.pow(random(), 4) * 2.05,
    speed: .55 + random() * 1.5,
    phase: random() * TAU, tint: random(), offset: random() * TAU
  }));
}

function draw(
  ctx: CanvasRenderingContext2D, ambient: Particle[], event: Particle[],
  w: number, h: number, seconds: number, mx: number, my: number, still: boolean
) {
  ctx.clearRect(0, 0, w, h);
  const scale = Math.min(w, h);
  const cx = w * (w < 700 ? .52 : .67) + Math.sin(seconds * .065) * scale * .023;
  const cy = h * .46 + Math.cos(seconds * .075) * scale * .026;
  const phase = still ? 2 : seconds % CYCLE;
  const gather = still ? 0 : ease((phase - 2.0) / 5.7);
  const crush = still ? 0 : ease((phase - 7.4) / 1.5);
  const blast = still ? 0 : ease((phase - 8.9) / 1.15);
  const fade = still ? 0 : ease((phase - 12.2) / 3.4);
  const reset = still ? 1 : 1 - ease((phase - 16.0) / 1.7);
  const heat = gather * (1 - blast) + blast * (1 - fade) * .32;

  // A diffuse atmosphere reaching to the edges of the viewport.
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * .82);
  halo.addColorStop(0, `rgba(136,228,176,${.035 + heat * .12})`);
  halo.addColorStop(.42, `rgba(78,171,183,${.026 + heat * .035})`);
  halo.addColorStop(1, "rgba(7,15,21,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = "lighter";
  // A permanent backdrop of drifting stars: motion never stops, even between novae.
  for (const p of ambient) {
    const x = (((p.x + seconds * .0017 * p.speed + Math.sin(seconds * .17 + p.phase) * .008) % 1) + 1) % 1 * w;
    const y = (((p.y + seconds * .0011 * p.speed + Math.cos(seconds * .15 + p.phase) * .009) % 1) + 1) % 1 * h;
    const dx = x - mx, dy = y - my;
    const distance = Math.hypot(dx, dy);
    const repulse = still || distance >= 115 ? 0 : (1 - distance / 115) ** 2 * 17;
    const px = x + (dx / (distance || 1)) * repulse;
    const py = y + (dy / (distance || 1)) * repulse;
    const alpha = .16 + .19 * (.5 + .5 * Math.sin(seconds * (1 + p.speed * .32) + p.phase));
    ctx.beginPath();
    ctx.arc(px, py, p.size, 0, TAU);
    ctx.fillStyle = p.tint > .73 ? `rgba(148,216,226,${alpha})` : `rgba(194,236,187,${alpha})`;
    ctx.fill();
  }

  // A separate cohort repeatedly gathers, ignites, and disperses.
  for (const p of event) {
    const ax = (p.x * 1.3 - .15) * w + Math.sin(seconds * .27 + p.phase) * 10;
    const ay = (p.y * 1.3 - .15) * h + Math.cos(seconds * .21 + p.phase) * 12;
    const angle = p.angle + phase * (.11 + p.speed * .07);
    const orbit = scale * (.07 + p.radius * .60) * (1 - crush * .985);
    const sx = cx + Math.cos(angle) * orbit;
    const sy = cy + Math.sin(angle) * orbit * .83;
    const inX = mix(ax, sx, gather);
    const inY = mix(ay, sy, gather);
    const outAngle = p.offset + p.angle * .31;
    const outRadius = scale * (.04 + blast * (.5 + p.radius * .74));
    const outX = cx + Math.cos(outAngle) * outRadius;
    const outY = cy + Math.sin(outAngle) * outRadius;
    const x = mix(inX, outX, blast);
    const y = mix(inY, outY, blast);
    const opacity = (.17 + p.speed * .23 + gather * .24 + blast * .25) * (1 - fade) * reset;

    if (x < -35 || y < -35 || x > w + 35 || y > h + 35 || opacity < .008) continue;
    const tint = p.tint > .68 ? "153,224,237" : "208,252,180";
    if (gather > .05 && blast < .05 && p.size > .7) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (x - cx) * .035 * gather, y + (y - cy) * .035 * gather);
      ctx.strokeStyle = `rgba(${tint},${opacity * gather * .33})`;
      ctx.lineWidth = Math.max(.3, p.size * .48);
      ctx.stroke();
    }
    if (blast > .01 && fade < 1 && p.size > .65) {
      const length = 19 * blast * (1 - fade) * p.speed;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - Math.cos(outAngle) * length, y - Math.sin(outAngle) * length);
      ctx.strokeStyle = `rgba(${tint},${opacity * .43})`;
      ctx.lineWidth = p.size * .67;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, p.size * (1 + crush * .65), 0, TAU);
    ctx.fillStyle = `rgba(${tint},${clamp(opacity)})`;
    ctx.fill();
  }

  // Recurring white-hot core and two expanding shockwaves.
  if (!still && phase > 8.4 && phase < 12.8) {
    const age = phase - 9.0;
    const flash = Math.exp(-Math.pow((age - .23) / .31, 2));
    const after = Math.exp(-Math.max(0, age) * 1.08);
    const reach = scale * (.075 + .36 * flash + .12 * after);
    const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach);
    bloom.addColorStop(0, `rgba(255,255,244,${Math.min(1, flash + after * .65)})`);
    bloom.addColorStop(.12, `rgba(229,255,201,${Math.min(1, flash * .84 + after * .4)})`);
    bloom.addColorStop(.36, `rgba(163,237,220,${flash * .44 + after * .15})`);
    bloom.addColorStop(1, "rgba(117,205,195,0)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, w, h);

    for (let ring = 0; ring < 2; ring++) {
      const progress = (age - ring * .24) / 1.8;
      if (progress <= 0 || progress >= 1) continue;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * (.035 + progress * .85), 0, TAU);
      ctx.lineWidth = 1 + (1 - progress) * 2.5;
      ctx.strokeStyle = `rgba(221,255,231,${.52 * (1 - progress) ** 2})`;
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

export default function IntelligenceVisual() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: -10000, y: -10000 });
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d", { alpha: true });
    if (!element || !ctx) return;
    const still = reduced === true;
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    const backdrop = particles(mobile ? 280 : 750, 98113);
    const wave = particles(mobile ? 420 : 950, 78533);
    let w = 0, h = 0, frameId = 0, last = 0, elapsed = 0;
    let visible = !document.hidden;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(w * dpr);
      element.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, backdrop, wave, w, h, elapsed, pointer.current.x, pointer.current.y, still);
    };
    const onPointer = (event: PointerEvent) => { pointer.current.x = event.clientX; pointer.current.y = event.clientY; };
    const onPointerOut = () => { pointer.current = { x: -10000, y: -10000 }; };
    const onVisibility = () => { visible = !document.hidden; last = 0; };
    const tick = (now: number) => {
      if (!visible) { frameId = 0; return; }
      if (!last) last = now;
      elapsed += Math.min((now - last) / 1000, .05);
      last = now;
      draw(ctx, backdrop, wave, w, h, elapsed, pointer.current.x, pointer.current.y, false);
      frameId = requestAnimationFrame(tick);
    };
    const onVisibilityResume = () => {
      onVisibility();
      if (visible && !still && !frameId) frameId = requestAnimationFrame(tick);
      if (!visible && frameId) { cancelAnimationFrame(frameId); frameId = 0; }
    };
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("pointerleave", onPointerOut);
    document.addEventListener("visibilitychange", onVisibilityResume);
    resize();
    if (!still) frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", onPointerOut);
      document.removeEventListener("visibilitychange", onVisibilityResume);
    };
  }, [reduced]);

  return <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
    <canvas ref={canvas} className="block h-full w-full" />
  </div>;
}
