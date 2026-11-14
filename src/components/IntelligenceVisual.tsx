"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { PointerEvent } from "react";

const workflows = [
  { label: "Understand", detail: "Making sense of your data", code: "01", icon: "◈", color: "#bded9c" },
  { label: "Plan", detail: "Choosing the next best step", code: "02", icon: "⌘", color: "#a7d9f5" },
  { label: "Execute", detail: "Turning intention into action", code: "03", icon: "↗", color: "#bded9c" },
];

const sparks = [
  { x: 17, y: 22, delay: 0 }, { x: 80, y: 15, delay: 1.1 },
  { x: 90, y: 66, delay: 1.9 }, { x: 14, y: 79, delay: 2.5 },
  { x: 56, y: 8, delay: 1.6 }, { x: 75, y: 88, delay: 3.1 },
];

export default function IntelligenceVisual() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smoothX = useSpring(mx, { stiffness: 55, damping: 18 });
  const smoothY = useSpring(my, { stiffness: 55, damping: 18 });
  const rotateY = useTransform(smoothX, [-1, 1], [-5, 5]);
  const rotateX = useTransform(smoothY, [-1, 1], [5, -5]);

  useEffect(() => {
    if (reduced) return;
    const interval = window.setInterval(() => setActive((value) => (value + 1) % workflows.length), 2900);
    return () => window.clearInterval(interval);
  }, [reduced]);

  function move(event: PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    mx.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 2);
    my.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 2);
  }

  return (
    <div
      className="relative mx-auto w-full max-w-[570px] aspect-[1.03] select-none [perspective:1100px]"
      aria-label="Conceptual demonstration of an AI workflow moving through understanding, planning, and execution"
      onPointerMove={move}
      onPointerLeave={() => { mx.set(0); my.set(0); }}
    >
      <div aria-hidden="true" className="absolute inset-[13%] rounded-full bg-[#b1efa3]/[.10] blur-[75px]" />
      <motion.div
        className="absolute inset-0"
        style={reduced ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        <div aria-hidden="true" className="absolute inset-[6%] rounded-[40px] border border-[#446559]/20 bg-[radial-gradient(ellipse_at_52%_48%,#1b393748,transparent_67%)]" />

        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 570 552" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="metanomic-wire" x1="130" y1="90" x2="450" y2="430" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8ae6e5" stopOpacity=".12" />
              <stop offset=".5" stopColor="#d1f79e" stopOpacity=".75" />
              <stop offset="1" stopColor="#8ae6e5" stopOpacity=".15" />
            </linearGradient>
          </defs>
          {[{ d:"M130 164 C185 164 183 270 254 270", delay:0 },{ d:"M430 160 C370 160 389 268 316 268", delay:.6 },{ d:"M286 326 C286 365 399 355 430 401", delay:1.2 },{ d:"M270 326 C246 377 182 366 140 413", delay:1.8 }].map((p, index) => (
            <g key={index}>
              <path d={p.d} stroke="#a8d5bf" strokeOpacity=".15" />
              <motion.path d={p.d} stroke="url(#metanomic-wire)" strokeWidth="1.8" strokeLinecap="round"
                initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: .9, delay: .3 + index * .15 }}
              />
              {!reduced && <circle r="3" fill={index % 2 ? "#a9e4e5" : "#d4ff9d"}>
                <animateMotion dur={`${3.4 + index * .4}s`} repeatCount="indefinite" begin={`-${p.delay}s`} path={p.d} />
              </circle>}
            </g>
          ))}
          <circle cx="285" cy="275" r="144" stroke="#9acfb4" strokeOpacity=".09" strokeDasharray="2 7" />
          <circle cx="285" cy="275" r="199" stroke="#9acfb4" strokeOpacity=".075" />
        </svg>

        {sparks.map((s, index) => (
          <motion.span key={index} aria-hidden="true" className="absolute h-[3px] w-[3px] rounded-full bg-[#ddf6b3]"
            style={{ left: `${s.x}%`, top: `${s.y}%`, boxShadow: "0 0 12px 3px #c9ec8a44" }}
            animate={reduced ? undefined : { opacity: [.15,.85,.15], scale: [1,1.7,1] }}
            transition={{ duration: 3, delay: s.delay, repeat: Infinity }}
          />
        ))}

        <motion.div aria-hidden="true" className="absolute left-[33%] top-[32%] flex h-[35%] w-[35%] items-center justify-center"
          initial={reduced ? false : { opacity: 0, scale: .72, filter: "blur(12px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ type:"spring", stiffness:105, damping:17, delay:.15 }}
        >
          <motion.div className="absolute inset-0 rounded-[30%] border border-[#b8eaa2]/40 bg-[#c9ec8a]/[.055] shadow-[0_0_95px_#b8f6a927,inset_0_0_40px_#b8f6a916]"
            animate={reduced ? undefined : { rotate:[-7,7,-7], scale:[.94,1.02,.94] }}
            transition={{ duration:8, ease:"easeInOut", repeat:Infinity }}
          />
          <div className="absolute inset-[13%] rounded-[29%] border border-[#a8dac2]/40 bg-[linear-gradient(135deg,#25403e,#101e2a)] shadow-[0_18px_60px_#0008,inset_0_1px_0_#d6ffb52e]" />
          <motion.div className="relative flex h-[42%] w-[42%] items-center justify-center rounded-[25%] bg-[#d2f7a0] text-[#12221f] shadow-[0_0_35px_#c9ec8a50]"
            animate={reduced ? undefined : { boxShadow:["0 0 22px #c9ec8a33","0 0 55px #c9ec8a77","0 0 22px #c9ec8a33"] }}
            transition={{ duration:3, repeat:Infinity }}
          >
            <svg viewBox="0 0 64 64" className="h-[70%] w-[70%]" fill="none">
              <path d="M9 47V17L32 39L55 17V47" stroke="#11231D" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        </motion.div>

        <motion.div aria-hidden="true" className="absolute left-[0%] top-[18%] w-[43%] rounded-xl border border-[#4a6c66]/60 bg-[#10212c]/95 p-3.5 shadow-[0_22px_55px_#0009] backdrop-blur-md"
          initial={reduced ? false : { opacity:0, y:18, scale:.9 }}
          animate={{ opacity:1, y:0, scale:1 }}
          transition={{ type:"spring", visualDuration:.7, bounce:.17, delay:.25 }}
        >
          <div className="flex items-center justify-between text-[9px] font-semibold tracking-[.16em] text-[#8db4b1]"><span>INPUT / HUMAN INTENT</span><span className="text-[#a9d9b9]">●</span></div>
          <div className="mt-3 text-[clamp(11px,1.4vw,15px)] font-medium leading-snug text-[#edf6eb]">Make work feel effortless.</div>
          <div className="mt-3 flex gap-1"><div className="h-[3px] w-14 rounded bg-[#b9e99d]"/><div className="h-[3px] w-6 rounded bg-[#42645e]"/><div className="h-[3px] w-9 rounded bg-[#42645e]"/></div>
        </motion.div>

        <motion.div aria-hidden="true" className="absolute right-[-1%] top-[14%] w-[35%] rounded-xl border border-[#487269]/60 bg-[#10232b]/95 p-3.5 shadow-[0_22px_55px_#0009] backdrop-blur-md"
          initial={reduced ? false : { opacity:0, x:17, scale:.92 }}
          animate={{ opacity:1, x:0, scale:1 }}
          transition={{ type:"spring", visualDuration:.7, bounce:.17, delay:.45 }}
        >
          <div className="flex items-center gap-2 text-[9px] font-semibold tracking-[.14em] text-[#b6d5d0]"><span className="h-2 w-2 rounded-full bg-[#bbea9c] shadow-[0_0_12px_#c9ec8a]"/> SYSTEM ONLINE</div>
          <div className="mt-3 flex items-end gap-1.5">{[30,52,44,76,58,90,65,83,48,72].map((h,i) =>
            <motion.div key={i} className="w-full rounded-sm bg-gradient-to-t from-[#416d64] to-[#c9ed9f]" style={{ height:`${h*.42}px` }}
              animate={reduced ? undefined : { scaleY:[.6,1.05,.7], opacity:[.5,1,.65] }}
              transition={{ duration:1.4+(i%3)*.3, repeat:Infinity, delay:i*.17 }}
            />)}</div>
          <div className="mt-2 text-[10px] text-[#a8c2bd]">Orchestrating possibility</div>
        </motion.div>

        <motion.div aria-hidden="true" className="absolute bottom-[13%] left-[0%] w-[47%] rounded-xl border border-[#41645c]/65 bg-[#10212b]/95 p-3.5 shadow-[0_22px_55px_#0009] backdrop-blur-md"
          initial={reduced ? false : { opacity:0, y:22, scale:.9 }}
          animate={{ opacity:1, y:0, scale:1 }}
          transition={{ type:"spring", visualDuration:.7, bounce:.15, delay:.65 }}
        >
          <div className="flex items-center justify-between text-[9px] font-semibold tracking-[.15em] text-[#9cbab7]"><span>INTELLIGENT WORKFLOW</span><span className="text-[#c9ec8a]">↗</span></div>
          <div className="mt-3 flex items-center gap-2">
            {workflows.map((step,i) => <div key={step.code} className="flex min-w-0 flex-1 items-center gap-1.5">
              <motion.div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[12px]"
                animate={{ borderColor: active===i ? "#c9ec8a" : "#406258", backgroundColor: active===i ? "#305039" : "#192f32", color: active===i ? "#e5ffbd" : "#8caaa4" }}
                transition={{ duration:.35 }}>{step.icon}</motion.div>
              {i<2 && <div className="h-px min-w-1 flex-1 bg-[#5b8571]"/>}
            </div>)}
          </div>
          <div className="mt-3 h-[29px] overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p key={active} className="text-[11px] text-[#d5e8d9]"
                initial={reduced ? false : { y:12, opacity:0 }}
                animate={{ y:0, opacity:1 }}
                exit={reduced ? undefined : { y:-12, opacity:0 }}
                transition={{ duration:.24 }}>{workflows[active].label} <span className="text-[#8eaaa5]">· {workflows[active].detail}</span></motion.p>
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div aria-hidden="true" className="absolute bottom-[9%] right-[-2%] w-[38%] rounded-xl border border-[#567e5a]/70 bg-[#192e2a]/95 p-3.5 shadow-[0_22px_55px_#0009] backdrop-blur-md"
          initial={reduced ? false : { opacity:0, x:18, scale:.9 }}
          animate={{ opacity:1, x:0, scale:1 }}
          transition={{ type:"spring", visualDuration:.7, bounce:.14, delay:.9 }}
        >
          <div className="flex items-center gap-2 text-[9px] tracking-[.16em] text-[#c0d8bd]"><span className="text-[#c9ec8a]">✓</span> OUTCOME</div>
          <div className="mt-2 text-[clamp(12px,1.7vw,17px)] font-semibold tracking-[-.025em] text-white">More human potential.</div>
          <div className="mt-2 text-[10px] text-[#9ebcaf]">Technology, working for people.</div>
        </motion.div>
      </motion.div>
      <span className="sr-only">Animated illustrative dashboard, not a live AI system.</span>
    </div>
  );
}
