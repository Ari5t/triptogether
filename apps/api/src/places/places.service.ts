import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@triptogether/db";
import type { PlaceResult } from "@triptogether/shared";
import { ENV, type Env } from "../common/env.js";
import { AppException } from "../common/errors.js";
import { PRISMA } from "../prisma/prisma.module.js";

interface GeoapifyFeature {
  properties: {
    place_id?: string;
    name?: string;
    address_line1?: string;
    address_line2?: string;
    formatted?: string;
    lat?: number;
    lon?: number;
    category?: string;
  };
}

/** Pure mapping so it can be tested without the network. Features without id or coordinates are dropped. */
export function mapFeatures(features: GeoapifyFeature[]) {
  return features.flatMap((f) => {
    const p = f.properties;
    if (!p.place_id || typeof p.lat !== "number" || typeof p.lon !== "number") return [];
    return [
      {
        externalId: p.place_id,
        name: p.name ?? p.address_line1 ?? p.formatted ?? "",
        address: p.address_line2 ?? p.formatted ?? null,
        lat: p.lat,
        lng: p.lon,
        category: p.category ?? null,
      },
    ];
  });
}

@Injectable()
export class PlacesService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async search(q: string, lat?: number, lng?: number, lang = "uk"): Promise<PlaceResult[]> {
    if (!this.env.GEOAPIFY_API_KEY) throw new AppException("PLACES_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE);
    const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
    url.search = new URLSearchParams({ text: q, limit: "6", lang, apiKey: this.env.GEOAPIFY_API_KEY }).toString();
    if (lat !== undefined && lng !== undefined) url.searchParams.set("bias", `proximity:${lng},${lat}`);
    let features: GeoapifyFeature[];
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(String(res.status));
      features = ((await res.json()) as { features?: GeoapifyFeature[] }).features ?? [];
    } catch {
      throw new AppException("PLACES_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE);
    }
    // Upserting gives every result a stable Place id, which itinerary items reference (snapshot FK).
    // shortcut: results are stored but queries are not cached, add a query cache if the free tier limit bites.
    return Promise.all(
      mapFeatures(features).map(async (p) => {
        const row = await this.prisma.place.upsert({
          where: { provider_externalId: { provider: "geoapify", externalId: p.externalId } },
          create: { provider: "geoapify", ...p },
          update: { name: p.name, address: p.address, lat: p.lat, lng: p.lng, category: p.category },
        });
        return { id: row.id, name: row.name, address: row.address, lat: row.lat, lng: row.lng, category: row.category };
      }),
    );
  }
}
