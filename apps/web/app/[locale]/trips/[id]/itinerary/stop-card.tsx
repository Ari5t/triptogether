"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ItemView } from "@triptogether/doc";
import { Button } from "@/components/button";

export interface Editor {
  name: string;
  color: string;
}

interface Props {
  item: ItemView;
  number: number;
  dayColor: string;
  editable: boolean;
  /** Another participant is editing this stop. */
  editedBy?: Editor | undefined;
  onUpdate: (patch: Partial<Omit<ItemView, "id">>) => void;
  onRemove: () => void;
  onEditing: (editing: boolean) => void;
}

export function StopCard({ item, number, dayColor, editable, editedBy, onUpdate, onRemove, onEditing }: Props) {
  const t = useTranslations("itinerary");
  const sortable = useSortable({ id: item.id, disabled: !editable });
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition, opacity: sortable.isDragging ? 0.4 : 1 };
  return (
    <li
      ref={sortable.setNodeRef}
      style={{ ...style, ...(editedBy ? { boxShadow: `0 0 0 3px color-mix(in srgb, ${editedBy.color} 14%, transparent)` } : {}) }}
      className="relative rounded-lg"
    >
      <StopBody {...{ item, number, dayColor, editable, editedBy, onUpdate, onRemove, onEditing }} handle={editable ? <Grip sortable={sortable} label={t("drag")} /> : null} />
    </li>
  );
}

function Grip({ sortable, label }: { sortable: ReturnType<typeof useSortable>; label: string }) {
  return (
    <button type="button" aria-label={label} ref={sortable.setActivatorNodeRef} {...sortable.attributes} {...sortable.listeners} className="mt-0.5 cursor-grab touch-none text-fg-faint hover:text-fg-secondary active:cursor-grabbing">
      <GripVertical size={16} strokeWidth={1.5} aria-hidden />
    </button>
  );
}

/** The card itself; also rendered inside DragOverlay while dragging. */
export function StopBody({ item, number, dayColor, editable, editedBy, onUpdate, onRemove, onEditing, handle, dragging }: Props & { handle?: React.ReactNode; dragging?: boolean }) {
  const t = useTranslations("itinerary");
  return (
    <div className={`flex gap-2.5 rounded-lg border bg-surface p-3 ${dragging ? "-rotate-1 border-transparent shadow-lg" : ""}`} style={editedBy ? { borderColor: editedBy.color } : undefined}>
      {handle}
      <span className="grid size-[22px] shrink-0 place-items-center rounded-sm text-[11px] font-bold text-day-foreground" style={{ backgroundColor: dayColor }}>
        {number}
      </span>
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <input
          aria-label={t("stopTitle")}
          defaultValue={item.title}
          key={item.title}
          readOnly={!editable}
          maxLength={160}
          onFocus={() => onEditing(true)}
          onBlur={(e) => {
            onEditing(false);
            const title = e.currentTarget.value.trim();
            if (editable && title && title !== item.title) onUpdate({ title });
            else e.currentTarget.value = item.title;
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="min-w-0 flex-1 bg-transparent text-body font-semibold read-only:cursor-default"
        />
        <input
          inputMode="numeric"
          aria-label={t("startTime")}
          placeholder="--:--"
          maxLength={5}
          defaultValue={item.startTime ?? ""}
          key={item.startTime ?? "none"}
          readOnly={!editable}
          onFocus={() => onEditing(true)}
          onBlur={(e) => {
            onEditing(false);
            const raw = e.currentTarget.value.trim();
            // 24-hour HH:MM in every locale (DESIGN.md §3.3); anything else reverts.
            const v = /^([01]?\d|2[0-3]):[0-5]\d$/.test(raw) ? raw.padStart(5, "0") : raw === "" ? null : undefined;
            if (v === undefined) e.currentTarget.value = item.startTime ?? "";
            else if (editable && v !== item.startTime) onUpdate({ startTime: v });
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="w-[52px] bg-transparent text-right text-small tabular-nums text-fg-secondary placeholder:text-fg-faint read-only:cursor-default"
        />
        {editable && (
          <Button variant="ghost" size="sm" aria-label={t("remove")} onClick={onRemove} className="-my-1 size-7 px-0 text-fg-muted">
            <X size={16} strokeWidth={1.5} aria-hidden />
          </Button>
        )}
      </div>
      {editedBy && (
        <span className="absolute -top-2.5 right-3 rounded-[4px] px-1.5 py-0.5 text-[11px] font-semibold text-p-foreground" style={{ backgroundColor: editedBy.color }}>
          {t("editing", { name: editedBy.name.split(" ")[0] ?? editedBy.name })}
        </span>
      )}
    </div>
  );
}
