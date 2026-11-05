import { useEffect, useState } from "react";
import type { PlaceResult } from "@triptogether/shared";
import { apiFetch, ClientApiError } from "@/lib/client-api";

const MIN_CHARS = 3;
const DEBOUNCE_MS = 300;

export type PlaceSearchStatus = "idle" | "empty" | "unavailable";

/** Debounced `/places/search` for a text input. Results clear when the text drops below 3 characters. */
export function usePlaceSearch(text: string) {
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [status, setStatus] = useState<PlaceSearchStatus>("idle");

  useEffect(() => {
    if (text.trim().length < MIN_CHARS) {
      setResults([]);
      setStatus("idle");
      return;
    }
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const found = await apiFetch<PlaceResult[]>(`/places/search?q=${encodeURIComponent(text.trim())}`);
        if (stale) return;
        setResults(found);
        setStatus(found.length === 0 ? "empty" : "idle");
      } catch (e) {
        if (stale) return;
        setResults([]);
        setStatus(e instanceof ClientApiError && e.code === "PLACES_UNAVAILABLE" ? "unavailable" : "idle");
      }
    }, DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [text]);

  return { results, status };
}
