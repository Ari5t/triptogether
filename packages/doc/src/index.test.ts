import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { addItem, eachDate, moveItem, readDays, removeItem, syncDays, updateItem } from "./index.js";

const docWith = (start: string, end: string) => {
  const doc = new Y.Doc();
  syncDays(doc, start, end);
  return doc;
};

describe("eachDate", () => {
  it("is inclusive", () => expect(eachDate("2026-07-14", "2026-07-16")).toEqual(["2026-07-14", "2026-07-15", "2026-07-16"]));
  it("is empty when end < start", () => expect(eachDate("2026-07-16", "2026-07-14")).toEqual([]));
});

describe("syncDays", () => {
  it("creates one day per date", () => {
    expect(readDays(docWith("2026-07-14", "2026-07-18")).map((d) => d.date)).toHaveLength(5);
  });

  it("is idempotent and keeps ids", () => {
    const doc = docWith("2026-07-14", "2026-07-16");
    const ids = readDays(doc).map((d) => d.id);
    syncDays(doc, "2026-07-14", "2026-07-16");
    expect(readDays(doc).map((d) => d.id)).toEqual(ids);
  });

  it("extends the range in order", () => {
    const doc = docWith("2026-07-15", "2026-07-16");
    syncDays(doc, "2026-07-14", "2026-07-17");
    expect(readDays(doc).map((d) => d.date)).toEqual(["2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17"]);
  });

  it("moves stops of dropped days into the nearest remaining day", () => {
    const doc = docWith("2026-07-14", "2026-07-17");
    const [d1, , , d4] = readDays(doc);
    addItem(doc, d1!.id, { title: "first" });
    addItem(doc, d4!.id, { title: "last" });
    syncDays(doc, "2026-07-15", "2026-07-16");
    const days = readDays(doc);
    expect(days.map((d) => d.date)).toEqual(["2026-07-15", "2026-07-16"]);
    expect(days[0]!.items.map((i) => i.title)).toEqual(["first"]);
    expect(days[1]!.items.map((i) => i.title)).toEqual(["last"]);
  });
});

describe("items", () => {
  it("adds, updates, removes", () => {
    const doc = docWith("2026-07-14", "2026-07-15");
    const day = readDays(doc)[0]!;
    const id = addItem(doc, day.id, { title: "Hoverla", startTime: "08:00" })!;
    updateItem(doc, id, { title: "Говерла", startTime: null });
    expect(readDays(doc)[0]!.items[0]).toMatchObject({ id, title: "Говерла", startTime: null });
    removeItem(doc, id);
    expect(readDays(doc)[0]!.items).toEqual([]);
  });

  it("keeps place fields", () => {
    const doc = docWith("2026-07-14", "2026-07-15");
    const id = addItem(doc, readDays(doc)[0]!.id, { title: "Говерла", placeId: "p1", address: "Яремче", lat: 48.16, lng: 24.5 })!;
    expect(readDays(doc)[0]!.items[0]).toMatchObject({ id, placeId: "p1", address: "Яремче", lat: 48.16, lng: 24.5 });
  });

  it("moves between days and reorders within a day", () => {
    const doc = docWith("2026-07-14", "2026-07-15");
    const [a, b] = readDays(doc);
    const x = addItem(doc, a!.id, { title: "x" })!;
    addItem(doc, a!.id, { title: "y" });
    moveItem(doc, x, b!.id, 0);
    expect(readDays(doc).map((d) => d.items.map((i) => i.title))).toEqual([["y"], ["x"]]);
    moveItem(doc, x, a!.id, 1);
    expect(readDays(doc).map((d) => d.items.map((i) => i.title))).toEqual([["y", "x"], []]);
  });

  it("converges when two clients edit concurrently", () => {
    const one = docWith("2026-07-14", "2026-07-15");
    const two = new Y.Doc();
    Y.applyUpdate(two, Y.encodeStateAsUpdate(one));
    const day = readDays(one)[0]!.id;
    addItem(one, day, { title: "from one" });
    addItem(two, day, { title: "from two" });
    Y.applyUpdate(one, Y.encodeStateAsUpdate(two));
    Y.applyUpdate(two, Y.encodeStateAsUpdate(one));
    expect(readDays(one)).toEqual(readDays(two));
    expect(readDays(one)[0]!.items).toHaveLength(2);
  });
});
