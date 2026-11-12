import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import type { DestinationInput, Member, TripRole } from "@triptogether/shared";
import { TripBottomNav } from "@/components/bottom-nav";
import { ApiRequestError, apiGet } from "@/lib/api";
import { TripHeader } from "../trip-header";
import { DeleteTripDialog } from "./delete-trip-dialog";
import { TripSettingsForm } from "./trip-settings-form";

interface TripDetail {
  id: string;
  title: string;
  destinations: DestinationInput[];
  startDate: string;
  endDate: string;
  stopCount: number;
  members: Member[];
  role: TripRole;
  currentUserId: string;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "settings" }))("title") };
}

export default async function TripSettingsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("settings");
  let trip: TripDetail;
  try {
    trip = await apiGet<TripDetail>(`/trips/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiRequestError) {
      if (e.status === 401) redirect(`/${locale}?next=${encodeURIComponent(`/${locale}/trips/${id}/settings`)}`);
      if (e.status === 404) notFound();
    }
    throw e;
  }
  if (trip.role !== "OWNER") redirect(`/${locale}/trips/${id}`);
  return (
    <div className="flex min-h-dvh flex-col">
      <TripHeader trip={trip} active="settings" />
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-10 px-4 pb-10 pt-10">
        <div className="flex flex-col gap-6">
          <h2 className="text-h2">{t("title")}</h2>
          <TripSettingsForm trip={trip} />
        </div>
        <section aria-labelledby="danger" className="flex flex-col gap-3 border-t pt-8">
          <h2 id="danger" className="text-h3">
            {t("dangerTitle")}
          </h2>
          <p className="text-body text-fg-secondary">{t("deleteText")}</p>
          <div>
            <DeleteTripDialog tripId={trip.id} title={trip.title} />
          </div>
        </section>
      </main>
      <TripBottomNav tripId={trip.id} active="settings" owner />
    </div>
  );
}
