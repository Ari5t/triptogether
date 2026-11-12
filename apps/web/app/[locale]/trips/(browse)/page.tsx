import { Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import type { TripRole } from "@triptogether/shared";
import { buttonClass } from "@/components/button";
import { Link } from "@/i18n/navigation";
import { ApiRequestError, apiGet } from "@/lib/api";
import { TripsView, type TripItem } from "./trips-view";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "trips" }))("title") };
}

export default async function TripsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ deleted?: string }> }) {
  const { locale } = await params;
  const { deleted } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("trips");
  let trips: (TripItem & { role: TripRole })[];
  try {
    trips = await apiGet<(TripItem & { role: TripRole })[]>("/trips");
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 401) redirect(`/${locale}`);
    throw e;
  }
  const today = new Date().toISOString().slice(0, 10);
  const planned = trips.filter((x) => x.endDate >= today);
  const past = trips.filter((x) => x.endDate < today).reverse();
  return (
    <main className="mx-auto flex max-w-content flex-col gap-8 px-[clamp(16px,4vw,40px)] pb-20 pt-12">
      {deleted && (
        <p role="status" className="rounded-lg bg-sunken p-3 text-body">
          {t("deletedNotice")}
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t("title")}</h1>
          <p className="text-body text-fg-muted">{t("summary", { planned: planned.length, past: past.length })}</p>
        </div>
        <Link href="/trips/new" className={buttonClass("primary")}>
          <Plus size={16} strokeWidth={1.5} aria-hidden />
          {t("new")}
        </Link>
      </div>
      {trips.length === 0 ? (
        <section className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-border-strong p-14">
          <h2 className="text-h2">{t("empty")}</h2>
          <p className="max-w-[420px] text-body-lg text-fg-secondary">{t("emptyText")}</p>
          <Link href="/trips/new" className={buttonClass("primary", "lg")}>
            <Plus size={16} strokeWidth={1.5} aria-hidden />
            {t("new")}
          </Link>
        </section>
      ) : (
        <TripsView planned={planned} past={past} />
      )}
    </main>
  );
}
