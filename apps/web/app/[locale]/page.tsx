import { ArrowRight, Route } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { LocaleSwitch } from "@/components/locale-switch";
import { ThemeSwitch } from "@/components/theme-switch";
import { ApiRequestError, apiGet } from "@/lib/api";
import { LandingModules } from "./landing-modules";
import { SessionRedirect } from "./session-redirect";

export default async function Landing({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const { locale } = await params;
  const { next } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();
  // `next` is only used as an in-site path; anything else falls back to the trips list.
  const target = next && /^\/(?![/\\])/.test(next) ? next : `/${locale}/trips`;
  const href = `/api/v1/auth/google?next=${encodeURIComponent(target)}`;

  // Already signed in: skip Google. Any failure (including API down) just shows the landing page.
  // On 401 the browser may still hold a refresh cookie (path-scoped to /api/v1/auth, so the server cannot see it): the client tries it.
  let session: "signed-in" | "retry" | "anonymous" = "anonymous";
  try {
    await apiGet("/me");
    session = "signed-in";
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 401) session = "retry";
  }
  if (session === "signed-in") redirect(target);

  // The only primary action on the page, repeated in the hero and the final card (DESIGN.md §7.1).
  const signIn = (
    <a href={href} className="inline-flex h-13 items-center gap-2 rounded-md bg-primary px-6 text-[16px] font-semibold text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed">
      {t("landing.signIn")}
      <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
    </a>
  );

  return (
    <>
      <main>
        <div className="mx-auto flex max-w-content flex-col gap-7 px-[clamp(16px,4vw,40px)] pb-24 pt-18">
          {session === "retry" && <SessionRedirect to={target} />}
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Route size={16} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="font-display text-h4 font-bold">{t("brand")}</span>
          </div>
          <div className="flex max-w-[540px] flex-col gap-7">
            <p className="label text-primary">{t("landing.eyebrow")}</p>
            <h1 className="font-display text-[clamp(40px,5vw,60px)] leading-[1.08] tracking-[-0.03em]">{t("landing.title")}</h1>
            <p className="text-body-lg text-fg-secondary">{t("landing.subtitle")}</p>
            <div className="flex flex-col items-start gap-3">
              {signIn}
              <p className="text-small text-fg-muted">{t("landing.note")}</p>
            </div>
          </div>
        </div>
        <section aria-labelledby="how-title" className="border-t border-border bg-surface">
          <div className="mx-auto flex max-w-content flex-col gap-12 px-[clamp(16px,4vw,40px)] py-24">
            <h2 id="how-title" className="max-w-[640px] font-display text-[clamp(30px,3vw,40px)] font-bold leading-[1.2] tracking-[-0.02em]">
              {t("landing.how.title")}
            </h2>
            <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-10">
              {(["1", "2", "3"] as const).map((n) => (
                <li key={n} className={`flex flex-col gap-2 border-t-2 pt-6 ${n === "1" ? "border-primary" : "border-border"}`}>
                  <span className="font-mono text-[14px] font-medium tabular-nums text-fg-muted">0{n}</span>
                  <h3 className="font-display text-h3">{t(`landing.how.steps.${n}.title`)}</h3>
                  <p className="text-[15px] leading-6 text-fg-secondary">{t(`landing.how.steps.${n}.text`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <LandingModules />
        <section aria-labelledby="cta-title" className="mx-auto max-w-content px-[clamp(16px,4vw,40px)] pb-24">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(480px,100%),1fr))] overflow-hidden rounded-[20px] border border-border bg-surface">
            {/* No photo yet: a quiet theme-aware tone, as on trip covers. */}
            <div aria-hidden className="min-h-[360px] bg-map-forest" />
            <div className="flex flex-col items-start justify-center gap-6 p-[clamp(32px,5vw,64px)]">
              <h2 id="cta-title" className="font-display text-[clamp(30px,3vw,40px)] font-bold leading-[1.2] tracking-[-0.02em]">
                {t("landing.cta.title")}
              </h2>
              <p className="text-body-lg text-fg-secondary">{t("landing.cta.text")}</p>
              {signIn}
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-4 px-[clamp(16px,4vw,40px)] py-7 text-small text-fg-muted">
          <p>© 2026 {t("brand")}</p>
          <div className="flex items-center gap-2">
            <ThemeSwitch />
            <LocaleSwitch />
          </div>
        </div>
      </footer>
    </>
  );
}
