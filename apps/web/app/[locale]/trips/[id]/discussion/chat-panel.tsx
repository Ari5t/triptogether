"use client";

import { BarChart3, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MessageView, Member } from "@triptogether/shared";
import { Avatar, participantColor } from "@/components/avatar";
import { Button } from "@/components/button";
import { PollCard } from "./poll-card";
import { PollDialog } from "./poll-dialog";
import { useMessages } from "./use-messages";

interface Props {
  tripId: string;
  /** null = general chat, otherwise comments on that stop. */
  itemId: string | null;
  members: Member[];
  currentUserId: string;
  canCreatePoll: boolean;
  variant: "chat" | "thread";
}

const dayKey = (iso: string) => iso.slice(0, 10) + new Date(iso).getTimezoneOffset();

export function ChatPanel({ tripId, itemId, members, currentUserId, canCreatePoll, variant }: Props) {
  const t = useTranslations("discussion");
  const locale = useLocale();
  const chat = useMessages(tripId, itemId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const lastTyping = useRef(0);
  const people = useMemo(() => new Map(members.map((m, i) => [m.userId, { name: m.name, color: participantColor(i) }])), [members]);
  const person = (id: string) => people.get(id) ?? { name: "?", color: "var(--p-olive)" };

  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000);
    return days === 0 ? t("today") : days === 1 ? t("yesterday") : new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(d);
  };

  // Stick to the bottom when new messages arrive, unless the reader scrolled up to history.
  const stick = useRef(true);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [chat.messages.length, chat.loading]);
  useEffect(() => {
    const el = scroller.current;
    const onScroll = () => el && (stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80);
    el?.addEventListener("scroll", onScroll);
    return () => el?.removeEventListener("scroll", onScroll);
  }, []);

  async function submit() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await chat.send(body);
      stick.current = true;
      setText("");
    } finally {
      setSending(false);
    }
  }

  const onChange = (value: string) => {
    setText(value);
    if (Date.now() - lastTyping.current > 2000) {
      lastTyping.current = Date.now();
      chat.emitTyping();
    }
  };

  const typingNames = chat.typingIds.filter((id) => id !== currentUserId).map((id) => person(id).name.split(" ")[0]);
  const isThread = variant === "thread";

  const renderMessage = (m: MessageView) => {
    const who = person(m.authorId);
    const own = m.authorId === currentUserId;
    const poll = m.pollId ? chat.polls.get(m.pollId) : undefined;
    const when = time.format(new Date(m.createdAt));
    if (poll) {
      return (
        <div className="flex gap-3">
          <Avatar name={who.name} color={who.color} size={isThread ? 28 : 32} />
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-[12px] text-fg-muted">
              <span className="text-body font-semibold text-fg">{who.name.split(" ")[0]}</span> {t("createdPoll")} · {when}
            </p>
            <PollCard poll={poll} members={members} currentUserId={currentUserId} onVote={(ids) => chat.vote(poll.id, ids)} />
          </div>
        </div>
      );
    }
    if (own && !isThread) {
      return (
        <div className="flex flex-col items-end gap-1">
          <p className="text-[12px] text-fg-muted">
            {t("you")} · {when}
          </p>
          <p className="max-w-[520px] whitespace-pre-wrap break-words rounded-[12px_12px_4px_12px] bg-primary-muted px-3.5 py-2.5 text-body text-primary-900">{m.body}</p>
        </div>
      );
    }
    return (
      <div className="flex gap-3">
        <Avatar name={who.name} color={who.color} size={isThread ? 28 : 32} />
        <div className="min-w-0">
          <p className="flex items-baseline gap-2">
            <span className="text-body font-semibold">{who.name.split(" ")[0]}</span>
            <span className="text-[12px] text-fg-muted">{when}</span>
          </p>
          <p className={`max-w-[560px] whitespace-pre-wrap break-words ${isThread ? "text-body leading-[21px]" : "text-body"}`}>{m.body}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scroller} className={`min-h-0 flex-1 overflow-y-auto ${isThread ? "px-5 py-4" : "px-8 py-5"}`}>
        {chat.hasMore && (
          <Button variant="ghost" size="sm" onClick={() => void chat.loadOlder()} className="mx-auto mb-3 flex">
            {t("older")}
          </Button>
        )}
        {!chat.loading && chat.messages.length === 0 && <p className="py-6 text-center text-small text-fg-muted">{isThread ? t("noComments") : t("noMessages")}</p>}
        <ol className={`flex flex-col ${isThread ? "gap-4" : "gap-[18px]"}`}>
          {chat.messages.map((m, i) => {
            const prev = chat.messages[i - 1];
            const newDay = !isThread && (!prev || dayKey(prev.createdAt) !== dayKey(m.createdAt));
            return (
              <li key={m.id} className="flex flex-col gap-[18px]">
                {newDay && (
                  <div role="separator" className="flex items-center gap-3 text-[12px] text-fg-muted">
                    <span className="h-px flex-1 bg-border" />
                    {dayLabel(m.createdAt)}
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                {renderMessage(m)}
              </li>
            );
          })}
        </ol>
      </div>

      <div className={isThread ? "border-t px-5 pb-5 pt-3" : "px-8 pb-5"}>
        <p role="status" className="mb-1 h-4 text-[12px] text-fg-muted">
          {typingNames.length > 0 && t("typing", { names: typingNames.join(", "), count: typingNames.length })}
        </p>
        {isThread ? (
          <div className="flex flex-col gap-2.5">
            <label className="text-small font-medium" htmlFor="reply">
              {t("reply")}
            </label>
            <textarea
              id="reply"
              value={text}
              rows={2}
              maxLength={2000}
              placeholder={t("commentPlaceholder")}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              className="w-full resize-none rounded-md border border-input bg-surface px-3 py-2.5 text-body"
            />
            <Button onClick={() => void submit()} disabled={!text.trim() || sending} className="self-end">
              {t("send")}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-input bg-surface py-1.5 pl-3.5 pr-1.5">
            <label htmlFor="composer" className="sr-only">
              {t("message")}
            </label>
            <input
              id="composer"
              value={text}
              maxLength={2000}
              placeholder={t("placeholder")}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
              className="h-9 min-w-0 flex-1 bg-transparent text-body outline-none focus-visible:shadow-none"
            />
            {canCreatePoll && (
              <Button variant="ghost" aria-label={t("createPoll")} onClick={() => setPollOpen(true)} className="size-10 px-0 text-fg-secondary">
                <BarChart3 size={20} strokeWidth={1.5} aria-hidden />
              </Button>
            )}
            <Button aria-label={t("send")} onClick={() => void submit()} disabled={!text.trim() || sending} className="size-10 px-0">
              <Send size={16} strokeWidth={1.5} aria-hidden />
            </Button>
          </div>
        )}
      </div>
      {pollOpen && <PollDialog tripId={tripId} onClose={() => setPollOpen(false)} />}
    </div>
  );
}
