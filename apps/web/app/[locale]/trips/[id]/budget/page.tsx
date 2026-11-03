import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { ApiRequestError, apiGet } from "@/lib/api";
import { TripSocketProvider } from "@/lib/use-trip-socket";
import { TripBottomNav } from "@/components/bottom-nav";
import { TripHeader, type TripSummary } from "../trip-header";
import { BudgetView, type BalancesData, type ExpenseRow } from "./budget-view";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "trip" }))("budget") };
}

export default async function BudgetPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const path = `/trips/${encodeURIComponent(id)}`;
  let trip: TripSummary, expenses: ExpenseRow[], balances: BalancesData;
  try {
    [trip, expenses, balances] = await Promise.all([apiGet<TripSummary>(path), apiGet<ExpenseRow[]>(`${path}/expenses`), apiGet<BalancesData>(`${path}/balances`)]);
  } catch (e) {
    if (e instanceof ApiRequestError) {
      if (e.status === 401) redirect(`/${locale}?next=${encodeURIComponent(`/${locale}/trips/${id}/budget`)}`);
      if (e.status === 404) notFound();
    }
    throw e;
  }
  return (
    <TripSocketProvider tripId={trip.id}>
      <div className="flex min-h-dvh flex-col">
        <TripHeader trip={trip} active="budget" />
        <div className="flex-1">
          <BudgetView trip={trip} expenses={expenses} data={balances} />
        </div>
        <TripBottomNav tripId={trip.id} active="budget" />
      </div>
    </TripSocketProvider>
  );
}
