import { ChevronDown } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Reveal } from "./motion";

const ITEMS = ["1", "2", "3", "4", "5", "6", "7"] as const;

/** Native <details>: keyboard and screen-reader support for free; `name` makes it an exclusive accordion. */
export async function Faq() {
  const t = await getTranslations("landing.faq");
  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto grid max-w-content scroll-mt-16 gap-x-16 gap-y-10 px-[clamp(16px,4vw,40px)] py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Reveal className="flex flex-col gap-4 lg:max-w-[400px]">
        <h2 id="faq-title" className="font-display text-[clamp(30px,3vw,40px)] font-bold leading-[1.2] tracking-[-0.02em]">
          {t("title")}
        </h2>
        <p className="text-[15px] leading-6 text-fg-secondary">{t("intro")}</p>
      </Reveal>
      <Reveal delay={0.1} className="border-t border-border">
        {ITEMS.map((n) => (
          <details key={n} name="faq" className="group border-b border-border">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-semibold [&::-webkit-details-marker]:hidden">
              {t(`items.${n}.q`)}
              <ChevronDown size={20} strokeWidth={1.5} aria-hidden className="shrink-0 text-fg-muted transition-transform group-open:rotate-180" />
            </summary>
            <p className="animate-[faq-in_200ms_ease-out] pb-5 pr-9 text-[15px] leading-6 text-fg-secondary">{t(`items.${n}.a`)}</p>
          </details>
        ))}
      </Reveal>
    </section>
  );
}
