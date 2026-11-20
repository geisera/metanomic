"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "motion/react";

type Star = {
  x: number; y: number; vx: number; vy: number;
  size: number; phase: number; speed: number; tint: number;
  age: number; lifetime: number; opacity: number;
  isRed: boolean;
  trail?: { x: number; y: number; time: number }[];
};

const TAU = Math.PI * 2;

// The initial field is already dense. New stars are continuously born as
// older stars expire naturally, with a performance cap.
const DESKTOP = { initial: 2400, limit: 3200, birthsPerSecond: 54 };
const MOBILE = { initial: 950, limit: 1450, birthsPerSecond: 25 };

function makeRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function newStar(
  random: () => number,
  width: number,
  height: number,
  established: boolean,
): Star {
  const lifetime = 48 + random() * 48;
  return {
    x: random() * width,
    y: random() * height,
    vx: (random() - .5) * 13,
    vy: (random() - .5) * 13,
    size: .32 + Math.pow(random(), 3.4) * 1.48,
    phase: random() * TAU,
    speed: .65 + random() * 1.3,
    tint: random(),
    age: established ? random() * lifetime * .92 : 0,
    lifetime,
    opacity: established ? 1 : 0,
    isRed: false,
  };
}

function paint(
  context: CanvasRenderingContext2D,
  stars: Star[],
  width: number,
  height: number,
  elapsed: number,
  dt: number,
  pointer: { x: number; y: number },
  still: boolean,
) {
  const light = document.documentElement.dataset.theme === "light";
  context.clearRect(0, 0, width, height);
  const mx = pointer.x;
  const my = pointer.y;
  const attracting = !still && mx >= 0 && my >= 0 && mx <= width && my <= height;

  context.globalCompositeOperation = light ? "source-over" : "lighter";

  // Subtle atmospheric depth behind the continuously moving stars.
  const ambientGlow = context.createRadialGradient(
    width * .66, height * .46, 0,
    width * .66, height * .46, Math.max(width, height) * .75,
  );
  ambientGlow.addColorStop(0, "rgba(76,157,141,.035)");
  ambientGlow.addColorStop(1, "rgba(6,14,22,0)");
  context.fillStyle = ambientGlow;
  context.fillRect(0, 0, width, height);

  const maxDistance = Math.max(width, height);
  const drag = Math.exp(-.3 * dt);

  // Iterate backwards to retire stars only when their natural lifetime ends.
  for (let index = stars.length - 1; index >= 0; index--) {
    const star = stars[index];

    if (!still) {
      star.age += dt;
      if (!star.isRed && star.age >= star.lifetime) {
        stars[index] = stars[stars.length - 1];
        stars.pop();
        continue;
      }

      // Slow perpetual drift exists even when there is no pointer.
      let ax = Math.sin(elapsed * .21 + star.phase) * 3;
      let ay = Math.cos(elapsed * .17 + star.phase) * 3;

      const dx = mx - star.x;
      const dy = my - star.y;
      const distance = Math.hypot(dx, dy);
      if (attracting) {
        // Long-range gravity persists, but eases near the cursor so stars
        // sweep past or circle it rather than piling up at a single point.
        const falloff = 1 / (1 + Math.pow(distance / (maxDistance * .69), 2));
        const inward = (95 + 43000 / (distance + 135)) * falloff * star.speed;
        const coreEase = 1 - .92 * Math.max(0, 1 - distance / 46);
        const orbit = 225 * Math.max(0, 1 - distance / 115) * star.speed;
        const nx = dx / (distance || 1);
        const ny = dy / (distance || 1);
        ax += nx * inward * coreEase - ny * orbit;
        ay += ny * inward * coreEase + nx * orbit;
      }

      star.vx = (star.vx + ax * dt) * drag;
      star.vy = (star.vy + ay * dt) * drag;

      const velocity = Math.hypot(star.vx, star.vy);
      const maxVelocity = 290;
      if (velocity > maxVelocity) {
        star.vx *= maxVelocity / velocity;
        star.vy *= maxVelocity / velocity;
      }
      star.x += star.vx * dt;
      star.y += star.vy * dt;
      star.opacity = Math.min(1, star.opacity + dt * 1.1);

      // Keep the drifting background populated across the entire viewport.
      // Keep the unique Metanomic-green star within visible bounds as it wraps.
      const margin = star.isRed ? 0 : 20;
      let wrapped = false;
      if (star.x < -margin) { star.x = width + margin; wrapped = true; }
      else if (star.x > width + margin) { star.x = -margin; wrapped = true; }
      if (star.y < -margin) { star.y = height + margin; wrapped = true; }
      else if (star.y > height + margin) { star.y = -margin; wrapped = true; }

      if (star.isRed && dt > 0) {
        // Retain only the accent star's recent positions; discard any trail at
        // viewport wraps so it cannot draw a streak across the entire screen.
        const trail = star.trail ?? (star.trail = []);
        if (wrapped) trail.length = 0;
        trail.push({ x: star.x, y: star.y, time: elapsed });
        // A short-lived wake (~0.38s) fades consistently across frame rates.
        while (trail.length > 1 && elapsed - trail[0].time > .38) trail.shift();
      }
    }

    const twinkle = .9 + .1 * Math.sin(elapsed * star.speed * 1.7 + star.phase);
    const finalOpacity = (.21 + Math.min(1, star.size / 1.9) * .43) * twinkle * star.opacity;
    if (finalOpacity < .005) continue;
    context.fillStyle = light
      ? `rgba(${star.isRed ? "53,104,23" : star.tint > .73 ? "30,91,112" : "44,101,72"},${Math.min(1, finalOpacity * 1.5)})`
      : star.isRed
      ? `rgba(201,236,138,${Math.max(.94, finalOpacity)})`
      : star.tint > .73
        ? `rgba(149,199,208,${finalOpacity})`
        : `rgba(180,219,189,${finalOpacity})`;

    // A vivid Metanomic-green wake follows the one persistent accent star.
    // It bends with the star's actual path, fades into the background, and
    // remains subtle even when cursor gravity accelerates the star.
    if (!still && star.isRed && star.trail && star.trail.length > 1) {
      const trail = star.trail;
      context.save();
      context.lineCap = "round";
      context.shadowColor = "rgba(201,236,138,.82)";
      context.shadowBlur = 18;
      for (let segment = 1; segment < trail.length; segment++) {
        // A brighter, thicker head tapers sharply into the fading red wake.
        const freshness = Math.max(0, 1 - (elapsed - trail[segment].time) / .38);
        const glow = freshness * freshness * freshness;
        if (glow < .003) continue;
        context.beginPath();
        context.moveTo(trail[segment - 1].x, trail[segment - 1].y);
        context.lineTo(trail[segment].x, trail[segment].y);
        context.strokeStyle = `rgba(201,236,138,${(glow * .58).toFixed(3)})`;
        context.lineWidth = 1.5 + freshness * 3.2;
        context.stroke();
      }
      context.restore();
    }

    if (!still && !star.isRed && Math.hypot(star.vx, star.vy) > 185 && star.size > 1) {
      context.beginPath();
      context.moveTo(star.x, star.y);
      context.lineTo(star.x - star.vx * .028, star.y - star.vy * .028);
      context.lineWidth = Math.max(.4, star.size * .42);
      context.strokeStyle = star.isRed
        ? `rgba(201,236,138,${finalOpacity * .32})`
        : star.tint > .73
          ? `rgba(149,199,208,${finalOpacity * .20})`
          : `rgba(180,219,189,${finalOpacity * .20})`;
      context.stroke();
    }

    if (star.size <= 1) {
      context.fillRect(star.x, star.y, Math.max(.55, star.size), Math.max(.55, star.size));
    } else {
      context.beginPath();
      context.arc(star.x, star.y, star.size, 0, TAU);
      context.fill();
    }
  }

  // The cursor remains a quiet gravitational attractor.
  if (attracting) {
    const radius = 110;
    const well = context.createRadialGradient(mx, my, 0, mx, my, radius);
    well.addColorStop(0, "rgba(232,255,213,.035)");
    well.addColorStop(.25, "rgba(164,236,183,.015)");
    well.addColorStop(1, "rgba(123,206,187,0)");
    context.fillStyle = well;
    context.fillRect(mx - radius, my - radius, radius * 2, radius * 2);
  }

  context.globalCompositeOperation = "source-over";
}

