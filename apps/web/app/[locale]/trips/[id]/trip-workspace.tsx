"use client";

import { Route } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import type { Member, TripRole } from "@triptogether/shared";
import { Avatar, participantColor } from "@/components/avatar";
import { LocaleSwitch } from "@/components/locale-switch";
import { Link } from "@/i18n/navigation";
import { eachDate } from "@triptogether/doc";
import { formatRange } from "@/lib/format";
import { InviteDialog } from "./invite-dialog";
import { Itinerary } from "./itinerary/itinerary";
import { useItinerary } from "./itinerary/use-itinerary";

interface Props {
  trip: { id: string; title: string; startDate: string; endDate: string; members: Member[]; role: TripRole; currentUserId: string };
}

export function TripWorkspace({ trip }: Props) {
  const t = useTranslations("trip");
  const locale = useLocale();
  const it = useItinerary(trip.id, trip.currentUserId);
  const colors = useMemo(() => new Map(trip.members.map((m, i) => [m.userId, participantColor(i)])), [trip.members]);
  const online = trip.members.filter((m) => it.peers.some((p) => p.userId === m.userId));
  const dayCount = eachDate(trip.startDate, trip.endDate).length;

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <header className="flex min-h-14 flex-wrap items-center gap-x-5 gap-y-2 border-b bg-surface px-4 py-2">
        <Link href="/trips" aria-label={t("backToTrips")} className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
          <Route size={16} strokeWidth={1.75} aria-hidden />
        </Link>
        <div className="flex flex-col">
          <h1 className="font-display text-[16px] font-bold leading-5 tracking-[-0.01em]">{trip.title}</h1>
          <p className="text-caption tabular-nums text-fg-muted">
            {formatRange(locale, trip.startDate, trip.endDate)} · {t("days", { count: dayCount })}
          </p>
        </div>
        <nav aria-label={t("sections")} className="ml-3 flex">
          <span aria-current="page" className="flex h-9 items-center rounded-md bg-primary-subtle px-3 text-body font-semibold text-primary-ink">
            {t("route")}
          </span>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div role="img" aria-label={t("online", { names: online.map((m) => m.name).join(", ") })} className="flex -space-x-1.5">
            {online.map((m) => (
              <span key={m.userId} className="rounded-full ring-2 ring-surface">
                <Avatar name={m.name} color={colors.get(m.userId)!} size={30} online />
              </span>
            ))}
          </div>
          {trip.role === "OWNER" && <InviteDialog tripId={trip.id} members={trip.members} currentUserId={trip.currentUserId} />}
          <LocaleSwitch />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-wrap">
        <div className="min-h-0 flex-[1_1_480px] overflow-y-auto border-r bg-surface lg:max-w-[560px]">
          <Itinerary it={it} members={trip.members} currentUserId={trip.currentUserId} editable={trip.role !== "VIEWER"} />
        </div>
        <div role="region" aria-label={t("map")} className="grid min-h-64 flex-[999_1_560px] place-items-center bg-map-land p-6 text-center text-small text-fg-secondary">
          {t("mapLater")}
        </div>
      </div>
    </div>
  );
}
