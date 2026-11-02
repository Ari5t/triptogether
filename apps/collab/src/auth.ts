import jwt from "jsonwebtoken";
import { z } from "zod";

const claims = z.object({ sub: z.string(), tripId: z.string(), role: z.enum(["OWNER", "EDITOR", "VIEWER"]) });
export type CollabContext = { userId: string; role: "OWNER" | "EDITOR" | "VIEWER" };

export const docName = (tripId: string) => `trip:${tripId}`;

/** Verifies the token minted by the API and checks it was issued for this document. Throws on any problem. */
export function authenticate(token: string, documentName: string, secret: string): CollabContext {
  const parsed = claims.parse(jwt.verify(token, secret, { algorithms: ["HS256"] }));
  if (docName(parsed.tripId) !== documentName) throw new Error("token is for another trip");
  return { userId: parsed.sub, role: parsed.role };
}
