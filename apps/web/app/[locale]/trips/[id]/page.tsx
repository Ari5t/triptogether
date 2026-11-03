import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import type { Member, TripRole } from "@triptogether/shared";
import { ApiRequestError, apiGet } from "@/lib/api";
import { TripWorkspace } from "./trip-workspace";

interface TripDetail {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  members: Member[];
  role: TripRole;
  currentUserId: string;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "trip" }))("route") };
}

export default async function TripPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  let trip: TripDetail;
  try {
    trip = await apiGet<TripDetail>(`/trips/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiRequestError) {
      if (e.status === 401) redirect(`/${locale}?next=${encodeURIComponent(`/${locale}/trips/${id}`)}`);
      if (e.status === 404) notFound();
    }
    throw e;
  }
  return <TripWorkspace trip={trip} />;
}
