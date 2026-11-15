"use client";

import { MousePointer2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Avatar, dayColor, participantColor } from "@/components/avatar";
import { DayPin } from "./day-pin";
import { EASE, useLoop } from "./motion";

type StopId = "1" | "2" | "3" | "4";
const BEFORE: StopId[] = ["1", "2", "3", "4"];
const AFTER: StopId[] = ["1", "2", "4", "3"];
// Pin positions in % of the map pane; the route uses the same 0–100 space.
const POS: Record<StopId, { x: number; y: number }> = { "1": { x: 18, y: 78 }, "2": { x: 42, y: 52 }, "3": { x: 70, y: 32 }, "4": { x: 78, y: 70 } };
const CURSOR = [{ x: 30, y: 62 }, { x: 52, y: 46 }, { x: 74, y: 58 }, { x: 62, y: 28 }, { x: 28, y: 40 }];
// Scene: 0 rest · 1 Тарас edits stop 2 · 2 stop 4 is lifted · 3 dropped before stop 3 (pins renumber) · 4 hold.
const STEPS = 5;
const MS = 1800;

/** Product preview for the hero (DESIGN.md §7.1): a looping, translated mock of the trip workspace. */
export function HeroPreview() {
  const t = useTranslations("landing");
  const ti = useTranslations("itinerary");
  const { ref, step } = useLoop<HTMLDivElement>(STEPS, MS, 1);
  const order = step >= 3 ? AFTER : BEFORE;
  const lifted: StopId | null = step === 2 ? "4" : null;
  const editing: StopId | null = step === 1 ? "2" : null;
  const taras = participantColor(1);
  const marta = participantColor(2);
  const cursor = CURSOR[step] ?? CURSOR[0]!;
  const route = order.map((id, i) => `${i ? "L" : "M"}${POS[id].x} ${POS[id].y}`).join(" ");
  const first = (key: "taras" | "marta") => t(`modules.demo.${key}`).split(" ")[0]!;

  const rows = order.flatMap((id, i) => {
    const isLifted = lifted === id;
    const row = (
      <motion.li
        key={id}
        layout
        animate={{ rotate: isLifted ? -1.5 : 0, x: isLifted ? 14 : 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className={`relative flex items-center gap-3 rounded-md bg-surface px-3 py-2 ${isLifted ? "z-10 shadow-lg" : "border border-border"}`}
        style={editing === id ? { borderColor: taras } : undefined}
      >
        <DayPin n={i + 1} day={1} />
        <div className="min-w-0 flex-1">
          <p className="text-small font-semibold">{t(`preview.stops.${id}.title`)}</p>
          <p className="text-caption tabular-nums text-fg-muted">{t(`preview.stops.${id}.meta`)}</p>
        </div>
        <AnimatePresence>
          {editing === id && (
            <motion.span
              key="tag"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute -top-2.5 right-3 rounded-[4px] px-1.5 py-0.5 text-[11px] font-semibold text-p-foreground"
              style={{ backgroundColor: taras }}
            >
              {ti("editing", { name: first("taras") })}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.li>
    );
    // Dashed drop slot between stops 2 and 3 while stop 4 hovers over it.
    return step === 2 && i === 1 ? [row, <motion.li key="drop" layout className="h-1.5 rounded-sm border border-dashed border-primary-400 bg-primary-subtle" />] : [row];
  });

  return (
    <motion.div
      ref={ref}
      role="img"
      aria-label={t("preview.label")}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.3 }}
      className="overflow-hidden rounded-xl bg-surface shadow-lg"
    >
      <div className="flex h-14 items-center justify-between gap-3 border-b border-border px-4">
        <div className="min-w-0">
          <p className="text-small font-semibold">{t("preview.tripTitle")}</p>
          <p className="text-caption text-fg-muted">{t("preview.tripMeta")}</p>
        </div>
        <div className="flex shrink-0 -space-x-1.5">
          {(["oksana", "taras", "marta", "andrii"] as const).map((k, i) => (
            <span key={k} className="rounded-full ring-2 ring-surface">
              <Avatar name={t(`modules.demo.${k}`)} color={participantColor(i)} size={26} />
            </span>
          ))}
        </div>
      </div>
      <div className="grid h-[320px] grid-cols-1 sm:grid-cols-[minmax(0,240px)_1fr]">
        <div className="flex flex-col gap-2 overflow-hidden p-3 sm:border-r sm:border-border">
          <div className="flex items-center gap-2 pb-1">
            <DayPin n={2} day={1} />
            <span className="text-small font-semibold">{t("preview.day")}</span>
            <span className="text-caption text-fg-muted">{t("preview.dayDate")}</span>
          </div>
          <ul className="flex flex-col gap-2">{rows}</ul>
        </div>
        <div className="relative overflow-hidden max-sm:hidden">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full">
            <rect width="100" height="100" className="fill-map-land" />
            <path d="M0 22 C25 8 45 28 65 14 S92 4 100 10 V0 H0Z" className="fill-map-forest" />
            <path d="M0 55 C20 50 35 62 55 56 S85 46 100 54" fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" className="stroke-map-water" />
            <path d="M30 100 C45 70 70 40 88 0" fill="none" strokeWidth="6" vectorEffect="non-scaling-stroke" className="stroke-map-road" />
            <motion.path
              initial={false}
              animate={{ d: route }}
              transition={{ duration: 0.35, ease: EASE }}
              fill="none"
              strokeWidth="2"
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
              style={{ stroke: dayColor(1) }}
            />
          </svg>
          {BEFORE.map((id) => (
            <div key={id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${POS[id].x}%`, top: `${POS[id].y}%` }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.6 + Number(id) * 0.1 }}>
                <DayPin n={order.indexOf(id) + 1} day={1} />
              </motion.div>
            </div>
          ))}
          <motion.div aria-hidden initial={false} animate={{ left: `${cursor.x}%`, top: `${cursor.y}%` }} transition={{ duration: 1.1, ease: EASE }} className="absolute z-10 flex items-start">
            <MousePointer2 size={16} strokeWidth={1.5} fill="currentColor" style={{ color: marta }} />
            <span className="ml-0.5 mt-3 rounded-[4px] px-1.5 py-0.5 text-[11px] font-semibold text-p-foreground" style={{ backgroundColor: marta }}>
              {first("marta")}
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
