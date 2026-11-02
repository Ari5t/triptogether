"use client";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { participantColor } from "@/components/avatar";
import { Itinerary } from "./itinerary/itinerary";
import { TripHeader, type TripSummary } from "./trip-header";
import type { Editor } from "./itinerary/stop-card";
import { useItinerary } from "./itinerary/use-itinerary";

// maplibre needs `window`, so the map is client-only.
const TripMap = dynamic(() => import("./trip-map"), { ssr: false });

interface Props {
  trip: TripSummary;
}

export function TripWorkspace({ trip }: Props) {
  const t = useTranslations("trip");
  const it = useItinerary(trip.id, trip.currentUserId);
  const colors = useMemo(() => new Map(trip.members.map((m, i) => [m.userId, participantColor(i)])), [trip.members]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const select = (id: string) => {
    setSelectedId(id);
    document.getElementById(`stop-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  // Who is editing which stop (never yourself); the list shows a tag, the map a ring.
  const editors = useMemo(() => {
    const info = new Map(trip.members.map((m) => [m.userId, { name: m.name, color: colors.get(m.userId)! }]));
    const out = new Map<string, Editor>();
    for (const p of it.peers) {
      const who = info.get(p.userId);
      if (p.userId !== trip.currentUserId && p.editing && who) out.set(p.editing, who);
    }
    return out;
  }, [it.peers, trip.members, trip.currentUserId, colors]);
  const online = trip.members.filter((m) => it.peers.some((p) => p.userId === m.userId));

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <TripHeader trip={trip} active="route" online={online} />
      <div className="flex min-h-0 flex-1 flex-wrap">
        <div className="min-h-0 flex-[1_1_480px] overflow-y-auto border-r bg-surface lg:max-w-[560px]">
          <Itinerary it={it} editable={trip.role !== "VIEWER"} editors={editors} selectedId={selectedId} onSelect={select} />
        </div>
        <div role="region" aria-label={t("map")} className="min-h-[360px] flex-[999_1_560px] bg-map-land">
          <TripMap days={it.days} selectedId={selectedId} onSelect={select} editors={editors} />
        </div>
      </div>
    </div>
  );
}
