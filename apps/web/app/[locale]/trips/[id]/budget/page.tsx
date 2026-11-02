import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { ApiRequestError, apiGet } from "@/lib/api";
import { TripHeader, type TripSummary } from "../trip-header";
import { BudgetView, type BalancesData, type ExpenseRow } from "./budget-view";

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
    <>
      <TripHeader trip={trip} active="budget" />
      <BudgetView trip={trip} expenses={expenses} data={balances} />
    </>
  );
}
