import { z } from "zod";
import { INVITE_ROLES, TRIP_ROLES } from "./roles.js";

export const LOCALES = ["uk", "en"] as const;
export const localeSchema = z.enum(LOCALES);

const isoDate = z.iso.date();

export const MAX_DESTINATIONS = 10;
export const destinationSchema = z.object({
  name: z.string().trim().min(1).max(160),
  placeId: z.string().min(1).optional(),
});
export type DestinationInput = z.infer<typeof destinationSchema>;

/** Same duplicate rule as the chip picker: same placeId, or same name ignoring case. */
export function dedupeDestinations<T extends DestinationInput>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((d) => {
    const keys = [d.placeId && `p:${d.placeId}`, `n:${d.name.toLowerCase()}`].filter(Boolean) as string[];
    if (keys.some((k) => seen.has(k))) return false;
    keys.forEach((k) => seen.add(k));
    return true;
  });
}
const destinationsSchema = z.array(destinationSchema).max(MAX_DESTINATIONS).transform(dedupeDestinations);

export const createTripSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    destinations: destinationsSchema.default([]),
    startDate: isoDate,
    endDate: isoDate,
    currency: z.string().regex(/^[A-Z]{3}$/).default("UAH"),
  })
  .refine((v) => v.endDate >= v.startDate, { path: ["endDate"], message: "END_BEFORE_START" });
export type CreateTripInput = z.infer<typeof createTripSchema>;

export const updateTripSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    destinations: destinationsSchema,
    startDate: isoDate,
    endDate: isoDate,
    dateMode: z.enum(["shift", "calendar"]),
  })
  .partial()
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    path: ["endDate"],
    message: "END_BEFORE_START",
  });
export type UpdateTripInput = z.infer<typeof updateTripSchema>;

export const createInviteSchema = z.object({
  role: z.enum(INVITE_ROLES).default("EDITOR"),
  expiresInDays: z.number().int().min(1).max(30).default(7),
  maxUses: z.number().int().min(1).max(100).optional(),
});
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const changeMemberRoleSchema = z.object({ role: z.enum(INVITE_ROLES) });
export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>;

export const updateMeSchema = z.object({ locale: localeSchema });

export const memberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.enum(TRIP_ROLES),
  joinedAt: z.string(),
});
export type Member = z.infer<typeof memberSchema>;

export const placeSearchQuerySchema = z.object({
  q: z.string().trim().min(3).max(100),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export const placeSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  category: z.string().nullable(),
});
export type PlaceResult = z.infer<typeof placeSchema>;

export const EXPENSE_CATEGORIES = ["TRANSPORT", "LODGING", "FOOD", "LEISURE", "OTHER"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

const expenseBase = {
  title: z.string().trim().min(1).max(160),
  amountMinor: z.number().int().positive().max(2_000_000_000),
  category: z.enum(EXPENSE_CATEGORIES).default("OTHER"),
  paidById: z.string().min(1),
  spentAt: isoDate,
};

/** EQUAL: the amount is split between `participants`. EXACT: explicit parts that must add up to the amount. */
export const expenseInputSchema = z.discriminatedUnion("splitType", [
  z.object({ ...expenseBase, splitType: z.literal("EQUAL"), participants: z.array(z.string().min(1)).min(1).max(50) }),
  z.object({
    ...expenseBase,
    splitType: z.literal("EXACT"),
    splits: z.array(z.object({ userId: z.string().min(1), amountMinor: z.number().int().min(0) })).min(1).max(50),
  }),
]);
export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  /** Set for a comment on an itinerary stop; omitted for the general chat. */
  itemId: z.string().min(1).max(64).optional(),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const messagesQuerySchema = z.object({
  itemId: z.string().min(1).max(64).optional(),
  /** Message id: return messages older than this one. */
  before: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createPollSchema = z
  .object({
    question: z.string().trim().min(1).max(200),
    options: z.array(z.string().trim().min(1).max(100)).min(2).max(10),
    multiChoice: z.boolean().default(false),
    closesAt: z.iso.datetime().optional(),
  })
  .refine((v) => new Set(v.options.map((o) => o.toLowerCase())).size === v.options.length, { path: ["options"], message: "DUPLICATE_OPTIONS" });
export type CreatePollInput = z.infer<typeof createPollSchema>;

/** Empty list withdraws the vote. */
export const voteSchema = z.object({ optionIds: z.array(z.string().min(1)).max(10) });
export type VoteInput = z.infer<typeof voteSchema>;

export interface MessageView {
  id: string;
  authorId: string;
  itemId: string | null;
  pollId: string | null;
  body: string;
  createdAt: string;
}

export interface PollView {
  id: string;
  question: string;
  multiChoice: boolean;
  closesAt: string | null;
  closed: boolean;
  options: { id: string; label: string; voterIds: string[] }[];
}
