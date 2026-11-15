"use client";

import { ArrowRight } from "lucide-react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar, dayColor, participantColor } from "@/components/avatar";
import { Money } from "@/components/money";
import { DayPin } from "./day-pin";
import { EASE, useLoop } from "./motion";

const card = "rounded-lg border border-border bg-surface";
const view = { once: true, margin: "-80px" } as const;

export function ItineraryVisual() {
  const t = useTranslations("landing.modules");
  const { ref, step } = useLoop<HTMLDivElement>(2, 2200, 1);
  const lifted = step === 1;
  const stops = [
    { n: 1, title: t("demo.stop1"), time: "10:00" },
    { n: 2, title: t("demo.stop2"), time: "13:00", dragging: true },
    { n: 3, title: t("demo.stop3"), time: "17:00" },
  ];
  return (
    <div ref={ref} className="flex w-full max-w-[340px] flex-col gap-2">
      {stops.map((s) => (
        <div key={s.n} className="contents">
          <motion.div
            animate={s.dragging ? { x: lifted ? 14 : 0, rotate: lifted ? -1.5 : 0 } : undefined}
            transition={{ duration: 0.4, ease: EASE }}
            className={`flex items-center gap-3 rounded-md bg-surface px-3 py-2.5 ${s.dragging && lifted ? "shadow-lg" : "border border-border"}`}
          >
            <DayPin n={s.n} day={2} />
            <span className="min-w-0 flex-1 text-body font-semibold">{s.title}</span>
            <span className="text-small tabular-nums text-fg-muted">{s.time}</span>
          </motion.div>
          {s.dragging && <div className={`h-1.5 rounded-sm border border-dashed border-primary-400 bg-primary-subtle transition-opacity ${lifted ? "opacity-100" : "opacity-0"}`} />}
        </div>
      ))}
    </div>
  );
}

const PINS = [
  { n: 1, x: 120, y: 175 },
  { n: 2, x: 230, y: 140 },
  { n: 3, x: 320, y: 100 },
  { n: 4, x: 400, y: 70 },
];
const ROUTE = PINS.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");

export function MapVisual() {
  const mask = useId();
  return (
    <svg viewBox="0 0 480 236" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
      <rect width="480" height="236" className="fill-map-land" />
      <path d="M0 60 C120 20 200 80 300 40 S440 10 480 30 V0 H0Z" className="fill-map-forest" />
      <path d="M0 120 C100 110 160 140 240 125 S400 100 480 130" fill="none" strokeWidth="2" className="stroke-map-water" />
      <path d="M0 150 C120 160 200 170 300 150 S420 160 480 170" fill="none" strokeWidth="1.5" className="stroke-map-water" />
      <path d="M70 236 C180 160 300 80 460 0" fill="none" strokeWidth="6" className="stroke-map-road" />
      <mask id={mask}>
        <motion.path d={ROUTE} fill="none" stroke="white" strokeWidth="8" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={view} transition={{ duration: 1.2, ease: EASE }} />
      </mask>
      <path d={ROUTE} fill="none" strokeWidth="2" strokeDasharray="5 4" mask={`url(#${mask})`} style={{ stroke: dayColor(0) }} />
      {PINS.map((p, i) => (
        <foreignObject key={p.n} x={p.x - 13} y={p.y - 13} width="26" height="26">
          <motion.div initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={view} transition={{ type: "spring", stiffness: 400, damping: 22, delay: i * 0.25 }}>
            <DayPin n={p.n} day={p.n - 1} />
          </motion.div>
        </foreignObject>
      ))}
    </svg>
  );
}

/** Counts up to `minor` once on first view; shows the final amount straight away with reduced motion. */
function CountUp({ minor, currency }: { minor: number; currency: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(minor);
      return;
    }
    const controls = animate(0, minor, { duration: 1.2, ease: EASE, onUpdate: (v) => setValue(Math.round(v)) });
    return () => controls.stop();
  }, [inView, reduced, minor]);
  return (
    <span ref={ref}>
      <Money minor={value} currency={currency} />
    </span>
  );
}

export function BudgetVisual() {
  const t = useTranslations("landing.modules");
  const taras = t("demo.taras");
  const rows = [
    { from: t("demo.andrii"), color: 3, minor: 226000 },
    { from: t("demo.marta"), color: 2, minor: 124000 },
    { from: t("demo.oksana"), color: 0, minor: 78000 },
  ];
  return (
    <div className={`${card} w-full max-w-[340px]`}>
      <p className="border-b border-border px-4 py-3 text-body font-semibold">{t("demo.settleTitle")}</p>
      <ul>
        {rows.map((r) => (
          <li key={r.from} className="flex items-center gap-2 border-b border-border px-4 py-2.5 last:border-b-0">
            <Avatar name={r.from} color={participantColor(r.color)} size={22} />
            <ArrowRight size={16} strokeWidth={1.5} className="text-fg-faint" aria-hidden />
            <Avatar name={taras} color={participantColor(1)} size={22} />
            <span className="min-w-0 flex-1 truncate text-small text-fg-secondary">
              {r.from.split(" ")[0]} → {taras.split(" ")[0]}
            </span>
            <span className="amount">
              <CountUp minor={r.minor} currency="UAH" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PollVisual() {
  const t = useTranslations("landing.modules");
  const options = [
    { label: t("demo.option1"), votes: 2, mine: true },
    { label: t("demo.option2"), votes: 1 },
    { label: t("demo.option3"), votes: 0 },
  ];
  const voted = options.reduce((s, o) => s + o.votes, 0);
  return (
    <div className={`${card} flex w-full max-w-[360px] flex-col gap-2 p-3`}>
      <div className="flex items-baseline justify-between gap-3 pb-1">
        <p className="text-body font-semibold">{t("demo.pollQuestion")}</p>
        <span className="shrink-0 text-caption text-fg-muted">{t("demo.pollVotes", { voted, total: 4 })}</span>
      </div>
      {options.map((o, i) => (
        <div key={o.label} className={`relative flex items-center gap-3 overflow-hidden rounded-md border px-3 py-2 text-small ${o.mine ? "border-primary font-semibold" : "border-border"}`}>
          <motion.span
            className={`absolute inset-y-0 left-0 ${o.mine ? "bg-primary-subtle" : "bg-sunken"}`}
            initial={{ width: 0 }}
            whileInView={{ width: `${(o.votes / voted) * 100}%` }}
            viewport={view}
            transition={{ duration: 0.7, ease: EASE, delay: 0.2 + i * 0.1 }}
          />
          <span className="relative min-w-0 flex-1">{o.label}</span>
          <span className="relative tabular-nums">{o.votes}</span>
        </div>
      ))}
    </div>
  );
}
