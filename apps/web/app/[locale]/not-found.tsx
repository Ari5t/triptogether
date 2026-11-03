import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <main className="mx-auto flex max-w-[560px] flex-col items-start gap-4 px-4 pt-24">
      <h1 className="text-h2">{t("title")}</h1>
      <p className="text-body-lg text-fg-secondary">{t("text")}</p>
      <Link href="/trips" className={buttonClass("primary", "lg")}>
        {t("back")}
      </Link>
    </main>
  );
}
