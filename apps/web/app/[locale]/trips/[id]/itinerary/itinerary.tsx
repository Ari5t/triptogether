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
import type { Member } from "@triptogether/shared";
import type { DayView, ItemView } from "@triptogether/doc";
import { Avatar, dayColor, participantColor } from "@/components/avatar";
import { Button } from "@/components/button";
import { Input } from "@/components/field";
import { StopBody, StopCard, type Editor } from "./stop-card";
import { useItinerary } from "./use-itinerary";

interface Props {
  tripId: string;
  members: Member[];
  currentUserId: string;
  editable: boolean;
}

export function Itinerary({ tripId, members, currentUserId, editable }: Props) {
  const t = useTranslations("itinerary");
  const it = useItinerary(tripId, currentUserId);
  const memberInfo = useMemo(() => new Map(members.map((m, i) => [m.userId, { name: m.name, color: participantColor(i) }])), [members]);

  const online = useMemo(() => {
    const ids = new Set(it.peers.map((p) => p.userId));
    return members.filter((m) => ids.has(m.userId));
  }, [it.peers, members]);

  // Who is editing which stop (never yourself).
  const editors = useMemo(() => {
    const out = new Map<string, Editor>();
    for (const p of it.peers) {
      const info = memberInfo.get(p.userId);
      if (p.userId !== currentUserId && p.editing && info) out.set(p.editing, info);
    }
    return out;
  }, [it.peers, memberInfo, currentUserId]);

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
    <section aria-label={t("title")} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-fg-muted" role="status">
          {it.state === "connected" && it.synced ? t("live") : it.state === "disconnected" ? t("offline") : t("connecting")}
        </p>
        <div role="img" aria-label={t("online", { names: online.map((m) => m.name).join(", ") })} className="flex -space-x-1.5">
          {online.map((m) => (
            <span key={m.userId} className="rounded-full ring-2 ring-canvas">
              <Avatar name={m.name} color={memberInfo.get(m.userId)!.color} size={30} online />
            </span>
          ))}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
        <div className="flex flex-col gap-3">
          {it.days.map((day, dayIndex) => (
            <DayBlock
              key={day.id}
              day={day}
              dayIndex={dayIndex}
              ids={layout[day.id] ?? []}
              itemById={itemById}
              editable={editable}
              editors={editors}
              onAdd={(title) => it.add(day.id, { title })}
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
  onAdd: (title: string) => void;
  onUpdate: (id: string, patch: Partial<Omit<ItemView, "id">>) => void;
  onRemove: (id: string) => void;
  onEditing: (id: string, on: boolean) => void;
}

function DayBlock({ day, dayIndex, ids, itemById, editable, editors, onAdd, onUpdate, onRemove, onEditing }: DayProps) {
  const t = useTranslations("itinerary");
  const locale = useLocale();
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const drop = useDroppable({ id: day.id });
  const date = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${day.date}T00:00:00Z`));
  const color = dayColor(dayIndex);
  const bodyId = `day-${day.id}`;

  return (
    <div className="rounded-xl border bg-surface">
      <div className="flex items-center gap-3 px-4 py-3">
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
      <div id={bodyId} hidden={!open} ref={drop.setNodeRef} className="flex flex-col gap-2 px-4 pb-4">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className={`flex flex-col gap-2 ${ids.length === 0 ? "min-h-10 rounded-lg border border-dashed border-primary-400 bg-primary-subtle" : ""}`}>
            {ids.map((id, index) => {
              const item = itemById.get(id);
              return item ? <StopCard key={id} item={item} number={index + 1} dayColor={color} editable={editable} editedBy={editors.get(id)} onUpdate={(p) => onUpdate(id, p)} onRemove={() => onRemove(id)} onEditing={(on) => onEditing(id, on)} /> : null;
            })}
          </ol>
        </SortableContext>
        {editable &&
          (adding ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem("title") as HTMLInputElement;
                const title = input.value.trim();
                if (title) onAdd(title);
                input.value = "";
                input.focus();
              }}
              className="flex gap-2"
            >
              <Input name="title" autoFocus maxLength={160} placeholder={t("stopPlaceholder")} aria-label={t("newStop")} onKeyDown={(e) => e.key === "Escape" && setAdding(false)} />
              <Button type="submit">{t("add")}</Button>
            </form>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setAdding(true)} className="self-start">
              <Plus size={16} strokeWidth={1.5} aria-hidden />
              {t("addToDay", { n: dayIndex + 1 })}
            </Button>
          ))}
      </div>
    </div>
  );
}
