"use client";

import { Check } from "lucide-react";
import { useEffect } from "react";

/** Transient confirmation. `id` changes on every show, so repeating the same message re-arms the timer. */
export function Toast({ message, id, onDone }: { message: string | null; id: number; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [message, id, onDone]);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      {message && (
        <p className="flex items-center gap-2 rounded-lg border bg-surface-raised px-4 py-3 text-body font-medium text-fg shadow-lg">
          <Check size={16} strokeWidth={1.5} aria-hidden className="text-success-ink" />
          {message}
        </p>
      )}
    </div>
  );
}
