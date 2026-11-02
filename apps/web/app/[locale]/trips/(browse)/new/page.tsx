import { getTranslations, setRequestLocale } from "next-intl/server";
import { NewTripForm } from "./new-trip-form";

export default async function NewTripPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("newTrip");
  return (
    <main className="mx-auto flex max-w-[560px] flex-col gap-6 px-4 pb-20 pt-12">
      <h1 className="text-h2">{t("title")}</h1>
      <NewTripForm />
    </main>
  );
}
