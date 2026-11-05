"use client";

import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import type { NewItem } from "@triptogether/doc";
import type { PlaceResult } from "@triptogether/shared";
import { inputClass } from "@/components/field";
import { usePlaceSearch } from "@/lib/use-place-search";

/** Stop title input with place suggestions. Enter on a plain title adds a stop without a place. */
export function PlaceInput({ onAdd, onCancel, label, placeholder }: { onAdd: (item: NewItem) => void; onCancel: () => void; label: string; placeholder: string }) {
  const t = useTranslations("itinerary");
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [active, setActive] = useState(-1);
  const { results, status } = usePlaceSearch(text);

  useEffect(() => setActive(-1), [results]);

  const reset = () => {
    setText("");
    inputRef.current?.focus();
  };

  const pick = (p: PlaceResult) => {
    onAdd({ title: p.name, placeId: p.id, address: p.address, lat: p.lat, lng: p.lng });
    reset();
  };

  const submitPlain = () => {
    const title = text.trim();
    if (title) onAdd({ title });
    reset();
  };

  const open = results.length > 0;
  return (
    <div className="relative min-w-0 flex-1">
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        aria-label={label}
        autoFocus
        autoComplete="off"
        maxLength={160}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          else if (e.key === "ArrowDown" && open) {
            e.preventDefault();
            setActive((i) => (i + 1) % results.length);
          } else if (e.key === "ArrowUp" && open) {
            e.preventDefault();
            setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const chosen = results[active];
            if (chosen) pick(chosen);
            else submitPlain();
          }
        }}
        onBlur={(e) => !text.trim() && !e.relatedTarget && onCancel()}
        className={inputClass}
      />
      {open && (
        <ul id={listId} role="listbox" aria-label={t("places")} className="absolute inset-x-0 top-11 z-10 flex flex-col rounded-[10px] bg-surface-raised p-1 shadow-md">
          {results.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: the input would blur and unmount the list first.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              className={`flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 ${i === active ? "bg-primary-subtle" : "hover:bg-primary-subtle"}`}
            >
              <MapPin size={16} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0 text-fg-muted" />
              <span className="min-w-0">
                <span className="block truncate text-body">{p.name}</span>
                {p.address && <span className="block truncate text-[12px] text-fg-muted">{p.address}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {status !== "idle" && !open && <p className="mt-1 text-caption text-fg-muted">{status === "empty" ? t("noPlaces") : t("placesUnavailable")}</p>}
    </div>
  );
}
