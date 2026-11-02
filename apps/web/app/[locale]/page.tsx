import { ArrowRight, Route } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ApiRequestError, apiGet } from "@/lib/api";
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

  return (
    <main className="mx-auto flex max-w-content flex-col gap-7 px-[clamp(16px,4vw,40px)] pb-24 pt-18">
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
          <a href={href} className="inline-flex h-13 items-center gap-2 rounded-md bg-primary px-6 text-[16px] font-semibold text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed">
            {t("landing.signIn")}
            <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
          </a>
          <p className="text-small text-fg-muted">{t("landing.note")}</p>
        </div>
      </div>
    </main>
  );
}
