"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { DayView, ItemView, NewItem } from "@triptogether/doc";
import { dayColor } from "@/components/avatar";
import { Button } from "@/components/button";
import { PlaceInput } from "./place-input";
import { StopBody, StopCard, type Editor } from "./stop-card";
import type { useItinerary } from "./use-itinerary";

interface Props {
  tripId: string;
  it: ReturnType<typeof useItinerary>;
  editable: boolean;
  /** Stops other participants are editing right now. */
  editors: Map<string, Editor>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function Itinerary({ tripId, it, editable, editors, selectedId, onSelect }: Props) {
  const t = useTranslations("itinerary");
  const locale = useLocale();
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [addingDay, setAddingDay] = useState<string | null>(null);
  const currentDayId = activeDay ?? it.days[0]?.id ?? null;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // While dragging, stops are re-arranged in this draft only; Yjs is written once on drop.
  const [draft, setDraft] = useState<Record<string, string[]> | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const itemById = useMemo(() => new Map(it.days.flatMap((d) => d.items.map((i) => [i.id, i] as const))), [it.days]);
  const layout: Record<string, string[]> = draft ?? Object.fromEntries(it.days.map((d) => [d.id, d.items.map((i) => i.id)]));
  const containerOf = (id: string) => (id in layout ? id : Object.keys(layout).find((k) => layout[k]!.includes(id)));

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const from = containerOf(String(active.id));
    const to = containerOf(String(over.id));
    if (!from || !to || from === to) return;
    const base = layout;
    const target = base[to]!;
    const overIndex = target.indexOf(String(over.id));
    const index = overIndex >= 0 ? overIndex : target.length;
    setDraft({ ...base, [from]: base[from]!.filter((id) => id !== active.id), [to]: [...target.slice(0, index), String(active.id), ...target.slice(index)] });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const id = String(active.id);
    const container = containerOf(id);
    if (container && over) {
      const list = layout[container]!;
      const from = list.indexOf(id);
      const overIndex = list.indexOf(String(over.id));
      const index = overIndex >= 0 ? overIndex : from;
      const final = arrayMove(list, from, index);
      it.move(id, container, final.indexOf(id));
    }
    setDraft(null);
    setActiveId(null);
  };

  const onDragCancel = () => {
    setDraft(null);
    setActiveId(null);
  };

  const active = activeId ? itemById.get(activeId) : undefined;
  const activeDayIndex = active ? it.days.findIndex((d) => (containerOf(active.id) ?? "") === d.id) : -1;

