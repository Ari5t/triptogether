"use client";

import { ChevronRight, MessageCircle, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { dayColor } from "@/components/avatar";
import { Button } from "@/components/button";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/client-api";
import { useTripEvents } from "@/lib/use-trip-socket";
import type { TripSummary } from "../trip-header";
import { ChatPanel } from "./chat-panel";

export interface Thread {
  id: string;
  title: string;
  dayNumber: number;
  date: string;
  startTime: string | null;
  count: number;
}

export function DiscussionView({ trip, threads: initial }: { trip: TripSummary; threads: Thread[] }) {
  const t = useTranslations("discussion");
  const locale = useLocale();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedId = params.get("thread");
  const [threads, setThreads] = useState(initial);
  const selected = threads.find((x) => x.id === selectedId) ?? null;

  // The server is the source of truth for counts: reload the list after a new comment and after a reconnect,
  // so a missed event can never leave a wrong number behind.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const refresh = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void apiFetch<Thread[]>(`/trips/${trip.id}/threads`).then(setThreads).catch(() => {}), 250);
  };
  const { connected } = useTripEvents({ "chat:message": ({ message }) => message.itemId && refresh() });
  const wasConnected = useRef(false);
  useEffect(() => {
    if (connected && wasConnected.current) refresh();
    if (connected) wasConnected.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);
  useEffect(() => () => clearTimeout(timer.current), []);

  // URL only, no router navigation: a navigation would refetch the thread counts from the server and double-count the live increments below. useSearchParams follows history.replaceState.
  const open = (id: string | null) => window.history.replaceState(null, "", id ? `${pathname}?thread=${encodeURIComponent(id)}` : pathname);
  const canPoll = trip.role !== "VIEWER";
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

  return (
    <div className="flex min-h-0 flex-1 flex-wrap lg:h-[calc(100dvh-57px)]">
      <nav aria-label={t("threads")} className="flex flex-[0_1_240px] flex-col gap-1 overflow-y-auto border-r px-3 py-4">
        <button type="button" aria-current="page" onClick={() => open(null)} className="flex h-10 items-center gap-2.5 rounded-md bg-primary-subtle px-2.5 text-body font-semibold text-primary-ink">
          <MessageCircle size={16} strokeWidth={1.5} aria-hidden />
          {t("general")}
        </button>
        <p className="label px-2.5 pb-1 pt-5">{t("stopThreads")}</p>
        {threads.length === 0 && <p className="px-2.5 text-small text-fg-muted">{t("noStops")}</p>}
        {threads.map((x) => {
          const active = x.id === selected?.id;
          const count = x.count;
          return (
            <button key={x.id} type="button" aria-current={active} onClick={() => open(x.id)} className={`flex min-h-10 items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-small ${active ? "bg-surface font-semibold shadow-xs" : "hover:bg-sunken"}`}>
              <span className="grid size-[18px] shrink-0 place-items-center rounded-[5px] text-[10px] font-bold text-day-foreground" style={{ backgroundColor: dayColor(x.dayNumber - 1) }} aria-hidden>
                {x.dayNumber}
              </span>
              <span className="min-w-0 flex-1 truncate">{x.title}</span>
              <span className={`text-[12px] font-semibold tabular-nums ${active ? "text-primary" : "text-fg-muted"}`}>{count}</span>
            </button>
          );
        })}
      </nav>

      <section aria-label={t("general")} className="flex min-w-0 flex-[999_1_480px] flex-col">
        <ChatPanel tripId={trip.id} itemId={null} members={trip.members} currentUserId={trip.currentUserId} canCreatePoll={canPoll} variant="chat" />
      </section>

      {selected && (
        <aside aria-label={t("stopComments")} className="flex min-h-0 max-w-[400px] flex-[1_1_360px] flex-col border-l bg-canvas">
          <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
            <p className="label">{t("stopComments")}</p>
            <Button variant="ghost" size="sm" aria-label={t("closeThread")} onClick={() => open(null)} className="size-8 px-0 text-fg-secondary">
              <X size={16} strokeWidth={1.5} aria-hidden />
            </Button>
          </div>
          <div className="px-5 pt-4">
            <Link href={`/trips/${trip.id}`} className="flex items-center gap-2.5 rounded-lg border bg-surface p-3">
              <span className="grid size-[22px] shrink-0 place-items-center rounded-sm text-[11px] font-bold text-day-foreground" style={{ backgroundColor: dayColor(selected.dayNumber - 1) }} aria-hidden>
                {selected.dayNumber}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold">{selected.title}</span>
                <span className="block text-[12px] tabular-nums text-fg-muted">
                  {t("dayMeta", { n: selected.dayNumber, date: date(selected.date) })}
                  {selected.startTime && ` · ${selected.startTime}`}
                </span>
              </span>
              <ChevronRight size={16} strokeWidth={1.5} aria-hidden className="text-fg-muted" />
            </Link>
          </div>
          <ChatPanel key={selected.id} tripId={trip.id} itemId={selected.id} members={trip.members} currentUserId={trip.currentUserId} canCreatePoll={false} variant="thread" />
        </aside>
      )}
    </div>
  );
}
