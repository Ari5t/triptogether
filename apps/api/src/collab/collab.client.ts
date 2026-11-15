import { Inject, Injectable, Logger } from "@nestjs/common";
import { ENV, type Env } from "../common/env.js";

/**
 * Calls the collab service. Best effort: when it is down nothing is lost, because the collab
 * server re-syncs days from the trip dates every time it loads a document.
 */
@Injectable()
export class CollabClient {
  private readonly log = new Logger(CollabClient.name);
  constructor(@Inject(ENV) private readonly env: Env) {}

  /** Strict: throws when collab is unreachable or answers non-2xx. Otherwise it only logs, because collab re-syncs on load. */
  private async post(path: string, body?: unknown, strict = false) {
    try {
      const res = await fetch(`${this.env.COLLAB_INTERNAL_URL}/internal/trips/${path}`, {
        method: "POST",
        headers: { "x-internal-secret": this.env.COLLAB_INTERNAL_SECRET, "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) throw new Error(`collab ${path} -> ${res.status}`);
    } catch (e) {
      if (strict) throw e;
      this.log.warn(`collab ${path} failed: ${(e as Error).message}`);
    }
  }

  syncDays(tripId: string, startDate: string, endDate: string) {
    return this.post(`${tripId}/sync-days`, { startDate, endDate });
  }

  /** Date edits from settings: the new dates only commit if the doc was updated too. */
  syncDaysStrict(tripId: string, startDate: string, endDate: string, mode: "shift" | "calendar") {
    return this.post(`${tripId}/sync-days`, { startDate, endDate, mode }, true);
  }

  closeConnections(tripId: string) {
    return this.post(`${tripId}/close`);
  }
}
