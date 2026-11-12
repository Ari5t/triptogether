"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { dayColor, participantColor } from "@/components/avatar";
import { TripBottomNav } from "@/components/bottom-nav";
import { Link } from "@/i18n/navigation";
import { useMediaQuery } from "@/lib/use-media-query";
import { MessageCircle, Navigation } from "lucide-react";
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
  const tItinerary = useTranslations("itinerary");
  const it = useItinerary(trip.id, trip.currentUserId);
  const colors = useMemo(() => new Map(trip.members.map((m, i) => [m.userId, participantColor(i)])), [trip.members]);
  // Below md the bottom nav switches between list and full-screen map (?view=map).
  const mapView = useSearchParams().get("view") === "map";
  // The map is only mounted while visible: a map created inside a display:none box measures 0x0 and never recovers.
  const mdUp = useMediaQuery("(min-width: 768px)");
  const showMap = mdUp || mapView;
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
  const selectedStop = useMemo(() => {
    for (const [dayIndex, d] of it.days.entries()) {
      const i = d.items.findIndex((x) => x.id === selectedId);
      if (i >= 0) return { item: d.items[i]!, number: i + 1, dayIndex };
    }
    return null;
  }, [it.days, selectedId]);
  const online = trip.members.filter((m) => it.peers.some((p) => p.userId === m.userId));

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <TripHeader trip={trip} active="route" online={online} />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className={`border-b bg-surface lg:min-h-0 lg:w-[560px] lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r ${mapView ? "hidden md:block" : ""}`}>
          <Itinerary tripId={trip.id} it={it} editable={trip.role !== "VIEWER"} editors={editors} selectedId={selectedId} onSelect={select} />
        </div>
        <div role="region" aria-label={t("map")} className={`relative bg-map-land md:h-[50dvh] lg:h-auto lg:min-h-0 lg:flex-1 ${mapView ? "min-h-0 flex-1" : "hidden md:block"}`}>
          {showMap && <TripMap days={it.days} selectedId={selectedId} onSelect={select} editors={editors} />}
          {selectedStop && (
            <div className="absolute inset-x-3 bottom-3 z-10 flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-md md:hidden">
              <div className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-[7px] text-[13px] font-bold text-day-foreground" style={{ backgroundColor: dayColor(selectedStop.dayIndex) }}>
                  {selectedStop.number}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-h4">{selectedStop.item.title}</p>
                  {selectedStop.item.address && <p className="truncate text-small text-fg-secondary">{selectedStop.item.address}</p>}
                </div>
                {selectedStop.item.startTime && <span className="text-body tabular-nums">{selectedStop.item.startTime}</span>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/trips/${trip.id}/discussion?thread=${selectedStop.item.id}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-border-strong text-body font-semibold">
                  <MessageCircle size={16} strokeWidth={1.5} aria-hidden />
                  {tItinerary("comments")}
                </Link>
                {selectedStop.item.lat != null && selectedStop.item.lng != null ? (
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedStop.item.lat},${selectedStop.item.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-primary text-body font-semibold text-primary-foreground">
                    <Navigation size={16} strokeWidth={1.5} aria-hidden />
                    {t("directions")}
                  </a>
                ) : (
                  <span />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <TripBottomNav tripId={trip.id} active={mapView ? "map" : "route"} owner={trip.role === "OWNER"} />
    </div>
  );
}
