"use client";

import { Calendar } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { TripRole } from "@triptogether/shared";
import { Avatar, participantColor } from "@/components/avatar";
import { RoleBadge } from "@/components/role-badge";
import { Link } from "@/i18n/navigation";
import { formatRange } from "@/lib/format";

export interface TripItem {
  id: string;
  title: string;
  destination: string | null;
  startDate: string;
  endDate: string;
  coverUrl: string | null;
  role: TripRole;
  members: { userId: string; name: string }[];
}

// No photos yet: covers are quiet theme-aware tones, picked by id so a trip keeps its colour.
const TONES = ["bg-map-forest", "bg-map-water", "bg-sunken"];
const tone = (id: string) => TONES[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % TONES.length]!;

export function TripsView({ planned, past }: { planned: TripItem[]; past: TripItem[] }) {
  const t = useTranslations("trips");
  const [tab, setTab] = useState<"planned" | "past">(planned.length === 0 && past.length > 0 ? "past" : "planned");
  const tabs = [
    { id: "planned", label: t("planned"), count: planned.length },
    { id: "past", label: t("past"), count: past.length },
  ] as const;

  return (
    <div className="flex flex-col gap-8">
      <div role="tablist" className="flex gap-1 border-b">
        {tabs.map((x) => (
          <button
            key={x.id}
            role="tab"
            type="button"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`h-10 px-3 text-body ${tab === x.id ? "font-semibold text-fg shadow-[inset_0_-2px_0_var(--primary)]" : "font-medium text-fg-muted"}`}
          >
            {x.label} <span className="font-medium text-fg-muted">{x.count}</span>
          </button>
        ))}
      </div>
      {tab === "planned" ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(360px,100%),1fr))] gap-6">
          {planned.map((trip) => (
            <li key={trip.id}>
              <TripCard trip={trip} />
            </li>
          ))}
        </ul>
      ) : (
        <PastList trips={past} />
      )}
    </div>
  );
}

function TripCard({ trip }: { trip: TripItem }) {
  const t = useTranslations("trips");
  const locale = useLocale();
  const shown = trip.members.slice(0, 4);
  const extra = trip.members.length - shown.length;
  return (
    <Link href={`/trips/${trip.id}`} className="flex flex-col overflow-hidden rounded-lg border bg-surface hover:shadow-xs">
      {trip.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={trip.coverUrl} alt="" className="h-[184px] w-full object-cover" />
      ) : (
        <div className={`h-[184px] ${tone(trip.id)}`} aria-hidden />
      )}
      <div className="flex flex-col gap-3.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[18px] font-bold leading-6 tracking-[-0.01em]">{trip.title}</h2>
          <RoleBadge role={trip.role} label={t(`role.${trip.role}`)} />
        </div>
        {trip.destination && <p className="-mt-1.5 text-small text-fg-secondary">{trip.destination}</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-small tabular-nums text-fg-secondary">
            <Calendar size={16} strokeWidth={1.5} aria-hidden />
            {formatRange(locale, trip.startDate, trip.endDate)}
          </p>
          <div role="img" aria-label={trip.members.map((m) => m.name).join(", ")} className="flex -space-x-1.5">
            {shown.map((m, i) => (
              <span key={m.userId} className="rounded-full ring-2 ring-surface">
                <Avatar name={m.name} color={participantColor(i)} size={26} />
              </span>
            ))}
            {extra > 0 && <span className="grid size-[26px] place-items-center rounded-full bg-sunken text-[10px] font-semibold text-fg-secondary ring-2 ring-surface">+{extra}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

function PastList({ trips }: { trips: TripItem[] }) {
  const t = useTranslations("trips");
  const locale = useLocale();
  if (trips.length === 0) return <p className="text-body text-fg-muted">{t("noPast")}</p>;
  return (
    <ul className="rounded-lg border bg-surface">
      {trips.map((trip) => (
        <li key={trip.id} className="border-t first:border-t-0">
          <Link href={`/trips/${trip.id}`} className="grid grid-cols-[48px_1fr_auto] items-center gap-4 px-4 py-3 hover:bg-primary-subtle">
            <span className={`h-9 rounded-sm ${tone(trip.id)}`} aria-hidden />
            <span className="min-w-0">
              <span className="block truncate text-body font-semibold">{trip.title}</span>
              {trip.destination && <span className="block truncate text-[12px] text-fg-muted">{trip.destination}</span>}
            </span>
            <span className="text-small tabular-nums text-fg-secondary">{formatRange(locale, trip.startDate, trip.endDate, true)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
