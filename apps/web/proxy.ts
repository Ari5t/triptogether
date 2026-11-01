import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);
const PROTECTED = /^\/(uk|en)\/(trips|invite)(\/|$)/;

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Presence check only; the API validates the JWT. Redirect to sign-in keeping the target.
  if (PROTECTED.test(pathname) && !req.cookies.has("tt_access") && !req.cookies.has("tt_refresh")) {
    const locale = pathname.split("/")[1];
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}`;
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return intl(req);
}

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
