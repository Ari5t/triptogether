"use client";

import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { Member, PollView } from "@triptogether/shared";
import { Avatar, participantColor } from "@/components/avatar";

interface Props {
  poll: PollView;
  members: Member[];
  currentUserId: string;
  onVote: (optionIds: string[]) => Promise<void>;
}

/** Poll with live counts (DESIGN.md §6.15). Options are toggle buttons, so the count is also visible text. */
export function PollCard({ poll, members, currentUserId, onVote }: Props) {
  const t = useTranslations("discussion.poll");
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const total = poll.options.reduce((n, o) => n + o.voterIds.length, 0);
  const voters = new Set(poll.options.flatMap((o) => o.voterIds));
  const mine = new Set(poll.options.filter((o) => o.voterIds.includes(currentUserId)).map((o) => o.id));
  const byId = new Map(members.map((m, i) => [m.userId, { name: m.name, color: participantColor(i) }]));
  const missing = members.filter((m) => !voters.has(m.userId));

  async function toggle(optionId: string) {
    if (poll.closed || pending) return;
    const next = new Set(mine);
    if (next.has(optionId)) next.delete(optionId);
    else if (poll.multiChoice) next.add(optionId);
    else {
      next.clear();
      next.add(optionId);
    }
    setPending(true);
    try {
      await onVote([...next]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex max-w-[520px] flex-col gap-3 rounded-lg border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-h4">{poll.question}</h3>
          <p className="text-[12px] text-fg-muted">{poll.multiChoice ? t("multi") : t("single")}</p>
        </div>
        {poll.closed ? (
          <span className="rounded-full bg-sunken px-2 py-0.5 text-[12px] font-medium text-fg-secondary">{t("closed")}</span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-success-subtle px-2 py-0.5 text-[12px] font-medium text-success-ink">
            <span className="size-1.5 rounded-full bg-success" aria-hidden />
            {t("live")}
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {poll.options.map((o) => {
          const on = mine.has(o.id);
          const share = total ? (o.voterIds.length / total) * 100 : 0;
          return (
            <li key={o.id}>
              <button
                type="button"
                aria-pressed={on}
                disabled={poll.closed}
                onClick={() => toggle(o.id)}
                className={`relative flex min-h-12 w-full items-center gap-2.5 overflow-hidden rounded-md border px-3 text-left ${on ? "border-primary" : ""}`}
              >
                <span className={`absolute inset-y-0 left-0 ${on ? "bg-primary-muted" : "bg-sunken"}`} style={{ width: `${share}%` }} aria-hidden />
                <span className={`relative grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] ${on ? "border-primary" : "border-border-strong"}`} aria-hidden>
                  {on && <Check size={11} strokeWidth={3} className="text-primary" />}
                </span>
                <span className={`relative min-w-0 flex-1 truncate text-body ${on ? "font-semibold" : "font-medium"}`}>{o.label}</span>
                <span className="relative flex -space-x-1">
                  {o.voterIds.map((id) => {
                    const v = byId.get(id);
                    return v ? <Avatar key={id} name={v.name} color={v.color} size={20} /> : null;
                  })}
                </span>
                <span className="relative w-5 text-right text-body font-semibold tabular-nums">{o.voterIds.length}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="flex flex-wrap justify-between gap-x-3 text-[12px] text-fg-muted">
        <span>
          {t("voted", { done: voters.size, all: members.length })}
          {missing.length > 0 && missing.length <= 2 && ` · ${t("notYet", { names: missing.map((m) => m.name.split(" ")[0]).join(", ") })}`}
        </span>
        {poll.closesAt && !poll.closed && <span>{t("closes", { date: new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "long" }).format(new Date(poll.closesAt)) })}</span>}
      </p>
    </div>
  );
}
