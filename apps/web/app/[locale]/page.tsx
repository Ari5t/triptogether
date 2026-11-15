import { ArrowRight, Route } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { buttonClass } from "@/components/button";
import { LocaleSwitch } from "@/components/locale-switch";
import { ThemeSwitch } from "@/components/theme-switch";
import { Link } from "@/i18n/navigation";
import { ApiRequestError, apiGet } from "@/lib/api";
import { Faq } from "./landing/faq";
import { HeroPreview } from "./landing/hero-preview";
import { LiveShowcase } from "./landing/live-showcase";
import { LandingMotion, Reveal, RuleFill } from "./landing/motion";
import { RidgeIllustration } from "./landing/ridge-illustration";
import { LandingHeader } from "./landing-header";
import { LandingModules } from "./landing-modules";
import { SessionRedirect } from "./session-redirect";

const REPO = "https://github.com/Ari5t/triptogether";

export default async function Landing({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> }) {
  const { locale } = await params;
  const { next } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();
  // `next` is only used as an in-site path; anything else falls back to the trips list.
  const target = next && /^\/(?![/\\])/.test(next) ? next : `/${locale}/trips`;
  const href = `/api/v1/auth/google?next=${encodeURIComponent(target)}`;

  // Any failure (including API down) just shows the anonymous landing page.
  // On 401 the browser may still hold a refresh cookie (path-scoped to /api/v1/auth, so the server cannot see it): the client tries it.
  let me: { name: string; email: string } | null = null;
  let retry = false;
  try {
    me = await apiGet<{ name: string; email: string }>("/me");
  } catch (e) {
    retry = e instanceof ApiRequestError && e.status === 401;
  }
  // An explicit `next` (sent here by the proxy or an invite) is honoured; a plain visit stays on the landing.
  if (me && next && target === next) redirect(target);

  // The only primary action on the page, repeated in the hero and the final card (DESIGN.md §7.1).
  const ctaClass = "inline-flex h-13 items-center gap-2 rounded-md bg-primary px-6 text-[16px] font-semibold text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed";
  const signIn = me ? (
    <Link href="/trips" className={ctaClass}>
      {t("trips.title")}
      <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
    </Link>
  ) : (
    <a href={href} className={ctaClass}>
      {t("landing.signIn")}
      <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
    </a>
  );

  return (
    <LandingMotion>
      {retry && <SessionRedirect to={next ? target : undefined} />}
      {/* DESIGN.md §7.1 header; sticky so sign-in / the account menu stay in reach. */}
      <LandingHeader>
        <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-3 px-[clamp(16px,4vw,40px)]">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Route size={16} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="font-display text-[18px] font-bold max-sm:sr-only">{t("brand")}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <nav aria-label={t("landing.nav.label")} className="hidden items-center lg:flex">
              <a href="#how" className="rounded-md px-3 py-2.5 text-[14px] font-medium text-fg-secondary hover:text-fg">{t("landing.nav.how")}</a>
              <a href="#modules" className="rounded-md px-3 py-2.5 text-[14px] font-medium text-fg-secondary hover:text-fg">{t("landing.nav.features")}</a>
              <a href="#live" className="rounded-md px-3 py-2.5 text-[14px] font-medium text-fg-secondary hover:text-fg">{t("landing.nav.live")}</a>
              <a href="#faq" className="rounded-md px-3 py-2.5 text-[14px] font-medium text-fg-secondary hover:text-fg">{t("landing.nav.faq")}</a>
            </nav>
            <ThemeSwitch />
            <LocaleSwitch />
            {me ? <AccountMenu name={me.name} email={me.email} /> : <a href={href} className={buttonClass("secondary", "lg")}>{t("landing.signInShort")}</a>}
          </div>
        </div>
      </LandingHeader>
      <main>
        <div className="mx-auto grid max-w-content grid-cols-[repeat(auto-fit,minmax(min(480px,100%),1fr))] items-center gap-16 px-[clamp(16px,4vw,40px)] pb-24 pt-18">
          <div className="flex max-w-[540px] flex-col gap-7">
            <Reveal><p className="label text-primary">{t("landing.eyebrow")}</p></Reveal>
            <Reveal delay={0.08}><h1 className="font-display text-[clamp(40px,5vw,60px)] leading-[1.08] tracking-[-0.03em]">{t("landing.title")}</h1></Reveal>
            <Reveal delay={0.16}><p className="text-body-lg text-fg-secondary">{t("landing.subtitle")}</p></Reveal>
            <Reveal delay={0.24} className="flex flex-col items-start gap-3">
              {signIn}
              {!me && <p className="text-small text-fg-muted">{t("landing.note")}</p>}
            </Reveal>
          </div>
          <HeroPreview />
        </div>
        <section id="how" aria-labelledby="how-title" className="scroll-mt-16 border-t border-border bg-surface">
          <div className="mx-auto flex max-w-content flex-col gap-12 px-[clamp(16px,4vw,40px)] py-24">
            <h2 id="how-title" className="max-w-[640px] font-display text-[clamp(30px,3vw,40px)] font-bold leading-[1.2] tracking-[-0.02em]">
              {t("landing.how.title")}
            </h2>
            <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-10">
              {(["1", "2", "3"] as const).map((n) => (
                <Reveal as="li" key={n} delay={Number(n) * 0.1} className="relative flex flex-col gap-2 border-t-2 border-border pt-6">
                  <RuleFill delay={0.2 + Number(n) * 0.2} />
                  <span className="font-mono text-[14px] font-medium tabular-nums text-fg-muted">0{n}</span>
                  <h3 className="font-display text-h3">{t(`landing.how.steps.${n}.title`)}</h3>
                  <p className="text-[15px] leading-6 text-fg-secondary">{t(`landing.how.steps.${n}.text`)}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
        <LandingModules />
        <LiveShowcase />
        <Faq />
        <section aria-labelledby="cta-title" className="mx-auto max-w-content px-[clamp(16px,4vw,40px)] pb-24">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(480px,100%),1fr))] overflow-hidden rounded-[20px] border border-border bg-surface">
            <RidgeIllustration />
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
          <nav aria-label={t("landing.footer.label")} className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="#faq" className="hover:text-fg">{t("landing.footer.faq")}</a>
            <a href={`${REPO}/issues`} target="_blank" rel="noreferrer" className="hover:text-fg">{t("landing.footer.feedback")}</a>
            <a href={REPO} target="_blank" rel="noreferrer" className="hover:text-fg">GitHub</a>
          </nav>
          <LocaleSwitch />
        </div>
      </footer>
    </LandingMotion>
  );
}
