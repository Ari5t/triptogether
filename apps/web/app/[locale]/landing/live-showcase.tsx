import { getTranslations } from "next-intl/server";
import { LiveDemo } from "./live-demo";
import { Reveal } from "./motion";

/** "Live" band: what real-time editing looks like, shown rather than claimed. */
export async function LiveShowcase() {
  const t = await getTranslations("landing.live");
  return (
    <section id="live" aria-labelledby="live-title" className="scroll-mt-16 border-y border-border bg-surface">
      <div className="mx-auto grid max-w-content items-center gap-x-16 gap-y-12 px-[clamp(16px,4vw,40px)] py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Reveal className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h2 id="live-title" className="font-display text-[clamp(30px,3vw,40px)] font-bold leading-[1.2] tracking-[-0.02em]">
              {t("title")}
            </h2>
            <p className="text-body-lg text-fg-secondary">{t("text")}</p>
          </div>
          <ul className="flex flex-col gap-5">
            {(["1", "2", "3"] as const).map((n) => (
              <li key={n} className="flex flex-col gap-1 border-t border-border pt-4">
                <h3 className="font-display text-h3">{t(`facts.${n}.title`)}</h3>
                <p className="text-[15px] leading-6 text-fg-secondary">{t(`facts.${n}.text`)}</p>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.1}>
          <LiveDemo />
        </Reveal>
      </div>
    </section>
  );
}
