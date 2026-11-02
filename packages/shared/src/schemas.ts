import { z } from "zod";
import { INVITE_ROLES, TRIP_ROLES } from "./roles.js";

export const LOCALES = ["uk", "en"] as const;
export const localeSchema = z.enum(LOCALES);

const isoDate = z.iso.date();

export const createTripSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    destination: z.string().trim().max(160).optional(),
    startDate: isoDate,
    endDate: isoDate,
    currency: z.string().regex(/^[A-Z]{3}$/).default("UAH"),
    coverUrl: z.url().optional(),
  })
  .refine((v) => v.endDate >= v.startDate, { path: ["endDate"], message: "END_BEFORE_START" });
export type CreateTripInput = z.infer<typeof createTripSchema>;

export const updateTripSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    destination: z.string().trim().max(160).nullable(),
    startDate: isoDate,
    endDate: isoDate,
    coverUrl: z.url().nullable(),
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
