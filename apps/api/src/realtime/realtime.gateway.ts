import { Inject, Logger } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { TRIPS_NAMESPACE, type ClientToServerEvents, type ServerToClientEvents } from "@triptogether/shared";
import type { Namespace, Socket } from "socket.io";
import { AuthService } from "../auth/auth.service.js";
import { ACCESS_COOKIE } from "../auth/cookies.js";
import { MembershipService } from "../trips/trip-role.guard.js";
import { RealtimeService, tripRoom } from "./realtime.service.js";

type TripSocket = Socket<ClientToServerEvents, ServerToClientEvents> & { data: { userId: string } };

const parseCookie = (header: string | undefined, name: string) =>
  header
    ?.split(";")
    .map((c) => c.trim().split("="))
    .find(([k]) => k === name)?.[1];

/** CORS is configured by the adapter in main.ts (WEB_ORIGIN, credentials) so the browser can send the session cookie. */
@WebSocketGateway({ namespace: TRIPS_NAMESPACE })
export class RealtimeGateway implements OnGatewayInit {
  private readonly log = new Logger(RealtimeGateway.name);
  @WebSocketServer() private ns!: Namespace<ClientToServerEvents, ServerToClientEvents>;

  constructor(
    private readonly auth: AuthService,
    private readonly members: MembershipService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(ns: Namespace<ClientToServerEvents, ServerToClientEvents>) {
    this.realtime.attach(ns);
    // Same httpOnly access cookie as REST. An expired token is refused; the client refreshes and reconnects.
    ns.use(async (socket, next) => {
      try {
        const token = parseCookie(socket.handshake.headers.cookie, ACCESS_COOKIE);
        if (!token) throw new Error("no session");
        socket.data.userId = await this.auth.verifyAccess(token);
        next();
      } catch {
        next(new Error("UNAUTHENTICATED"));
      }
    });
    ns.on("connection", (socket) => {
      // `rooms` is already empty by "disconnect", so presence is recomputed from "disconnecting".
      socket.on("disconnecting", () => {
        const trips = [...socket.rooms].filter((r) => r.startsWith("trip:")).map((r) => r.slice(5));
        setImmediate(() => trips.forEach((t) => void this.broadcastPresence(t)));
      });
    });
  }

  private async broadcastPresence(tripId: string) {
    this.realtime.emit(tripId, "presence:update", { tripId, online: await this.realtime.onlineUserIds(tripId) });
  }

  @SubscribeMessage("trip:join")
  async join(@ConnectedSocket() socket: TripSocket, @MessageBody() body: { tripId?: string }) {
    try {
      if (typeof body?.tripId !== "string") throw new Error("bad payload");
      await this.members.requireRole(body.tripId, socket.data.userId, "VIEWER");
    } catch {
      return { ok: false };
    }
    try {
      await socket.join(tripRoom(body.tripId));
      await this.broadcastPresence(body.tripId);
    } catch (e) {
      this.log.error(`join failed: ${(e as Error).stack}`);
      return { ok: false };
    }
    return { ok: true };
  }

  @SubscribeMessage("trip:leave")
  async leave(@ConnectedSocket() socket: TripSocket, @MessageBody() body: { tripId?: string }) {
    if (typeof body?.tripId !== "string") return;
    await socket.leave(tripRoom(body.tripId));
    await this.broadcastPresence(body.tripId);
  }

  @SubscribeMessage("chat:typing")
  typing(@ConnectedSocket() socket: TripSocket, @MessageBody() body: { tripId?: string; itemId?: string | null }) {
    if (typeof body?.tripId !== "string" || !socket.rooms.has(tripRoom(body.tripId))) return;
    socket.to(tripRoom(body.tripId)).emit("chat:typing", { tripId: body.tripId, userId: socket.data.userId, itemId: body.itemId ?? null });
  }
}
