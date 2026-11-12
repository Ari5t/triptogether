import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { TripSocketProvider } from "@/lib/use-trip-socket";
import { ApiRequestError, apiGet } from "@/lib/api";
import { TripBottomNav } from "@/components/bottom-nav";
import { TripHeader, type TripSummary } from "../trip-header";
import { DiscussionView, type Thread } from "./discussion-view";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "trip" }))("discussion") };
}

export default async function DiscussionPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const path = `/trips/${encodeURIComponent(id)}`;
  let trip: TripSummary, threads: Thread[];
  try {
    [trip, threads] = await Promise.all([apiGet<TripSummary>(path), apiGet<Thread[]>(`${path}/threads`)]);
  } catch (e) {
    if (e instanceof ApiRequestError) {
      if (e.status === 401) redirect(`/${locale}?next=${encodeURIComponent(`/${locale}/trips/${id}/discussion`)}`);
      if (e.status === 404) notFound();
    }
    throw e;
  }
  return (
    <TripSocketProvider tripId={trip.id}>
      <div className="flex h-dvh flex-col">
        <TripHeader trip={trip} active="discussion" />
        <DiscussionView trip={trip} threads={threads} />
        <TripBottomNav tripId={trip.id} active="discussion" owner={trip.role === "OWNER"} />
      </div>
    </TripSocketProvider>
  );
}
