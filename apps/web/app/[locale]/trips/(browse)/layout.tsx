import { Route } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { LocaleSwitch } from "@/components/locale-switch";
import { ThemeSwitch } from "@/components/theme-switch";
import { Link } from "@/i18n/navigation";
import { ApiRequestError, apiGet } from "@/lib/api";

export default async function BrowseLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  let me: { name: string };
  try {
    me = await apiGet<{ name: string }>("/me");
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 401) redirect(`/${locale}`);
    throw e;
  }
  return (
    <>
      <header className="flex h-[60px] items-center justify-between border-b bg-surface px-[clamp(16px,4vw,40px)]">
        <Link href="/trips" className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Route size={16} strokeWidth={1.75} aria-hidden />
          </span>
          <span className="font-display text-[16px] font-bold">{t("brand")}</span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <ThemeSwitch />
          <LocaleSwitch />
          <Avatar name={me.name} color="var(--p-blue)" size={36} />
        </div>
      </header>
      {children}
    </>
  );
}
