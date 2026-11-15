"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { dayColor } from "@/components/avatar";
import { DayPin } from "./day-pin";
import { EASE } from "./motion";

const ROUTE = "M70 360 C150 300 190 250 250 235 S350 170 420 120 S520 90 560 70";
const PINS = [
  { n: 1, x: 70, y: 360 },
  { n: 2, x: 250, y: 235 },
  { n: 3, x: 420, y: 120 },
];

/** Stylised ridge in map tokens: replaces the photo slot of DESIGN.md §7.1. The route draws itself when scrolled into view. */
export function RidgeIllustration() {
  const mask = useId();
  const view = { once: true, margin: "-80px" } as const;
  return (
    <svg viewBox="0 0 600 440" preserveAspectRatio="xMidYMid slice" aria-hidden className="size-full min-h-[360px]">
      <rect width="600" height="440" className="fill-map-land" />
      <path d="M0 250 L90 170 L150 210 L250 110 L330 190 L400 130 L500 220 L600 160 V440 H0Z" className="fill-map-forest" />
      <path d="M0 330 L70 280 L160 320 L260 250 L360 310 L450 260 L600 330 V440 H0Z" className="fill-map-forest" fillOpacity="0.6" />
      <path d="M0 400 C120 370 200 410 320 385 S520 360 600 390" fill="none" strokeWidth="8" className="stroke-map-water" />
      <path d="M-20 440 C120 380 300 330 460 250 S580 150 620 100" fill="none" strokeWidth="10" className="stroke-map-road" />
      <mask id={mask}>
        <motion.path d={ROUTE} fill="none" stroke="white" strokeWidth="12" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={view} transition={{ duration: 1.6, ease: EASE, delay: 0.2 }} />
      </mask>
      <path d={ROUTE} fill="none" strokeWidth="3" strokeDasharray="8 6" mask={`url(#${mask})`} style={{ stroke: dayColor(0) }} />
      {PINS.map((p, i) => (
        <foreignObject key={p.n} x={p.x - 13} y={p.y - 13} width="26" height="26">
          <motion.div initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={view} transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.4 + i * 0.5 }}>
            <DayPin n={p.n} day={i} />
          </motion.div>
        </foreignObject>
      ))}
    </svg>
  );
}
