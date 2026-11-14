"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { PointerEvent } from "react";

const satellites = [
  { x: 91, y: 103, label: "RESEARCH", delay: 0.2, color: "#c9ec8a" },
  { x: 395, y: 72, label: "REASON", delay: 0.5, color: "#a1dbf0" },
  { x: 457, y: 321, label: "EXECUTE", delay: 0.8, color: "#c9ec8a" },
  { x: 124, y: 409, label: "CONNECT", delay: 1.1, color: "#a1dbf0" },
];

const paths = [
  "M91 103 C164 102 185 190 271 246",
  "M395 72 C354 126 322 170 271 246",
  "M457 321 C375 316 343 278 271 246",
  "M124 409 C154 325 210 289 271 246",
];

export default function IntelligenceVisual() {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 65, damping: 22, mass: 1 });
  const smoothY = useSpring(pointerY, { stiffness: 65, damping: 22, mass: 1 });
  const tiltX = useTransform(smoothY, [-1, 1], [7, -7]);
  const tiltY = useTransform(smoothX, [-1, 1], [-7, 7]);

  function handlePointer(event: PointerEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 2);
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 2);
  }

  return (
    <div
      role="img"
      aria-label="Animated network of intelligent agents connecting research, reasoning, execution, and collaboration around a shared human purpose"
      className="intelligence-visual relative mx-auto aspect-square w-full max-w-[570px] select-none"
      onPointerMove={handlePointer}
      onPointerLeave={() => { pointerX.set(0); pointerY.set(0); }}
    >
      <div className="absolute inset-[7%] rounded-full bg-[#b8f89a]/[.08] blur-[78px]" aria-hidden="true" />
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        style={reduceMotion ? undefined : { rotateX: tiltX, rotateY: tiltY, transformPerspective: 1100 }}
      >
        <svg viewBox="0 0 540 500" className="h-full w-full overflow-visible" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="metanomic-aura"><stop stopColor="#c9ec8a" stopOpacity=".19" /><stop offset="1" stopColor="#c9ec8a" stopOpacity="0" /></radialGradient>
            <linearGradient id="metanomic-line" x1="50" y1="30" x2="480" y2="450" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8cd8de" stopOpacity=".24" /><stop offset=".5" stopColor="#c9ec8a" stopOpacity=".68" /><stop offset="1" stopColor="#8cd8de" stopOpacity=".16" />
            </linearGradient>
            <linearGradient id="metanomic-core" x1="205" y1="195" x2="342" y2="325" gradientUnits="userSpaceOnUse">
              <stop stopColor="#233e42"/><stop offset="1" stopColor="#102224"/>
            </linearGradient>
            <filter id="metanomic-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="7"/>
            </filter>
          </defs>

          <circle cx="271" cy="246" r="215" fill="url(#metanomic-aura)" />
          {[104, 163, 220].map((r, index) => (
            <motion.circle key={r} cx="271" cy="246" r={r} stroke={index === 1 ? "#88bb8d" : "#5b8c84"} strokeOpacity={index === 1 ? ".27" : ".16"} strokeWidth="1"
              strokeDasharray={index === 1 ? "2 9" : undefined}
              animate={reduceMotion ? undefined : { rotate: index % 2 === 0 ? 360 : -360 }}
              transition={{ duration: 90 + index * 20, ease: "linear", repeat: Infinity }}
              style={{ transformOrigin: "271px 246px" }}
            />
          ))}

          {paths.map((d, index) => (
            <g key={d}>
              <path d={d} stroke="#7bc5b5" strokeWidth="1" strokeOpacity=".2" />
              <motion.path d={d} stroke="url(#metanomic-line)" strokeWidth="1.8" strokeLinecap="round"
                initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.4, delay: .25 + index * .18, ease: "easeOut" }}
              />
              {!reduceMotion && <motion.circle r="3.5" fill="#dbffad" filter="url(#metanomic-glow)">
                <animateMotion dur={`${3.2 + index * .5}s`} repeatCount="indefinite" begin={`${index * -.75}s`} path={d} />
              </motion.circle>}
              {!reduceMotion && <circle r="2.6" fill={index % 2 ? "#9fe0e9" : "#d6fa9e"}>
                <animateMotion dur={`${3.2 + index * .5}s`} repeatCount="indefinite" begin={`${index * -.75}s`} path={d} />
              </circle>}
            </g>
          ))}

          <motion.circle cx="271" cy="246" r="76" stroke="#c9ec8a" strokeOpacity=".18" strokeWidth="10" filter="url(#metanomic-glow)"
            animate={reduceMotion ? undefined : { opacity: [.25, .75, .25], scale: [1, 1.08, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "271px 246px" }}
          />
          <motion.rect x="206" y="181" width="130" height="130" rx="28" fill="url(#metanomic-core)" stroke="#bfeaa2" strokeOpacity=".65"
            initial={reduceMotion ? false : { opacity: 0, scale: .7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 18, delay: .3 }}
            style={{ transformOrigin: "271px 246px" }}
          />
          <rect x="216" y="191" width="110" height="110" rx="20" stroke="#c9ec8a" strokeOpacity=".17" />
          <path d="M236 270V220L271 254L306 220V270" stroke="#d7fca7" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="271" cy="246" r="94" stroke="#c9ec8a" strokeOpacity=".14" strokeWidth="1" strokeDasharray="4 11" />

          {satellites.map((node) => (
            <g key={node.label}>
              <motion.circle cx={node.x} cy={node.y} r="18" fill="#10272c" stroke={node.color} strokeOpacity=".4"
                initial={reduceMotion ? false : { opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", delay: node.delay + .4, stiffness: 170, damping: 14 }}
                style={{ transformOrigin: `${node.x}px ${node.y}px` }}
              />
              <motion.circle cx={node.x} cy={node.y} r="6" fill={node.color}
                animate={reduceMotion ? undefined : { opacity: [.55, 1, .55] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: node.delay }}
              />
              <text x={node.x} y={node.y + 37} fill="#b6cfc5" fontSize="10" textAnchor="middle" letterSpacing="1.9" fontFamily="Arial, sans-serif">{node.label}</text>
            </g>
          ))}
        </svg>
      </motion.div>

      <motion.div aria-hidden="true" className="absolute left-[1%] top-[1%] rounded-lg border border-[#456e65]/60 bg-[#10242a]/90 px-4 py-3 shadow-[0_16px_50px_#0005] backdrop-blur-md"
        initial={reduceMotion ? false : { opacity: 0, x: -14, y: 8 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: .7, delay: 1 }}
      >
        <div className="flex items-center gap-2 text-[10px] tracking-[.16em] text-[#bbd4ca]"><span className="h-1.5 w-1.5 rounded-full bg-[#c9ec8a]"/> INTELLIGENCE NETWORK</div>
        <div className="mt-2 text-sm font-semibold text-white">Connected by design<span className="ml-3 text-[#c9ec8a]">↗</span></div>
      </motion.div>

      <motion.div aria-hidden="true" className="absolute bottom-[2%] right-[1%] rounded-lg border border-[#4e7458]/60 bg-[#14282b]/95 px-4 py-3 shadow-[0_16px_60px_#0007] backdrop-blur-md"
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .8, delay: 1.35 }}
      >
        <div className="text-[10px] tracking-[.17em] text-[#9cc7ae]">THE METANOMIC PRINCIPLE</div>
        <div className="mt-1 text-sm font-medium text-[#ebf8e6]">Human direction. Agentic action.</div>
      </motion.div>
    </div>
  );
}