  return (
    <section aria-label={t("title")}>
      <div className="flex items-center justify-between gap-3 border-b px-5 pb-3 pt-4">
        <p className="text-small text-fg-muted" role="status">
          {t("totalStops", { count: it.days.reduce((n, d) => n + d.items.length, 0) })} ·{" "}
          {it.state === "connected" && it.synced ? t("live") : it.state === "disconnected" ? t("offline") : t("connecting")}
        </p>
        {editable && currentDayId && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setAddingDay(currentDayId);
              document.getElementById(`day-${currentDayId}`)?.scrollIntoView({ block: "nearest" });
            }}
          >
            <Plus size={16} strokeWidth={1.5} aria-hidden />
            {t("stopButton")}
          </Button>
        )}
      </div>
      <div role="group" aria-label={t("days")} className="flex gap-2 overflow-x-auto border-b px-5 py-3">
        {it.days.map((day, i) => {
          const on = day.id === currentDayId;
          const dom = new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" }).format(new Date(`${day.date}T00:00:00Z`));
          return (
            <button
              key={day.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setActiveDay(day.id);
                document.getElementById(`section-${day.id}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
              }}
              className={`flex h-10 min-w-[72px] flex-1 items-center justify-center gap-1.5 rounded-md border text-[12px] font-semibold tabular-nums ${on ? "border-primary bg-primary-subtle" : "hover:bg-sunken"}`}
            >
              <span className="size-2 rounded-[2px]" style={{ backgroundColor: dayColor(i) }} aria-hidden />
              {t("chip", { n: i + 1, d: dom })}
            </button>
          );
        })}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
        <div className="flex flex-col">
          {it.days.map((day, dayIndex) => (
            <DayBlock
              key={day.id}
              day={day}
              dayIndex={dayIndex}
              ids={layout[day.id] ?? []}
              itemById={itemById}
              editable={editable}
              editors={editors}
              dragging={activeId !== null}
              adding={addingDay === day.id}
              onAddingChange={(on) => setAddingDay(on ? day.id : null)}
              onAdd={(item) => {
                const id = it.add(day.id, item);
                if (id && item.lat != null) onSelect(id);
              }}
              selectedId={selectedId}
              onSelect={onSelect}
              tripId={tripId}
              onUpdate={it.update}
              onRemove={it.remove}
              onEditing={(id, on) => it.setEditing(on ? id : null)}
            />
          ))}
        </div>
        <DragOverlay>
          {active && (
            <StopBody item={active} number={(layout[it.days[activeDayIndex]?.id ?? ""]?.indexOf(active.id) ?? 0) + 1} dayColor={dayColor(Math.max(activeDayIndex, 0))} editable={false} dragging onUpdate={() => {}} onRemove={() => {}} onEditing={() => {}} />
          )}
        </DragOverlay>
      </DndContext>
    </section>
  );
}

interface DayProps {
  day: DayView;
  dayIndex: number;
  ids: string[];
  itemById: Map<string, ItemView>;
  editable: boolean;
  editors: Map<string, Editor>;
  dragging: boolean;
  adding: boolean;
  onAddingChange: (on: boolean) => void;
  onAdd: (item: NewItem) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  tripId: string;
  onUpdate: (id: string, patch: Partial<Omit<ItemView, "id">>) => void;
  onRemove: (id: string) => void;
  onEditing: (id: string, on: boolean) => void;
}

function DayBlock({ day, dayIndex, ids, itemById, editable, editors, dragging, adding, onAddingChange, onAdd, selectedId, onSelect, tripId, onUpdate, onRemove, onEditing }: DayProps) {
  const t = useTranslations("itinerary");
  const locale = useLocale();
  const [open, setOpen] = useState(true);
  const drop = useDroppable({ id: day.id });
  const date = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${day.date}T00:00:00Z`));
  const color = dayColor(dayIndex);
  const bodyId = `day-${day.id}`;

  return (
    <div id={`section-${day.id}`} className="scroll-mt-0 border-b last:border-b-0">
      <div className="flex items-center gap-3 px-5 pb-2.5 pt-4">
        <span className="grid size-[26px] shrink-0 place-items-center rounded-[7px] text-[12px] font-bold text-day-foreground" style={{ backgroundColor: color }}>
          {dayIndex + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] font-bold leading-5">{t("day", { n: dayIndex + 1 })}</h3>
          <p className="text-caption tabular-nums text-fg-muted">
            {date} · {t("stops", { count: ids.length })}
          </p>
        </div>
        <Button variant="ghost" size="sm" aria-expanded={open} aria-controls={bodyId} aria-label={open ? t("collapse", { n: dayIndex + 1 }) : t("expand", { n: dayIndex + 1 })} onClick={() => setOpen(!open)} className="size-8 px-0 text-fg-secondary">
          {open ? <ChevronDown size={16} strokeWidth={1.5} aria-hidden /> : <ChevronRight size={16} strokeWidth={1.5} aria-hidden />}
        </Button>
      </div>
      <div id={bodyId} hidden={!open} ref={drop.setNodeRef} className="flex flex-col gap-2 px-5 pb-5">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className={`flex flex-col gap-2 ${ids.length === 0 ? (dragging ? "min-h-10 rounded-lg border border-dashed border-primary-400 bg-primary-subtle" : "min-h-0") : ""}`}>
            {ids.map((id, index) => {
              const item = itemById.get(id);
              return item ? <StopCard key={id} item={item} number={index + 1} dayColor={color} editable={editable} editedBy={editors.get(id)} selected={id === selectedId} onSelect={() => onSelect(id)} commentsHref={`/trips/${tripId}/discussion?thread=${id}`} onUpdate={(p) => onUpdate(id, p)} onRemove={() => onRemove(id)} onEditing={(on) => onEditing(id, on)} /> : null;
            })}
          </ol>
        </SortableContext>
        {editable &&
          (adding ? (
            <div className="flex gap-2">
              <PlaceInput label={t("newStop")} placeholder={t("stopPlaceholder")} onAdd={onAdd} onCancel={() => onAddingChange(false)} />
              <Button type="button" onClick={() => onAddingChange(false)} variant="secondary">
                {t("done")}
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => onAddingChange(true)} className="self-start">
              <Plus size={16} strokeWidth={1.5} aria-hidden />
              {t("addToDay", { n: dayIndex + 1 })}
            </Button>
          ))}
      </div>
    </div>
  );
}
