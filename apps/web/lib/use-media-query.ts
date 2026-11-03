"use client";

import { useSyncExternalStore } from "react";

/** True while the media query matches; false on the server and before hydration. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}
