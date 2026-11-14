"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";

/** apiFetch refreshes an expired access token with the refresh cookie, then we continue to `to`, or re-render in place when there is none. Without a valid refresh cookie nothing happens. */
export function SessionRedirect({ to }: { to?: string }) {
  const router = useRouter();
  useEffect(() => {
    apiFetch("/me")
      .then(() => (to ? router.replace(to) : router.refresh()))
      .catch(() => {}); // refresh failed: stay on the page, the sign-in button still works
  }, [router, to]);
  return null;
}
