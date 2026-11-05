"use client";

import { MapPin, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { dedupeDestinations, MAX_DESTINATIONS, type DestinationInput, type PlaceResult } from "@triptogether/shared";
import { usePlaceSearch } from "@/lib/use-place-search";

/**
 * Destination chips with place suggestions. A suggestion makes a place chip, Enter on plain text a text chip.
 * The form owns `draft` so it can turn leftover text into a chip on submit.
 */
export function DestinationPicker({ value, onChange, draft, onDraftChange }: { value: DestinationInput[]; onChange: (v: DestinationInput[]) => void; draft: string; onDraftChange: (v: string) => void }) {
  const t = useTranslations("newTrip");
  const id = useId();
  const listId = `${id}-list`;
  const [active, setActive] = useState(-1);
  const { results, status } = usePlaceSearch(draft);
  const full = value.length >= MAX_DESTINATIONS;
  const open = results.length > 0 && !full;

  useEffect(() => setActive(-1), [results]);

  const add = (d: DestinationInput) => {
    onChange(dedupeDestinations([...value, d]));
    onDraftChange("");
  };
  const pick = (p: PlaceResult) => add({ name: p.name, placeId: p.id });

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small font-medium">
        {t("destination")}
      </label>
      <div className="relative">
        <div className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-surface px-2 py-1 focus-within:border-focus focus-within:shadow-[0_0_0_3px_var(--primary-muted)]">
          {value.map((d, i) => (
            <span key={`${d.placeId ?? "t"}-${d.name}`} className="inline-flex max-w-full items-center gap-1 rounded-sm bg-sunken py-0.5 pl-2 pr-0.5 text-small text-fg">
              {d.placeId && <MapPin size={16} strokeWidth={1.5} aria-hidden className="shrink-0 text-fg-muted" />}
              <span className="min-w-0 break-words">{d.name}</span>
              <button type="button" aria-label={t("removeDestination", { name: d.name })} onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid size-6 shrink-0 place-items-center rounded-sm text-fg-muted hover:bg-border hover:text-fg">
                <X size={16} strokeWidth={1.5} aria-hidden />
              </button>
            </span>
          ))}
          <input
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            maxLength={160}
            disabled={full}
            placeholder={value.length ? undefined : t("destinationPlaceholder")}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && open) {
                e.preventDefault();
                setActive((i) => (i + 1) % results.length);
              } else if (e.key === "ArrowUp" && open) {
                e.preventDefault();
                setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
              } else if (e.key === "Escape") {
                onDraftChange("");
              } else if (e.key === "Enter") {
                e.preventDefault();
                const chosen = results[active];
                const name = draft.trim();
                if (open && chosen) pick(chosen);
                else if (name) add({ name });
              } else if (e.key === "Backspace" && !draft && value.length) {
                onChange(value.slice(0, -1));
              }
            }}
            className="h-7 min-w-32 flex-1 bg-transparent px-1 text-body text-fg outline-none placeholder:text-fg-muted focus-visible:shadow-none disabled:cursor-not-allowed"
          />
        </div>
        {open && (
          <ul id={listId} role="listbox" aria-label={t("places")} className="absolute inset-x-0 top-full z-10 mt-1 flex flex-col rounded-[10px] bg-surface-raised p-1 shadow-md">
            {results.map((p, i) => (
              <li
                key={p.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown, not click: the input would blur before the click lands.
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
      </div>
      {full ? (
        <p className="text-caption text-fg-muted">{t("destinationsFull", { max: MAX_DESTINATIONS })}</p>
      ) : (
        status !== "idle" && !open && <p className="text-caption text-fg-muted">{status === "empty" ? t("noPlaces") : t("placesUnavailable")}</p>
      )}
    </div>
  );
}
