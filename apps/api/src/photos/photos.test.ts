import { describe, expect, it } from "vitest";
import { coverSlots, imageUrl } from "./photos.service.js";

describe("coverSlots", () => {
  const cached = new Map([["lviv", { url: "u1", title: "Lviv" }]]);

  it("gives one slot per chip in order", () => {
    const both = new Map([...cached, ["kyiv", { url: "u2", title: "Kyiv" }]]);
    expect(coverSlots(["Lviv", "Kyiv"], both).map((s) => s.url)).toEqual(["u1", "u2"]);
  });

  it("leaves out chips without an image when another chip has one", () => {
    expect(coverSlots(["Nowhere", "Lviv", "Also nowhere"], cached)).toEqual([{ name: "Lviv", url: "u1", title: "Lviv" }]);
  });

  it("keeps a slot per chip, url null, when no chip has an image", () => {
    expect(coverSlots(["Nowhere", "Also nowhere"], cached)).toEqual([
      { name: "Nowhere", url: null, title: null },
      { name: "Also nowhere", url: null, title: null },
    ]);
  });

  it("matches names ignoring case and spaces, and caps at 4 slots", () => {
    const five = new Map(["a", "b", "c", "d", "e"].map((n) => [n, { url: n, title: n }]));
    expect(coverSlots(["A", "B", "C", "D", "E"], five)).toHaveLength(4);
    expect(coverSlots([" LVIV "], cached)[0]!.url).toBe("u1");
    expect(coverSlots([], cached)).toEqual([]);
  });
});

describe("imageUrl", () => {
  const thumb = { source: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Lviv.jpg/320px-Lviv.jpg", width: 320 };
  it("resizes the thumb to 960px", () => {
    expect(imageUrl({ title: "Lviv", thumbnail: thumb, originalimage: { source: "orig", width: 4000 } })).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Lviv.jpg/960px-Lviv.jpg",
    );
  });
  it("uses the original when it is narrower than 960px", () => {
    expect(imageUrl({ title: "x", thumbnail: thumb, originalimage: { source: "orig", width: 500 } })).toBe("orig");
  });
  it("ignores SVG lead images (flags, maps)", () => {
    const svg = { source: "https://upload.wikimedia.org/x/Flag_of_Lviv.svg/languk-330px-Flag_of_Lviv.svg.png", width: 330 };
    expect(imageUrl({ title: "Львів", thumbnail: svg })).toBeNull();
  });
  it("is null without an image", () => {
    expect(imageUrl({ title: "x" })).toBeNull();
  });
});
