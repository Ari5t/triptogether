import { describe, expect, it } from "vitest";
import { mapFeatures } from "./places.service.js";

describe("mapFeatures", () => {
  it("maps Geoapify features and drops incomplete ones", () => {
    const out = mapFeatures([
      { properties: { place_id: "a", name: "Говерла", address_line2: "Яремче", lat: 48.16, lon: 24.5, category: "natural.mountain" } },
      { properties: { place_id: "b", address_line1: "Площа Ринок", formatted: "Львів, Площа Ринок", lat: 49.84, lon: 24.03 } },
      { properties: { name: "no id", lat: 1, lon: 2 } },
      { properties: { place_id: "c", name: "no coords" } },
    ]);
    expect(out).toEqual([
      { externalId: "a", name: "Говерла", address: "Яремче", lat: 48.16, lng: 24.5, category: "natural.mountain" },
      { externalId: "b", name: "Площа Ринок", address: "Львів, Площа Ринок", lat: 49.84, lng: 24.03, category: null },
    ]);
  });
});
