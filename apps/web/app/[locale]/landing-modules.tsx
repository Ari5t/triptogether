import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Avatar, dayColor, participantColor } from "@/components/avatar";
import { Money } from "@/components/money";

type Tr = Awaited<ReturnType<typeof getTranslations<"landing.modules">>>;

/** Rounded-square day/stop marker (DESIGN.md §6: days = squares with a number). */
function DayPin({ n, day }: { n: number; day: number }) {
  return (
    <span className="grid size-6.5 shrink-0 place-items-center rounded-[7px] text-caption text-day-foreground" style={{ backgroundColor: dayColor(day) }}>
      {n}
    </span>
  );
}

const card = "rounded-lg border border-border bg-surface";

function ItineraryVisual({ t }: { t: Tr }) {
  const stops = [
    { n: 1, title: t("demo.stop1"), time: "10:00" },
    { n: 2, title: t("demo.stop2"), time: "13:00", dragging: true },
    { n: 3, title: t("demo.stop3"), time: "17:00" },
  ];
  return (
    <div className="flex w-full max-w-[340px] flex-col gap-2">
      {stops.map((s) => (
        <div key={s.n} className="contents">
          <div className={`flex items-center gap-3 rounded-md bg-surface px-3 py-2.5 ${s.dragging ? "translate-x-3.5 -rotate-[1.5deg] shadow-lg" : "border border-border"}`}>
            <DayPin n={s.n} day={2} />
            <span className="min-w-0 flex-1 text-body font-semibold">{s.title}</span>
            <span className="text-small tabular-nums text-fg-muted">{s.time}</span>
          </div>
          {s.dragging && <div className="h-1.5 rounded-sm border border-dashed border-primary-400 bg-primary-subtle" />}
        </div>
      ))}
    </div>
  );
}

function MapVisual() {
  const pins = [
    { n: 1, x: 120, y: 175 },
    { n: 2, x: 230, y: 140 },
    { n: 3, x: 320, y: 100 },
    { n: 4, x: 400, y: 70 },
  ];
  return (
    <svg viewBox="0 0 480 236" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
      <rect width="480" height="236" className="fill-map-land" />
      <path d="M0 60 C120 20 200 80 300 40 S440 10 480 30 V0 H0Z" className="fill-map-forest" />
      <path d="M0 120 C100 110 160 140 240 125 S400 100 480 130" fill="none" strokeWidth="2" className="stroke-map-water" />
      <path d="M0 150 C120 160 200 170 300 150 S420 160 480 170" fill="none" strokeWidth="1.5" className="stroke-map-water" />
      <path d="M70 236 C180 160 300 80 460 0" fill="none" strokeWidth="6" className="stroke-map-road" />
      <polyline points={pins.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" strokeWidth="2" strokeDasharray="5 4" style={{ stroke: dayColor(0) }} />
      {pins.map((p) => (
        <foreignObject key={p.n} x={p.x - 13} y={p.y - 13} width="26" height="26">
          <DayPin n={p.n} day={p.n - 1} />
        </foreignObject>
      ))}
    </svg>
  );
}

function BudgetVisual({ t }: { t: Tr }) {
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
              <Money minor={r.minor} currency="UAH" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PollVisual({ t }: { t: Tr }) {
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
      {options.map((o) => (
        <div key={o.label} className={`relative flex items-center gap-3 overflow-hidden rounded-md border px-3 py-2 text-small ${o.mine ? "border-primary font-semibold" : "border-border"}`}>
          <span className={`absolute inset-y-0 left-0 ${o.mine ? "bg-primary-subtle" : "bg-sunken"}`} style={{ width: `${(o.votes / voted) * 100}%` }} />
          <span className="relative min-w-0 flex-1">{o.label}</span>
          <span className="relative tabular-nums">{o.votes}</span>
        </div>
      ))}
    </div>
  );
}

export async function LandingModules() {
  const t = await getTranslations("landing.modules");
  const modules: { key: "itinerary" | "map" | "budget" | "discussion"; visual: ReactNode }[] = [
    { key: "itinerary", visual: <ItineraryVisual t={t} /> },
    { key: "map", visual: <MapVisual /> },
    { key: "budget", visual: <BudgetVisual t={t} /> },
    { key: "discussion", visual: <PollVisual t={t} /> },
  ];
  return (
    <section aria-labelledby="modules-title" className="mx-auto flex max-w-content flex-col gap-12 px-[clamp(16px,4vw,40px)] py-24">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 id="modules-title" className="max-w-[640px] font-display text-[clamp(30px,3vw,40px)] font-bold leading-[1.2] tracking-[-0.02em]">
          {t("title")}
        </h2>
        <p className="max-w-[380px] text-[15px] leading-6 text-fg-secondary">{t("intro")}</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(520px,100%),1fr))] gap-x-12 gap-y-10">
        {modules.map(({ key, visual }) => (
          <article key={key} className="flex flex-col gap-3">
            {/* Illustration only: the same content is described by the heading and text below. */}
            <div aria-hidden className="relative mb-3 grid h-[300px] place-items-center overflow-hidden rounded-xl bg-sunken p-8">
              {visual}
            </div>
            <h3 className="font-display text-h3">{t(`${key}.title`)}</h3>
            <p className="max-w-[460px] text-[15px] leading-6 text-fg-secondary">{t(`${key}.text`)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
