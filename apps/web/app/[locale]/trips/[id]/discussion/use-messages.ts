"use client";

import type { MessageView, PollView } from "@triptogether/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { useTripEvents } from "@/lib/use-trip-socket";

interface Page {
  messages: MessageView[];
  polls: PollView[];
  hasMore: boolean;
}

const TYPING_MS = 3000;

/** Messages of one thread (general chat when itemId is null) with history paging and live updates. */
export function useMessages(tripId: string, itemId: string | null) {
  const [messages, setMessages] = useState<MessageView[]>([]);
  const [polls, setPolls] = useState<Map<string, PollView>>(new Map());
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState<Map<string, number>>(new Map());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const query = (extra = "") => `/trips/${tripId}/messages?limit=50${itemId ? `&itemId=${encodeURIComponent(itemId)}` : ""}${extra}`;
  const mergePolls = (list: PollView[]) => setPolls((m) => new Map([...m, ...list.map((p) => [p.id, p] as const)]));

  useEffect(() => {
    let stale = false;
    setLoading(true);
    setMessages([]);
    apiFetch<Page>(query())
      .then((page) => {
        if (stale) return;
        setMessages(page.messages);
        mergePolls(page.polls);
        setHasMore(page.hasMore);
      })
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, itemId]);

  const add = useCallback((m: MessageView) => setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m])), []);

  const socket = useTripEvents({
    "chat:message": ({ message }) => {
      if (message.itemId === itemId) add(message);
    },
    "poll:created": ({ poll }) => mergePolls([poll]),
    "poll:updated": ({ poll }) => mergePolls([poll]),
    "chat:typing": ({ userId, itemId: typingItem }) => {
      if (typingItem !== itemId) return;
      setTyping((m) => new Map(m).set(userId, Date.now()));
      clearTimeout(timers.current.get(userId));
      timers.current.set(
        userId,
        setTimeout(() => setTyping((m) => { const n = new Map(m); n.delete(userId); return n; }), TYPING_MS),
      );
    },
  });

  async function loadOlder() {
    const first = messages[0];
    if (!first) return;
    const page = await apiFetch<Page>(query(`&before=${encodeURIComponent(first.id)}`));
    setMessages((list) => [...page.messages, ...list]);
    mergePolls(page.polls);
    setHasMore(page.hasMore);
  }

  async function send(body: string) {
    add(await apiFetch<MessageView>(`/trips/${tripId}/messages`, { method: "POST", body: JSON.stringify({ body, itemId: itemId ?? undefined }) }));
  }

  async function vote(pollId: string, optionIds: string[]) {
    const poll = await apiFetch<PollView>(`/polls/${pollId}/vote`, { method: "POST", body: JSON.stringify({ optionIds }) });
    mergePolls([poll]);
  }

  return { messages, polls, hasMore, loading, typingIds: [...typing.keys()], online: socket.online, emitTyping: () => socket.emitTyping(itemId), loadOlder, send, vote };
}
