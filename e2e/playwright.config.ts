import { defineConfig } from "@playwright/test";

const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://triptogether:triptogether@localhost:5432/triptogether_e2e";
const API_PORT = 4100;
const WEB_PORT = 3100;
const COLLAB_PORT = 4300;
const COLLAB_INTERNAL_SECRET = "e2e-internal-secret-0123456789";
const COLLAB_JWT_SECRET = "e2e-collab-secret-0123456789";
const WEB = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: "tests",
  globalSetup: "./global-setup.ts",
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: WEB, trace: "retain-on-failure" },
  webServer: [
    {
      command: "pnpm --filter @triptogether/collab start",
      port: COLLAB_PORT,
      reuseExistingServer: false,
      env: { DATABASE_URL, COLLAB_PORT: String(COLLAB_PORT), COLLAB_JWT_SECRET, COLLAB_INTERNAL_SECRET },
    },
    {
      command: "pnpm --filter @triptogether/api start",
      url: `http://localhost:${API_PORT}/api/v1/me`,
      // /me answers 401 once the API is up, which counts as ready.
      ignoreHTTPSErrors: true,
      reuseExistingServer: false,
      env: {
        E2E: "true",
        NODE_ENV: "test",
        DATABASE_URL,
        API_PORT: String(API_PORT),
        WEB_ORIGIN: WEB,
        JWT_ACCESS_SECRET: "e2e-access-secret-0123456789",
        JWT_REFRESH_SECRET: "e2e-refresh-secret-0123456789",
        COLLAB_JWT_SECRET,
        COLLAB_INTERNAL_SECRET,
        COLLAB_INTERNAL_URL: `http://localhost:${COLLAB_PORT}`,
        GOOGLE_CALLBACK_URL: `http://localhost:${API_PORT}/api/v1/auth/google/callback`,
      },
    },
    {
      // rewrites() is evaluated at build time, so API_URL must be set for the build too.
      command: `pnpm --filter @triptogether/web build && pnpm --filter @triptogether/web exec next start --port ${WEB_PORT}`,
      url: `${WEB}/uk`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { API_URL: `http://localhost:${API_PORT}`, NEXT_PUBLIC_COLLAB_URL: `ws://localhost:${COLLAB_PORT}`, NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}` },
    },
  ],
});
