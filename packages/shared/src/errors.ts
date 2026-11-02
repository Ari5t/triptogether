/** API returns codes, never texts; the frontend translates them. */
export const ERROR_CODES = [
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "VALIDATION_FAILED",
  "TRIP_NOT_FOUND",
  "MEMBER_NOT_FOUND",
  "INVITE_NOT_FOUND",
  "INVITE_EXPIRED",
  "INVITE_REVOKED",
  "INVITE_EXHAUSTED",
  "ALREADY_MEMBER",
  "CANNOT_CHANGE_OWNER",
  "PLACES_UNAVAILABLE",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiError {
  code: ErrorCode;
  details?: unknown;
}
