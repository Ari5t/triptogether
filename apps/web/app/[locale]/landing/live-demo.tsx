"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Avatar, participantColor } from "@/components/avatar";
import { DayPin } from "./day-pin";
import { EASE, useLoop } from "./motion";

type Who = "oksana" | "taras";
// Scene: 0 rest · 1 Оксана edits stop 2 · 2 edit lands on both screens · 3 Тарас votes, Марта joins · 4 hold.
const STEPS = 5;
const MS = 1800;
const COLOR = { oksana: participantColor(0), taras: participantColor(1), marta: participantColor(2) };

function Screen({ who, step }: { who: Who; step: number }) {
  const t = useTranslations("landing");
  const ti = useTranslations("itinerary");
  const first = (k: "oksana" | "taras" | "marta") => t(`modules.demo.${k}`).split(" ")[0]!;
  const author = who === "oksana"; // The author edits; the other screen only receives.
  const editing = step === 1;
  const title2 = step >= 2 ? t("live.stopAfter") : t("modules.demo.stop2");
  const stops = [
    { time: "10:00", title: t("modules.demo.stop1") },
    { time: "13:00", title: title2, live: true },
    { time: "17:00", title: t("modules.demo.stop3") },
  ];
  const votes = [2, step >= 3 ? 2 : 1];
  const voted = votes[0]! + votes[1]!;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-canvas p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption font-semibold text-fg-muted">{t("live.screen", { name: first(who) })}</p>
        <div className="flex -space-x-1.5">
          {(["oksana", "taras"] as const).map((k) => (
            <span key={k} className="rounded-full ring-2 ring-canvas">
              <Avatar name={t(`modules.demo.${k}`)} color={COLOR[k]} size={22} online />
            </span>
          ))}
          <AnimatePresence>
            {step >= 3 && (
              <motion.span key="marta" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="rounded-full ring-2 ring-canvas">
                <Avatar name={t("modules.demo.marta")} color={COLOR.marta} size={22} online />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {stops.map((s, i) => {
          const mine = s.live && editing && author;
          const theirs = s.live && editing && !author;
          return (
            <li key={i} className={`relative isolate flex items-center gap-2.5 rounded-md border bg-surface px-3 py-2 ${mine ? "border-primary" : "border-border"}`} style={theirs ? { borderColor: COLOR.oksana } : undefined}>
              <DayPin n={i + 1} day={1} />
              <motion.span key={s.title} initial={s.live ? { opacity: 0, y: 4 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="relative min-w-0 flex-1 text-small font-semibold">
                {s.title}
                {mine && <span aria-hidden className="ml-px inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-fg" />}
              </motion.span>
              <span className="relative text-caption tabular-nums text-fg-muted">{s.time}</span>
              {theirs && (
                <span className="absolute -top-2.5 right-3 rounded-[4px] px-1.5 py-0.5 text-[11px] font-semibold text-p-foreground" style={{ backgroundColor: COLOR.oksana }}>
                  {ti("editing", { name: first("oksana") })}
                </span>
              )}
              {/* Flash on the screen that receives the change. */}
              <AnimatePresence>
                {s.live && step === 2 && !author && <motion.span key="flash" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }} className="absolute inset-0 -z-10 rounded-md bg-primary-subtle" />}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-1.5 rounded-md border border-border bg-surface p-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-small font-semibold">{t("modules.demo.pollQuestion")}</p>
          <span className="shrink-0 text-caption tabular-nums text-fg-muted">{t("modules.demo.pollVotes", { voted, total: 4 })}</span>
        </div>
        {(["option1", "option2"] as const).map((k, i) => {
          const mine = i === 1 && step >= 3 && who === "taras";
          return (
            <div key={k} className={`relative flex items-center gap-2 overflow-hidden rounded-md border px-2.5 py-1.5 text-small ${mine ? "border-primary font-semibold" : "border-border"}`}>
              <motion.span className={`absolute inset-y-0 left-0 ${mine ? "bg-primary-subtle" : "bg-sunken"}`} initial={false} animate={{ width: `${(votes[i]! / voted) * 100}%` }} transition={{ duration: 0.5, ease: EASE }} />
              <span className="relative min-w-0 flex-1">{t(`modules.demo.${k}`)}</span>
              <span className="relative tabular-nums">{votes[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Two "screens" of the same trip: an edit and a vote on one appear on the other (real-time showcase). */
export function LiveDemo() {
  const t = useTranslations("landing.live");
  const { ref, step } = useLoop<HTMLDivElement>(STEPS, MS, 2);
  return (
    <div ref={ref} role="img" aria-label={t("label")} className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] items-start gap-4">
      <Screen who="oksana" step={step} />
      <Screen who="taras" step={step} />
    </div>
  );
}
