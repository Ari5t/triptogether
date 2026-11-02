import type { MessageView, PollView } from "./schemas.js";

/** Socket.IO namespace and event names shared by API and web (SPEC §5). */
export const TRIPS_NAMESPACE = "/trips";

export interface ServerToClientEvents {
  "chat:message": (e: { tripId: string; message: MessageView }) => void;
  "chat:typing": (e: { tripId: string; userId: string; itemId: string | null }) => void;
  "poll:created": (e: { tripId: string; poll: PollView }) => void;
  "poll:updated": (e: { tripId: string; poll: PollView }) => void;
  "expense:changed": (e: { tripId: string }) => void;
  "member:joined": (e: { tripId: string; userId: string }) => void;
  "member:left": (e: { tripId: string; userId: string }) => void;
  "trip:updated": (e: { tripId: string }) => void;
  "presence:update": (e: { tripId: string; online: string[] }) => void;
}

export interface ClientToServerEvents {
  "trip:join": (e: { tripId: string }, ack: (res: { ok: boolean }) => void) => void;
  "trip:leave": (e: { tripId: string }) => void;
  "chat:typing": (e: { tripId: string; itemId?: string | null }) => void;
}
