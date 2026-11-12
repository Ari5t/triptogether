"use client";

import { Map, MessageCircle, Route, Settings, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Tab = "route" | "map" | "budget" | "discussion" | "settings";

/** Mobile bottom navigation (DESIGN.md §6.21); hidden from md up, where the header tabs take over. */
export function TripBottomNav({ tripId, active, owner = false }: { tripId: string; active: Tab; owner?: boolean }) {
  const t = useTranslations("trip");
  const items = [
    { id: "route", href: `/trips/${tripId}`, label: t("route"), Icon: Route },
    { id: "map", href: `/trips/${tripId}?view=map`, label: t("map"), Icon: Map },
    { id: "budget", href: `/trips/${tripId}/budget`, label: t("budget"), Icon: Wallet },
    { id: "discussion", href: `/trips/${tripId}/discussion`, label: t("chat"), Icon: MessageCircle },
    ...(owner ? [{ id: "settings", href: `/trips/${tripId}/settings`, label: t("settings"), Icon: Settings }] : []),
  ] as const;
  return (
    <nav aria-label={t("sections")} className={`sticky bottom-0 z-20 grid shrink-0 ${owner ? "grid-cols-5" : "grid-cols-4"} border-t bg-surface px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 md:hidden`}>
      {items.map(({ id, href, label, Icon }) => {
        const on = id === active;
        return (
          <Link key={id} href={href} aria-current={on ? "page" : undefined} className={`flex h-14 flex-col items-center justify-center gap-1 text-[11px] ${on ? "font-semibold text-primary" : "font-medium text-fg-muted"}`}>
            <Icon size={20} strokeWidth={1.5} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
