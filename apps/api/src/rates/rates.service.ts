import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { rateFromNumber, type Currency, type RateView } from "@triptogether/shared";
import { AppException } from "../common/errors.js";

interface Table {
  date: string;
  rates: Record<string, number>;
  fetchedAt: number;
}

/** The provider has daily files from this day on; older expenses need a manual rate. */
const FIRST_DAY = "2024-03-02";
const LATEST_TTL = 60 * 60 * 1000;
const MAX_CACHED = 500;

/** Picks one rate out of a provider file: { date, eur: { uah: 50.25, ... } }. Pure, so it can be tested without the network. */
export function pickRate(json: unknown, from: string, to: string): RateView | null {
  const file = (json ?? {}) as { date?: unknown } & Record<string, unknown>;
  const table = file[from.toLowerCase()] as Record<string, unknown> | undefined;
  const value = table?.[to.toLowerCase()];
  const rate = typeof value === "number" ? rateFromNumber(value) : null;
  return rate && typeof file.date === "string" ? { rate, date: file.date } : null;
}

/**
 * Exchange rates from the free fawazahmed0 currency-api (no key, 150+ currencies incl. UAH, daily history).
 * The browser never calls it directly. Rates are only a suggestion: users can always type their own.
 */
@Injectable()
export class RatesService {
  private readonly log = new Logger(RatesService.name);
  // shortcut: per-process memory cache, move to Redis if the API runs on several instances.
  private readonly cache = new Map<string, Table>();

  async get(from: Currency, to: Currency, date?: string): Promise<RateView> {
    const today = new Date().toISOString().slice(0, 10);
    if (from === to) return { rate: "1", date: date ?? today };
    if (date && date < FIRST_DAY) throw new AppException("RATE_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE);
    // Future expenses (planned before the trip) use the latest rate.
    const tag = !date || date >= today ? "latest" : date;
    const picked = pickRate(await this.table(tag, from), from, to);
    if (!picked) throw new AppException("RATE_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE);
    return picked;
  }

  private async table(tag: string, from: Currency): Promise<unknown> {
    const key = `${tag}:${from}`;
    const hit = this.cache.get(key);
    if (hit && (tag !== "latest" || Date.now() - hit.fetchedAt < LATEST_TTL)) return { date: hit.date, [from.toLowerCase()]: hit.rates };
    const base = from.toLowerCase();
    const urls = [`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${tag}/v1/currencies/${base}.json`, `https://${tag}.currency-api.pages.dev/v1/currencies/${base}.json`];
    for (const url of urls) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { date?: string } & Record<string, unknown>;
        if (typeof json.date !== "string" || typeof json[base] !== "object") throw new Error("unexpected body");
        if (this.cache.size >= MAX_CACHED) this.cache.clear();
        this.cache.set(key, { date: json.date, rates: json[base] as Record<string, number>, fetchedAt: Date.now() });
        return json;
      } catch (e) {
        this.log.warn(`Rates request failed (${url}): ${(e as Error).message}`);
      }
    }
    throw new AppException("RATE_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE);
  }
}
