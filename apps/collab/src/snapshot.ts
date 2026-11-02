import type * as Y from "yjs";
import { readDays } from "@triptogether/doc";

export interface SnapshotDay {
  id: string;
  date: Date;
  order: number;
  items: { id: string; title: string; startTime: string | null; placeId: string | null; order: number }[];
}

/** Plain rows for the Day / ItineraryItem tables. Places that do not exist in the DB are dropped so the FK cannot fail. */
export function buildSnapshot(doc: Y.Doc, knownPlaceIds: Set<string>): SnapshotDay[] {
  return readDays(doc).map((d, order) => ({
    id: d.id,
    date: new Date(`${d.date}T00:00:00.000Z`),
    order,
    items: d.items.map((i, itemOrder) => ({
      id: i.id,
      title: i.title,
      startTime: i.startTime,
      placeId: i.placeId && knownPlaceIds.has(i.placeId) ? i.placeId : null,
      order: itemOrder,
    })),
  }));
}

export const placeIdsIn = (doc: Y.Doc) => readDays(doc).flatMap((d) => d.items.flatMap((i) => (i.placeId ? [i.placeId] : [])));
