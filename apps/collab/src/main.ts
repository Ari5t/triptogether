import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { Server } from "@hocuspocus/server";
import { createPrisma } from "@triptogether/db";
import { shiftDays, syncDays } from "@triptogether/doc";
import * as Y from "yjs";
import { authenticate, docName, type CollabContext } from "./auth.js";
import { loadEnv } from "./env.js";
import { buildSnapshot, placeIdsIn } from "./snapshot.js";

const env = loadEnv();
const prisma = createPrisma(env.DATABASE_URL);
const tripIdOf = (documentName: string) => documentName.slice("trip:".length);

const sameSecret = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
}

const server = new Server({
  port: env.COLLAB_PORT,
  name: "triptogether-collab",
  debounce: 2000, // SPEC §6: snapshot ~2 s after the last change
  maxDebounce: 10_000,

  async onAuthenticate({ token, documentName, connectionConfig }): Promise<CollabContext> {
    const claims = authenticate(token, documentName, env.COLLAB_JWT_SECRET);
    // Role comes from the DB, not the token, so removals and role changes apply on the next connect.
    const member = await prisma.tripMember.findUnique({ where: { tripId_userId: { tripId: tripIdOf(documentName), userId: claims.userId } }, include: { trip: { select: { deletedAt: true } } } });
    if (!member || member.trip.deletedAt) throw new Error("not a member");
    connectionConfig.readOnly = member.role === "VIEWER";
    return { userId: claims.userId, role: member.role };
  },

  async onLoadDocument({ document, documentName }) {
    const tripId = tripIdOf(documentName);
    const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { doc: true } });
    if (!trip || trip.deletedAt) throw new Error("TRIP_NOT_FOUND");
    if (trip.doc) Y.applyUpdate(document, trip.doc.state);
    // Creates days for a new trip and is a no-op for an existing one with matching dates.
    syncDays(document, trip.startDate.toISOString().slice(0, 10), trip.endDate.toISOString().slice(0, 10));
  },

  async onStoreDocument({ document, documentName }) {
    const tripId = tripIdOf(documentName);
    const state = Buffer.from(Y.encodeStateAsUpdate(document));
    const ids = placeIdsIn(document);
    const known = new Set((await prisma.place.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((p) => p.id));
    const days = buildSnapshot(document, known);
    // The snapshot is rebuilt in full every time, so it can never drift from the Yjs state.
    await prisma.$transaction([
      prisma.tripDoc.upsert({ where: { tripId }, create: { tripId, state }, update: { state } }),
      prisma.day.deleteMany({ where: { tripId } }),
      ...days.map((d) =>
        prisma.day.create({
          data: { id: d.id, tripId, date: d.date, order: d.order, items: { create: d.items } },
        }),
      ),
    ]);
  },

  /** Internal API-to-collab calls, guarded by a shared secret. */
  async onRequest({ request, response, instance }) {
    const url = new URL(request.url ?? "/", "http://internal");
    const m = /^\/internal\/trips\/([^/]+)\/(sync-days|close)$/.exec(url.pathname);
    if (!m || request.method !== "POST") return;
    const reply = (status: number) => {
      response.writeHead(status).end();
      throw null; // short-circuits Hocuspocus' default "Welcome" reply
    };
    const secret = request.headers["x-internal-secret"];
    if (typeof secret !== "string" || !sameSecret(secret, env.COLLAB_INTERNAL_SECRET)) reply(401);
    const [, tripId, action] = m as unknown as [string, string, string];
    if (action === "close") {
      instance.closeConnections(docName(tripId));
      reply(204);
    }
    const body = (await readJson(request)) as { startDate?: string; endDate?: string; mode?: string };
    if (!body.startDate || !body.endDate) reply(400);
    const connection = await instance.openDirectConnection(docName(tripId), { userId: "system", role: "OWNER" });
    await connection.transact((doc) => (body.mode === "shift" ? shiftDays : syncDays)(doc, body.startDate!, body.endDate!));
    await connection.disconnect();
    reply(204);
  },
});

await server.listen();