export default function IntelligenceVisual() {
  return usePathname() === "/assistant-studio/login" ? null : <Starfield />;
}

function Starfield() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: -10000, y: -10000 });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d", { alpha: true });
    if (!element || !context) return;

    const still = reducedMotion === true;
    const configuration = window.matchMedia("(max-width: 700px)").matches ? MOBILE : DESKTOP;
    const random = makeRandom(78219);
    const stars: Star[] = [];
    let width = 0, height = 0, last = 0, elapsed = 0;
    let birthCarry = 0, frame = 0;
    let visible = !document.hidden;
    let activeTouchId: number | null = null;

    // Finger contact pulls a small local cluster into motion immediately.
    // Dragging then carries nearby stars along with the touch location.
    // These are passive listeners: native scrolling, links and gestures remain intact.
    const stirStars = (x: number, y: number, dx = 0, dy = 0, initial = false) => {
      if (still) return;
      const radius = initial ? 180 : 150;
      for (const star of stars) {
        const sx = x - star.x;
        const sy = y - star.y;
        const distance = Math.hypot(sx, sy);
        if (distance < 1 || distance >= radius) continue;
        const strength = Math.pow(1 - distance / radius, 2);
        if (initial) {
          const tug = 115 * strength;
          star.vx += sx / distance * tug - sy / distance * tug * .22;
          star.vy += sy / distance * tug + sx / distance * tug * .22;
        } else {
          star.vx += dx * .85 * strength;
          star.vy += dy * .85 * strength;
        }
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      if (still || activeTouchId !== null) return;
      const touch = event.changedTouches.item(0);
      if (!touch) return;
      activeTouchId = touch.identifier;
      pointer.current = { x: touch.clientX, y: touch.clientY };
      stirStars(touch.clientX, touch.clientY, 0, 0, true);
    };
    const onTouchMove = (event: TouchEvent) => {
      if (still || activeTouchId === null) return;
      const touch = Array.from(event.touches).find(item => item.identifier === activeTouchId);
      if (!touch) return;
      const dx = touch.clientX - pointer.current.x;
      const dy = touch.clientY - pointer.current.y;
      pointer.current = { x: touch.clientX, y: touch.clientY };
      stirStars(touch.clientX, touch.clientY, dx, dy);
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (activeTouchId === null) return;
      if (!Array.from(event.changedTouches).some(item => item.identifier === activeTouchId)) return;
      activeTouchId = null;
      pointer.current = { x: -10000, y: -10000 };
    };

    const resize = () => {
      const oldWidth = width, oldHeight = height;
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(width * dpr);
      element.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const star of stars) {
        star.x = oldWidth ? star.x * width / oldWidth : star.x;
        star.y = oldHeight ? star.y * height / oldHeight : star.y;
        // A resize should not leave a ghost trail at old viewport coordinates.
        if (star.isRed) star.trail = [];
      }
      paint(context, stars, width, height, elapsed, 0, pointer.current, still);
    };

    const onPointer = (event: PointerEvent) => {
      // Touch is handled separately, including during native scrolling.
      if (event.pointerType === "touch") return;
      pointer.current = { x: event.clientX, y: event.clientY };
    };
    const clearPointer = () => { pointer.current = { x: -10000, y: -10000 }; };
    const onVisibility = () => {
      visible = !document.hidden;
      last = 0;
      if (visible && !still && !frame) frame = requestAnimationFrame(tick);
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const tick = (now: number) => {
      if (!visible) { frame = 0; return; }
      if (!last) last = now;
      const dt = Math.min((now - last) / 1000, .05);
      last = now;
      elapsed += dt;

      // Spawn every frame, not merely when a particle gets captured.
      birthCarry += dt * configuration.birthsPerSecond;
      const births = Math.floor(birthCarry);
      birthCarry -= births;
      for (let i = 0; i < births && stars.length < configuration.limit; i++) {
        stars.push(newStar(random, width, height, false));
      }

      paint(context, stars, width, height, elapsed, dt, pointer.current, false);
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("blur", clearPointer);
    document.addEventListener("pointerleave", clearPointer);
    document.addEventListener("visibilitychange", onVisibility);

    // Populate the entire canvas immediately before starting animation.
    resize();
    for (let i = 0; i < configuration.initial; i++) {
      stars.push(newStar(random, width, height, true));
    }
    // Exactly one persistent Metanomic-green star, present from the first frame.
    // It participates in gravity, touch interactions, and movement but never expires.
    const redStar = newStar(random, width, height, true);
    redStar.isRed = true;
    redStar.size = 1.75;
    stars.push(redStar);
    paint(context, stars, width, height, elapsed, 0, pointer.current, still);
    if (!still) frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("blur", clearPointer);
      document.removeEventListener("pointerleave", clearPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reducedMotion]);

  return (
    <div aria-hidden="true" className="metanomic-starfield pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <canvas ref={canvas} className="block h-full w-full" />
    </div>
  );
}
