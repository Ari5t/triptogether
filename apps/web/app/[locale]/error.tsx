"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("error");
  return (
    <main className="mx-auto flex max-w-[560px] flex-col items-start gap-4 px-4 pt-24">
      <h1 className="text-h2">{t("title")}</h1>
      <p role="alert" className="text-body-lg text-fg-secondary">
        {t("text")}
      </p>
      <Button size="lg" onClick={reset}>
        {t("retry")}
      </Button>
    </main>
  );
}
