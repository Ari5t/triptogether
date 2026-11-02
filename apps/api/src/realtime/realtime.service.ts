import { Injectable } from "@nestjs/common";
import type { ClientToServerEvents, ServerToClientEvents } from "@triptogether/shared";
import type { Namespace } from "socket.io";

export const tripRoom = (tripId: string) => `trip:${tripId}`;

type TripsNamespace = Namespace<ClientToServerEvents, ServerToClientEvents>;

/** Thin emit API for services; the gateway hands it the namespace once Socket.IO is up. */
@Injectable()
export class RealtimeService {
  private ns: TripsNamespace | null = null;

  attach(ns: TripsNamespace) {
    this.ns = ns;
  }

  /** Broadcast to everyone in the trip room. A no-op before the gateway is ready (e.g. in unit tests). */
  emit<E extends keyof ServerToClientEvents>(tripId: string, event: E, ...args: Parameters<ServerToClientEvents[E]>) {
    (this.ns?.to(tripRoom(tripId)) as unknown as { emit: (e: string, ...a: unknown[]) => void } | undefined)?.emit(event, ...args);
  }

  /** Removes a user's sockets from the trip room, e.g. after they were removed from the trip. */
  async kick(tripId: string, userId: string) {
    const sockets = await this.ns?.in(tripRoom(tripId)).fetchSockets();
    for (const s of sockets ?? []) if (s.data.userId === userId) s.leave(tripRoom(tripId));
  }

  async onlineUserIds(tripId: string): Promise<string[]> {
    const sockets = (await this.ns?.in(tripRoom(tripId)).fetchSockets()) ?? [];
    return [...new Set(sockets.map((s) => s.data.userId as string))];
  }
}
