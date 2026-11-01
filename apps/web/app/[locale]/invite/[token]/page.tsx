import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { ApiRequestError, apiGet } from "@/lib/api";
import { formatRange } from "@/lib/format";
import { AcceptButton } from "./accept-button";

interface Preview {
  tripId: string;
  title: string;
  destination: string | null;
  startDate: string;
  endDate: string;
  role: "EDITOR" | "VIEWER";
  invitedBy: string | null;
  alreadyMember: boolean;
}

export default async function InvitePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  let preview: Preview;
  try {
    preview = await apiGet<Preview>(`/invites/${encodeURIComponent(token)}`);
  } catch (e) {
    if (e instanceof ApiRequestError) {
      if (e.status === 401) redirect(`/${locale}?next=${encodeURIComponent(`/${locale}/invite/${token}`)}`);
      return (
        <main className="mx-auto max-w-[560px] px-4 pt-18">
          <p role="alert" className="rounded-lg bg-error-subtle p-4 text-body font-medium text-error-ink">
            {t(`errors.${e.code}`)}
          </p>
        </main>
      );
    }
    throw e;
  }
  return (
    <main className="mx-auto flex max-w-[560px] flex-col gap-5 px-4 pt-18">
      <h1 className="text-h3">{t("invite.title")}</h1>
      <section className="flex flex-col gap-2 rounded-xl border bg-surface p-6">
        <h2 className="text-h4">{preview.title}</h2>
        {preview.destination && <p className="text-small text-fg-secondary">{preview.destination}</p>}
        <p className="text-small tabular-nums text-fg-secondary">{formatRange(locale, preview.startDate, preview.endDate)}</p>
        {preview.invitedBy && <p className="text-small text-fg-muted">{t("invite.invitedBy", { name: preview.invitedBy })}</p>}
        <p className="text-small text-fg-muted">
          {t("invite.role")}: {t(`trips.role.${preview.role}`)}
        </p>
      </section>
      <AcceptButton token={token} locale={locale} tripId={preview.tripId} alreadyMember={preview.alreadyMember} />
    </main>
  );
}
