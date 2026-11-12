import * as Y from "yjs";

/**
 * Trip itinerary document (SPEC §6):
 *   days: Y.Array<Y.Map { id, date, items: Y.Array<Y.Map { id, title, startTime?, placeId?, lat?, lng? }> }>
 * Stop order = position in the array. Moving a stop = delete + insert in one transaction.
 * Notes (Y.XmlFragment per day/item) come with Tiptap after drag-and-drop is stable.
 */

export interface ItemView {
  id: string;
  title: string;
  startTime: string | null;
  placeId: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
}
export interface DayView {
  id: string;
  date: string;
  items: ItemView[];
}
export type NewItem = Partial<Omit<ItemView, "id">> & { title: string };

const DAY_MS = 86_400_000;

/** Inclusive list of ISO dates between two ISO dates. */
export function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  for (let t = Date.parse(start); t <= Date.parse(end); t += DAY_MS) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

const daysOf = (doc: Y.Doc) => doc.getArray<Y.Map<unknown>>("days");
const itemsOf = (day: Y.Map<unknown>) => day.get("items") as Y.Array<Y.Map<unknown>>;

function newItemMap(id: string, item: NewItem): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set("id", id);
  m.set("title", item.title);
  for (const k of ["startTime", "placeId", "address", "lat", "lng"] as const) {
    if (item[k] != null) m.set(k, item[k]);
  }
  return m;
}

function newDayMap(date: string, items: Y.Map<unknown>[] = []): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set("id", crypto.randomUUID());
  m.set("date", date);
  const arr = new Y.Array<Y.Map<unknown>>();
  arr.push(items);
  m.set("items", arr);
  return m;
}

const cloneItem = (m: Y.Map<unknown>) => {
  const c = new Y.Map<unknown>();
  m.forEach((v, k) => c.set(k, v));
  return c;
};

/** Makes the document's days match [start, end]: adds missing days, drops days outside the range and moves their stops to the nearest day inside it. */
export function syncDays(doc: Y.Doc, start: string, end: string): void {
  const wanted = eachDate(start, end);
  if (wanted.length === 0) return;
  doc.transact(() => {
    const days = daysOf(doc);
    const orphans: { date: string; items: Y.Map<unknown>[] }[] = [];
    for (let i = days.length - 1; i >= 0; i--) {
      const day = days.get(i);
      const date = day.get("date") as string;
      if (!wanted.includes(date)) {
        orphans.unshift({ date, items: itemsOf(day).toArray().map(cloneItem) });
        days.delete(i, 1);
      }
    }
    const have = new Set(days.toArray().map((d) => d.get("date") as string));
    for (const date of wanted) {
      if (!have.has(date)) {
        const pos = days.toArray().filter((d) => (d.get("date") as string) < date).length;
        days.insert(pos, [newDayMap(date)]);
      }
    }
    for (const o of orphans) {
      const target = o.date < wanted[0]! ? wanted[0]! : wanted[wanted.length - 1]!;
      const day = days.toArray().find((d) => d.get("date") === target)!;
      const items = itemsOf(day);
      if (o.date < wanted[0]!) items.insert(0, o.items);
      else items.push(o.items);
    }
  });
}

/** Relabels existing days to the new range by position (day N keeps its stops); stops of days beyond the new length go to the last day. */
export function shiftDays(doc: Y.Doc, start: string, end: string): void {
  const dates = eachDate(start, end);
  if (dates.length === 0) return;
  doc.transact(() => {
    const days = daysOf(doc);
    if (days.length > dates.length) {
      const moved = days.toArray().slice(dates.length).flatMap((d) => itemsOf(d).toArray().map(cloneItem));
      itemsOf(days.get(dates.length - 1)).push(moved);
      days.delete(dates.length, days.length - dates.length);
    }
    days.forEach((day, i) => day.set("date", dates[i]!));
    syncDays(doc, start, end);
  });
}

export function readDays(doc: Y.Doc): DayView[] {
  return daysOf(doc)
    .toArray()
    .map((d) => ({
      id: d.get("id") as string,
      date: d.get("date") as string,
      items: itemsOf(d)
        .toArray()
        .map((i) => ({
          id: i.get("id") as string,
          title: (i.get("title") as string) ?? "",
          startTime: (i.get("startTime") as string) ?? null,
          placeId: (i.get("placeId") as string) ?? null,
          address: (i.get("address") as string) ?? null,
          lat: (i.get("lat") as number) ?? null,
          lng: (i.get("lng") as number) ?? null,
        })),
    }));
}

function findDay(doc: Y.Doc, dayId: string): Y.Map<unknown> | undefined {
  return daysOf(doc).toArray().find((d) => d.get("id") === dayId);
}

function findItem(doc: Y.Doc, itemId: string) {
  for (const day of daysOf(doc).toArray()) {
    const items = itemsOf(day);
    const index = items.toArray().findIndex((i) => i.get("id") === itemId);
    if (index >= 0) return { day, items, index, item: items.get(index) };
  }
  return undefined;
}

export function addItem(doc: Y.Doc, dayId: string, item: NewItem, index?: number): string | undefined {
  const day = findDay(doc, dayId);
  if (!day) return undefined;
  const id = crypto.randomUUID();
  const items = itemsOf(day);
  doc.transact(() => items.insert(Math.min(index ?? items.length, items.length), [newItemMap(id, item)]));
  return id;
}

export function removeItem(doc: Y.Doc, itemId: string): void {
  const found = findItem(doc, itemId);
  if (found) doc.transact(() => found.items.delete(found.index, 1));
}

/** Moves a stop to `toIndex` of day `toDayId`. A Y type cannot be re-inserted, so the stop is cloned. */
export function moveItem(doc: Y.Doc, itemId: string, toDayId: string, toIndex: number): void {
  const found = findItem(doc, itemId);
  const target = findDay(doc, toDayId);
  if (!found || !target) return;
  doc.transact(() => {
    const clone = cloneItem(found.item);
    found.items.delete(found.index, 1);
    const targetItems = itemsOf(target);
    targetItems.insert(Math.max(0, Math.min(toIndex, targetItems.length)), [clone]);
  });
}

export function updateItem(doc: Y.Doc, itemId: string, patch: Partial<Omit<ItemView, "id">>): void {
  const found = findItem(doc, itemId);
  if (!found) return;
  doc.transact(() => {
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined) found.item.delete(k);
      else found.item.set(k, v);
    }
  });
}
