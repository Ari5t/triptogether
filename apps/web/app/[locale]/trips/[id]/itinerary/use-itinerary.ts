"use client";

import { HocuspocusProvider } from "@hocuspocus/provider";
import { addItem, moveItem, readDays, removeItem, updateItem, type DayView, type ItemView, type NewItem } from "@triptogether/doc";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { apiFetch } from "@/lib/client-api";

export type ConnectionState = "connecting" | "connected" | "disconnected";
export interface Peer {
  clientId: number;
  userId: string;
  editing: string | null;
}

const COLLAB_URL = process.env.NEXT_PUBLIC_COLLAB_URL ?? "ws://localhost:4200";

export function useItinerary(tripId: string, userId: string) {
  const doc = useMemo(() => new Y.Doc(), []);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const [days, setDays] = useState<DayView[]>([]);
  const [synced, setSynced] = useState(false);
  const [state, setState] = useState<ConnectionState>("connecting");
  const [peers, setPeers] = useState<Peer[]>([]);

  useEffect(() => {
    const provider = new HocuspocusProvider({
      url: COLLAB_URL,
      name: `trip:${tripId}`,
      document: doc,
      // Fetched on every (re)connect: the token lives only 5 minutes.
      token: async () => (await apiFetch<{ token: string }>("/collab/token", { method: "POST", body: JSON.stringify({ tripId }) })).token,
      onSynced: () => setSynced(true),
      onStatus: ({ status }) => setState(status === "connected" ? "connected" : status === "connecting" ? "connecting" : "disconnected"),
    });
    providerRef.current = provider;
    const awareness = provider.awareness;
    awareness?.setLocalStateField("user", { userId });

    const read = () => setDays(readDays(doc));
    const readPeers = () => {
      if (!awareness) return;
      const out: Peer[] = [];
      awareness.getStates().forEach((s, clientId) => {
        const u = s.user as { userId?: string } | undefined;
        if (u?.userId) out.push({ clientId, userId: u.userId, editing: (s.editing as string | null) ?? null });
      });
      setPeers(out);
    };
    doc.on("update", read);
    awareness?.on("change", readPeers);
    read();
    readPeers();
    return () => {
      doc.off("update", read);
      awareness?.off("change", readPeers);
      provider.destroy();
      providerRef.current = null;
    };
  }, [doc, tripId, userId]);

  return {
    days,
    synced,
    state,
    peers,
    add: (dayId: string, item: NewItem, index?: number) => addItem(doc, dayId, item, index),
    remove: (itemId: string) => removeItem(doc, itemId),
    move: (itemId: string, toDayId: string, toIndex: number) => moveItem(doc, itemId, toDayId, toIndex),
    update: (itemId: string, patch: Partial<Omit<ItemView, "id">>) => updateItem(doc, itemId, patch),
    setEditing: (itemId: string | null) => providerRef.current?.awareness?.setLocalStateField("editing", itemId),
  };
}
