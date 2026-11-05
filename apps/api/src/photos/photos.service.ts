import { Inject, Injectable, Logger } from "@nestjs/common";
import type { PrismaClient } from "@triptogether/db";
import { PRISMA } from "../prisma/prisma.module.js";

export const MAX_SLOTS = 4;

export interface CoverSlot {
  name: string;
  url: string | null;
  title: string | null;
}

/** Cache key for a destination name: "Lviv" and " lviv " share one entry. */
export const imageQuery = (name: string) => name.trim().toLowerCase();

/**
 * One slot per chip (first 4, in order). Chips without an image are left out when at least one chip has one.
 * When none has, every chip keeps a slot with `url: null` (the UI draws letter tiles).
 */
export function coverSlots(names: string[], cached: Map<string, { url: string; title: string }>): CoverSlot[] {
  const slots = names.slice(0, MAX_SLOTS).map((name) => {
    const hit = cached.get(imageQuery(name));
    return { name, url: hit?.url ?? null, title: hit?.title ?? null };
  });
  const withImage = slots.filter((s) => s.url);
  return withImage.length ? withImage : slots;
}

interface WikiSummary {
  type?: string;
  title: string;
  thumbnail?: { source: string; width: number };
  originalimage?: { source: string; width: number };
  content_urls?: { desktop?: { page?: string } };
}

// Wikimedia only serves fixed thumb widths (330, 500, 960, 1280 …); other sizes return HTTP 400.
const WIDTH = 960;
const UA = { "User-Agent": "TripTogether/1.0 (portfolio project)" };

/** Photo URL for a summary, or null when there is no photo. Thumb URLs are `…/{n}px-File.jpg`; Wikimedia refuses sizes above the original, so small originals are used as is. */
export function imageUrl(s: WikiSummary): string | null {
  const thumb = s.thumbnail;
  // SVG lead images are flags, maps and coats of arms: not a picture of the place.
  if (!thumb || /\.svg\//i.test(thumb.source)) return null;
  if (s.originalimage && s.originalimage.width < WIDTH) return s.originalimage.source;
  return thumb.source.replace(/\/\d+px-/, `/${WIDTH}px-`);
}

@Injectable()
export class PhotosService {
  private readonly log = new Logger(PhotosService.name);

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /** Cached images of the given destination names, keyed by imageQuery. */
  async cached(names: string[]): Promise<Map<string, { url: string; title: string }>> {
    const rows = await this.prisma.destinationImage.findMany({ where: { query: { in: [...new Set(names.map(imageQuery))] } } });
    return new Map(rows.map((r) => [r.query, { url: r.url, title: r.title }]));
  }

  /**
   * Looks up the lead image on Wikipedia for the first 4 destination names that are not cached yet. Fire and
   * forget: errors are logged per name, because images are decoration and must never fail a trip write.
   */
  async ensure(names: string[]): Promise<void> {
    // The original spelling is kept for the lookup: Wikipedia titles are case-sensitive ("Івано-Франківськ").
    const wanted = new Map(names.slice(0, MAX_SLOTS).map((n) => [imageQuery(n), n.trim()] as const).filter(([q]) => q));
    try {
      const have = await this.cached([...wanted.keys()]);
      const missing = [...wanted].filter(([q]) => !have.has(q));
      const results = await Promise.allSettled(missing.map(([q, name]) => this.lookup(q, name)));
      results.forEach((r) => r.status === "rejected" && this.log.warn(`Image lookup failed: ${(r.reason as Error).message}`));
    } catch (e) {
      this.log.warn(`Image lookup failed: ${(e as Error).message}`);
    }
  }

  /**
   * English articles lead with photos, Ukrainian ones often with a flag, so English goes first. A non-ASCII
   * name is mapped to its English title through the language links of the Ukrainian article.
   */
  private async candidates(name: string): Promise<{ lang: "en" | "uk"; title: string }[]> {
    if (/^[\p{ASCII}]+$/u.test(name)) return [{ lang: "en", title: name }, { lang: "uk", title: name }];
    const url = new URL("https://uk.wikipedia.org/w/api.php");
    url.search = new URLSearchParams({ action: "query", format: "json", formatversion: "2", prop: "langlinks", lllang: "en", redirects: "1", titles: name }).toString();
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(5000) });
    const data = (await res.json()) as { query?: { pages?: { langlinks?: { title: string }[] }[] } };
    const en = data.query?.pages?.[0]?.langlinks?.[0]?.title;
    return [...(en ? [{ lang: "en" as const, title: en }] : []), { lang: "uk", title: name }];
  }

  private async lookup(query: string, name: string) {
    for (const { lang, title } of await this.candidates(name)) {
      const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(5000) });
      if (res.status === 404) continue;
      if (!res.ok) throw new Error(`Wikipedia ${lang} ${res.status}`);
      const summary = (await res.json()) as WikiSummary;
      const image = summary.type === "disambiguation" ? null : imageUrl(summary);
      if (!image) continue;
      const pageUrl = summary.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(summary.title)}`;
      await this.prisma.destinationImage.createMany({ skipDuplicates: true, data: [{ query, url: image, title: summary.title, pageUrl }] });
      return;
    }
  }
}
