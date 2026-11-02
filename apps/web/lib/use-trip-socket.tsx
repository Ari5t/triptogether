"use client";

import { TRIPS_NAMESPACE, type ClientToServerEvents, type ServerToClientEvents } from "@triptogether/shared";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { apiFetch } from "@/lib/client-api";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type TripHandlers = { [K in keyof ServerToClientEvents]?: ServerToClientEvents[K] };
const EVENTS = ["chat:message", "chat:typing", "poll:created", "poll:updated", "expense:changed", "member:joined", "member:left", "trip:updated"] as const;

interface Ctx {
  subscribe: (handlers: { current: TripHandlers }) => () => void;
  online: string[];
  connected: boolean;
  emitTyping: (itemId: string | null) => void;
}
const SocketContext = createContext<Ctx | null>(null);

/**
 * One Socket.IO connection per trip page. The session cookie authenticates it; when the cookie has
 * expired the connection is refused, so we refresh through REST and reconnect.
 */
export function TripSocketProvider({ tripId, children }: { tripId: string; children: React.ReactNode }) {
  const listeners = useRef(new Set<{ current: TripHandlers }>());
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [online, setOnline] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(`${API_ORIGIN}${TRIPS_NAMESPACE}`, { withCredentials: true, transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => {
      setConnected(true);
      socket.emit("trip:join", { tripId }, () => {});
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", async (err) => {
      if (err.message !== "UNAUTHENTICATED") return; // other errors: socket.io retries by itself
      try {
        await apiFetch("/me"); // refreshes the access cookie while the refresh cookie is valid
        socket.connect();
      } catch {
        /* signed out: stay disconnected */
      }
    });
    socket.on("presence:update", (e) => e.tripId === tripId && setOnline(e.online));
    for (const name of EVENTS) {
      (socket as unknown as { on: (e: string, f: (p: { tripId: string }) => void) => void }).on(name, (payload) => {
        if (payload.tripId !== tripId) return;
        for (const l of listeners.current) (l.current[name] as ((p: unknown) => void) | undefined)?.(payload);
      });
    }
    return () => {
      socket.emit("trip:leave", { tripId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tripId]);

  const ctx: Ctx = {
    subscribe: (h) => {
      listeners.current.add(h);
      return () => void listeners.current.delete(h);
    },
    online,
    connected,
    emitTyping: (itemId) => socketRef.current?.emit("chat:typing", { tripId, itemId }),
  };
  return <SocketContext.Provider value={ctx}>{children}</SocketContext.Provider>;
}

/** Subscribes to server events for as long as the component is mounted; always calls the latest handlers. */
export function useTripEvents(handlers: TripHandlers) {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useTripEvents needs <TripSocketProvider>");
  const ref = useRef(handlers);
  ref.current = handlers;
  const { subscribe } = ctx;
  useEffect(() => subscribe(ref), [subscribe]);
  return { online: ctx.online, connected: ctx.connected, emitTyping: ctx.emitTyping };
}
