"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";

/** apiFetch refreshes an expired access token with the refresh cookie, then we continue to `to`. Without a valid refresh cookie nothing happens. */
export function SessionRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    apiFetch("/me")
      .then(() => router.replace(to))
      .catch(() => {}); // refresh failed: stay on the page, the sign-in button still works
  }, [router, to]);
  return null;
}
