import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ApiRequestError, apiGet } from "@/lib/api";
import { formatRange } from "@/lib/format";
import type { TripRole } from "@triptogether/shared";

interface TripListItem {
  id: string;
  title: string;
  destination: string | null;
  startDate: string;
  endDate: string;
  role: TripRole;
}

export default async function TripsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("trips");
  let trips: TripListItem[];
  try {
    trips = await apiGet<TripListItem[]>("/trips");
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 401) redirect(`/${locale}`);
    throw e;
  }
  return (
    <main className="mx-auto flex max-w-content flex-col gap-8 px-[clamp(16px,4vw,40px)] pb-20 pt-12">
      <h1 className="text-h1">{t("title")}</h1>
      {trips.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong p-14 text-h2 font-display">{t("empty")}</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(360px,100%),1fr))] gap-6">
          {trips.map((trip) => (
            <li key={trip.id} className="flex flex-col gap-3 rounded-lg border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[18px] leading-6">{trip.title}</h2>
                <span className="rounded-sm bg-sunken px-2 text-[11px] font-semibold leading-[22px]">{t(`role.${trip.role}`)}</span>
              </div>
              {trip.destination && <p className="text-small text-fg-secondary">{trip.destination}</p>}
              <p className="text-small tabular-nums text-fg-secondary">{formatRange(locale, trip.startDate, trip.endDate)}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
