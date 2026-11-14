"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

type Star = {
  x: number; y: number; vx: number; vy: number;
  size: number; phase: number; speed: number; tint: number;
  age: number; lifetime: number; opacity: number;
};

type Nova = { x: number; y: number; age: number };

const TAU = Math.PI * 2;

// The initial field is already dense. New stars are continuously born as
// older stars expire or are consumed by the cursor, with a performance cap.
const DESKTOP = { initial: 2400, limit: 3200, birthsPerSecond: 54, novaThreshold: 85 };
const MOBILE = { initial: 950, limit: 1450, birthsPerSecond: 25, novaThreshold: 48 };

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
    size: .4 + Math.pow(random(), 3.4) * 2.15,
    phase: random() * TAU,
    speed: .65 + random() * 1.3,
    tint: random(),
    age: established ? random() * lifetime * .92 : 0,
    lifetime,
    opacity: established ? 1 : 0,
  };
}

function paint(
  context: CanvasRenderingContext2D,
  stars: Star[],
  novas: Nova[],
  width: number,
  height: number,
  elapsed: number,
  dt: number,
  pointer: { x: number; y: number },
  charge: { value: number },
  threshold: number,
  still: boolean,
) {
  context.clearRect(0, 0, width, height);
  const mx = pointer.x;
  const my = pointer.y;
  const attracting = !still && mx >= 0 && my >= 0 && mx <= width && my <= height;

  context.globalCompositeOperation = "lighter";

  // A low-key atmospheric layer, never a timed or automatic nova.
  const ambientGlow = context.createRadialGradient(
    width * .66, height * .46, 0,
    width * .66, height * .46, Math.max(width, height) * .75,
  );
  ambientGlow.addColorStop(0, "rgba(76,157,141,.065)");
  ambientGlow.addColorStop(1, "rgba(6,14,22,0)");
  context.fillStyle = ambientGlow;
  context.fillRect(0, 0, width, height);

  const maxDistance = Math.max(width, height);
  const drag = Math.exp(-.3 * dt);

  // Iterate backwards so capturing a star destroys it immediately.
  for (let index = stars.length - 1; index >= 0; index--) {
    const star = stars[index];

    if (!still) {
      star.age += dt;
      if (star.age >= star.lifetime) {
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
        // Long-range attraction; progressively stronger nearer the cursor.
        // Softening keeps motion stable as stars approach the capture radius.
        const falloff = 1 / (1 + Math.pow(distance / (maxDistance * .69), 2));
        const acceleration = (95 + 43000 / (distance + 135)) * falloff * star.speed;
        ax += dx / (distance || 1) * acceleration;
        ay += dy / (distance || 1) * acceleration;
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

      if (attracting && Math.hypot(mx - star.x, my - star.y) < 13 + star.size * 2.2) {
        stars[index] = stars[stars.length - 1];
        stars.pop();
        charge.value += 1;

        if (charge.value >= threshold) {
          charge.value -= threshold;
          novas.push({ x: mx, y: my, age: 0 });

          // A nova physically sends nearby stars outward before gravity
          // gradually pulls them back, rather than resetting the entire field.
          const reach = Math.min(width, height) * .9;
          for (const other of stars) {
            const ox = other.x - mx;
            const oy = other.y - my;
            const r = Math.hypot(ox, oy);
            if (r < 1 || r > reach) continue;
            const impulse = 340 * (1 - r / reach) ** 1.45;
            other.vx += ox / r * impulse;
            other.vy += oy / r * impulse;
          }
        }
        continue;
      }

      // Keep the drifting background populated across the entire viewport.
      if (star.x < -20) star.x = width + 20;
      else if (star.x > width + 20) star.x = -20;
      if (star.y < -20) star.y = height + 20;
      else if (star.y > height + 20) star.y = -20;
    }

    const twinkle = .79 + .21 * Math.sin(elapsed * star.speed * 1.7 + star.phase);
    const finalOpacity = (.23 + Math.min(1, star.size / 2.5) * .53) * twinkle * star.opacity;
    if (finalOpacity < .005) continue;
    context.fillStyle = star.tint > .73
      ? `rgba(150,224,235,${finalOpacity})`
      : `rgba(200,246,191,${finalOpacity})`;

    if (!still && Math.hypot(star.vx, star.vy) > 155 && star.size > 1) {
      context.beginPath();
      context.moveTo(star.x, star.y);
      context.lineTo(star.x - star.vx * .037, star.y - star.vy * .037);
      context.lineWidth = Math.max(.55, star.size * .52);
      context.strokeStyle = star.tint > .73
        ? `rgba(150,224,235,${finalOpacity * .32})`
        : `rgba(200,246,191,${finalOpacity * .32})`;
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

  // The attractor becomes brighter as it collects actual stars; it does not
  // trigger a nova merely because the cursor is present.
  if (attracting) {
    const fraction = charge.value / threshold;
    const size = 100 + fraction * 90;
    const well = context.createRadialGradient(mx, my, 0, mx, my, size);
    well.addColorStop(0, `rgba(232,255,213,${.055 + fraction * .24})`);
    well.addColorStop(.22, `rgba(164,236,183,${.025 + fraction * .10})`);
    well.addColorStop(1, "rgba(123,206,187,0)");
    context.fillStyle = well;
    context.fillRect(mx - size, my - size, size * 2, size * 2);
    if (charge.value > 0) {
      context.beginPath();
      context.arc(mx, my, 11 + fraction * 7, 0, TAU * fraction);
      context.strokeStyle = `rgba(215,250,195,${.2 + fraction * .55})`;
      context.lineWidth = 1 + fraction;
      context.stroke();
    }
  }

  // Novas exist ONLY when the cursor has consumed enough actual stars.
  for (let index = novas.length - 1; index >= 0; index--) {
    const nova = novas[index];
    nova.age += dt;
    if (nova.age > 2.8) {
      novas.splice(index, 1);
      continue;
    }
    const age = nova.age;
    const flash = Math.exp(-((age - .12) / .23) ** 2);
    const after = Math.exp(-age * 1.8);
    const radius = Math.min(width, height) * (.055 + flash * .42 + after * .13);
    const bloom = context.createRadialGradient(nova.x, nova.y, 0, nova.x, nova.y, radius);
    bloom.addColorStop(0, `rgba(255,255,247,${Math.min(1, flash + after * .87)})`);
    bloom.addColorStop(.13, `rgba(233,255,203,${Math.min(1, flash * .8 + after * .44)})`);
    bloom.addColorStop(.42, `rgba(158,242,221,${flash * .43 + after * .13})`);
    bloom.addColorStop(1, "rgba(120,198,185,0)");
    context.fillStyle = bloom;
    context.fillRect(nova.x - radius, nova.y - radius, radius * 2, radius * 2);

    for (let ring = 0; ring < 2; ring++) {
      const progress = (age - ring * .17) / 1.8;
      if (progress <= 0 || progress >= 1) continue;
      context.beginPath();
      context.arc(nova.x, nova.y, (15 + progress * Math.max(width, height) * .75), 0, TAU);
      context.lineWidth = 1 + (1 - progress) * 2.2;
      context.strokeStyle = `rgba(219,255,223,${.63 * (1 - progress) ** 2})`;
      context.stroke();
    }

    const spokes = 28;
    for (let ray = 0; ray < spokes; ray++) {
      const theta = ray / spokes * TAU + ray * .17;
      const length = Math.min(width, height) * (.1 + (ray % 5) * .055) * Math.min(1, age * 4);
      const opacity = Math.max(0, 1 - age / 1.4) * (.12 + (ray % 4) * .04);
      if (opacity <= 0) continue;
      context.beginPath();
      context.moveTo(nova.x + Math.cos(theta) * length * .45, nova.y + Math.sin(theta) * length * .45);
      context.lineTo(nova.x + Math.cos(theta) * length, nova.y + Math.sin(theta) * length);
      context.strokeStyle = `rgba(220,255,219,${opacity})`;
      context.lineWidth = .75;
      context.stroke();
    }
  }
  context.globalCompositeOperation = "source-over";
}

export default function IntelligenceVisual() {
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
    const novas: Nova[] = [];
    const charge = { value: 0 };
    let width = 0, height = 0, last = 0, elapsed = 0;
    let birthCarry = 0, frame = 0;
    let visible = !document.hidden;

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
      }
      paint(context, stars, novas, width, height, elapsed, 0, pointer.current, charge, configuration.novaThreshold, still);
    };

    const onPointer = (event: PointerEvent) => {
      // Touch scrolling should not create a persistent gravitational cursor.
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

      paint(context, stars, novas, width, height, elapsed, dt, pointer.current, charge, configuration.novaThreshold, false);
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("blur", clearPointer);
    document.addEventListener("pointerleave", clearPointer);
    document.addEventListener("visibilitychange", onVisibility);

    // Populate the entire canvas immediately before starting animation.
    resize();
    for (let i = 0; i < configuration.initial; i++) {
      stars.push(newStar(random, width, height, true));
    }
    paint(context, stars, novas, width, height, elapsed, 0, pointer.current, charge, configuration.novaThreshold, still);
    if (!still) frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("blur", clearPointer);
      document.removeEventListener("pointerleave", clearPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reducedMotion]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <canvas ref={canvas} className="block h-full w-full" />
    </div>
  );
}
