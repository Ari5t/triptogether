import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Reveal } from "./landing/motion";
import { BudgetVisual, ItineraryVisual, MapVisual, PollVisual } from "./landing/module-visuals";

export async function LandingModules() {
  const t = await getTranslations("landing.modules");
  const modules: { key: "itinerary" | "map" | "budget" | "discussion"; visual: ReactNode }[] = [
    { key: "itinerary", visual: <ItineraryVisual /> },
    { key: "map", visual: <MapVisual /> },
    { key: "budget", visual: <BudgetVisual /> },
    { key: "discussion", visual: <PollVisual /> },
  ];
  return (
    <section id="modules" aria-labelledby="modules-title" className="scroll-mt-16 mx-auto flex max-w-content flex-col gap-12 px-[clamp(16px,4vw,40px)] py-24">
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        <h2 id="modules-title" className="max-w-[640px] font-display text-[clamp(30px,3vw,40px)] font-bold leading-[1.2] tracking-[-0.02em]">
          {t("title")}
        </h2>
        <p className="max-w-[380px] text-[15px] leading-6 text-fg-secondary">{t("intro")}</p>
      </Reveal>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(520px,100%),1fr))] gap-x-12 gap-y-10">
        {modules.map(({ key, visual }, i) => (
          <Reveal key={key} as="article" delay={(i % 2) * 0.08} className="flex flex-col gap-3">
            {/* Illustration only: the same content is described by the heading and text below. */}
            <div aria-hidden className="relative mb-3 grid h-[300px] place-items-center overflow-hidden rounded-xl bg-sunken p-8">
              {visual}
            </div>
            <h3 className="font-display text-h3">{t(`${key}.title`)}</h3>
            <p className="max-w-[460px] text-[15px] leading-6 text-fg-secondary">{t(`${key}.text`)}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
