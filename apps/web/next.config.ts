import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const config: NextConfig = {
  // Dev/preview: cookies are first-party only if /api goes through Next (SPEC §9 risks).
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${process.env.API_URL ?? "http://localhost:4000"}/api/v1/:path*` }];
  },
};

export default createNextIntlPlugin("./i18n/request.ts")(config);
