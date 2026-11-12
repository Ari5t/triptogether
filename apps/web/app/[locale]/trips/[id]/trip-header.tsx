"use client";

import { Route } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Member, TripRole } from "@triptogether/shared";
import { eachDate } from "@triptogether/doc";
import { Avatar, participantColor } from "@/components/avatar";
import { LocaleSwitch } from "@/components/locale-switch";
import { ThemeSwitch } from "@/components/theme-switch";
import { Link } from "@/i18n/navigation";
import { formatRange } from "@/lib/format";
import { InviteDialog } from "./invite-dialog";

export interface TripSummary {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  members: Member[];
  role: TripRole;
  currentUserId: string;
}

interface Props {
  trip: TripSummary;
  active: "route" | "budget" | "discussion" | "settings";
  /** Members to show as online; without it every member is shown, no presence dots. */
  online?: Member[];
}

export function TripHeader({ trip, active, online }: Props) {
  const t = useTranslations("trip");
  const locale = useLocale();
  const shown = online ?? trip.members;
  const color = (id: string) => participantColor(trip.members.findIndex((m) => m.userId === id));
  const tabs = [
    { id: "route", href: `/trips/${trip.id}`, label: t("route") },
    { id: "budget", href: `/trips/${trip.id}/budget`, label: t("budget") },
    { id: "discussion", href: `/trips/${trip.id}/discussion`, label: t("discussion") },
    ...(trip.role === "OWNER" ? [{ id: "settings", href: `/trips/${trip.id}/settings`, label: t("settings") }] : []),
  ] as const;

  return (
    <header className="flex min-h-14 flex-wrap items-center gap-x-5 gap-y-2 border-b bg-surface px-4 py-2">
      <Link href="/trips" aria-label={t("backToTrips")} className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
        <Route size={16} strokeWidth={1.75} aria-hidden />
      </Link>
      <div className="flex flex-col">
        <h1 className="font-display text-[16px] font-bold leading-5 tracking-[-0.01em]">{trip.title}</h1>
        <p className="text-caption tabular-nums text-fg-muted">
          {formatRange(locale, trip.startDate, trip.endDate)} · {t("days", { count: eachDate(trip.startDate, trip.endDate).length })}
        </p>
      </div>
      <nav aria-label={t("sections")} className="ml-3 hidden gap-1 md:flex">
        {tabs.map((x) =>
          x.id === active ? (
            <span key={x.id} aria-current="page" className="flex h-9 items-center rounded-md bg-primary-subtle px-3 text-body font-semibold text-primary-ink">
              {x.label}
            </span>
          ) : (
            <Link key={x.id} href={x.href} className="flex h-9 items-center rounded-md px-3 text-body font-medium text-fg-secondary hover:bg-sunken">
              {x.label}
            </Link>
          ),
        )}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <div role="img" aria-label={t(online ? "online" : "members", { names: shown.map((m) => m.name).join(", ") })} className="flex -space-x-1.5">
          {shown.map((m) => (
            <span key={m.userId} className="rounded-full ring-2 ring-surface">
              <Avatar name={m.name} color={color(m.userId)} size={30} online={online !== undefined} />
            </span>
          ))}
        </div>
        {trip.role === "OWNER" && <InviteDialog tripId={trip.id} members={trip.members} currentUserId={trip.currentUserId} />}
        <ThemeSwitch />
        <LocaleSwitch />
      </div>
    </header>
  );
}
