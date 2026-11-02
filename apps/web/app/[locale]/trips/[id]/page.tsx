import { Route } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import type { Member, TripRole } from "@triptogether/shared";
import { Link } from "@/i18n/navigation";
import { ApiRequestError, apiGet } from "@/lib/api";
import { formatRange } from "@/lib/format";
import { InviteDialog } from "./invite-dialog";

interface TripDetail {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  members: Member[];
  role: TripRole;
  currentUserId: string;
}

export default async function TripPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("trip");
  let trip: TripDetail;
  try {
    trip = await apiGet<TripDetail>(`/trips/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiRequestError) {
      if (e.status === 401) redirect(`/${locale}`);
      if (e.status === 404) notFound();
    }
    throw e;
  }
  return (
    <>
      <header className="flex min-h-14 flex-wrap items-center gap-x-5 gap-y-2 border-b bg-surface px-4 py-2">
        <Link href="/trips" aria-label={t("backToTrips")} className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
          <Route size={16} strokeWidth={1.75} aria-hidden />
        </Link>
        <div className="flex flex-col">
          <h1 className="font-display text-[16px] font-bold leading-5 tracking-[-0.01em]">{trip.title}</h1>
          <p className="text-caption tabular-nums text-fg-muted">{formatRange(locale, trip.startDate, trip.endDate)}</p>
        </div>
        <div className="ml-auto">
          {trip.role === "OWNER" && <InviteDialog tripId={trip.id} members={trip.members} currentUserId={trip.currentUserId} />}
        </div>
      </header>
      <main className="mx-auto max-w-content px-[clamp(16px,4vw,40px)] py-8">
        <p className="rounded-xl border border-dashed border-border-strong p-6 text-body text-fg-secondary">{t("itineraryLater")}</p>
      </main>
    </>
  );
}
