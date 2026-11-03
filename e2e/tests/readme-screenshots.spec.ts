import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";

// Regenerates docs/screenshots/*.png from the demo seed:  pnpm --filter @triptogether/e2e screenshots
test.skip(!process.env.SCREENSHOTS, "set SCREENSHOTS=1 (pnpm --filter @triptogether/e2e screenshots)");
test.setTimeout(120_000);

const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://triptogether:triptogether@localhost:5432/triptogether_e2e";
const OUT = "../docs/screenshots";
const EMAIL = "demo-owner@e2e.test";

test("README screenshots", async ({ browser }) => {
  const desktop = await browser.newContext({ locale: "uk-UA", colorScheme: "light", viewport: { width: 1440, height: 900 } });
  expect((await desktop.request.post("/api/v1/auth/e2e-login", { data: { email: EMAIL, name: "Оксана Мельник" } })).status()).toBe(204);
  // The signed-in test user becomes the owner of the demo trip.
  execSync("pnpm --filter @triptogether/db exec tsx prisma/seed.ts --reset", { stdio: "inherit", env: { ...process.env, DATABASE_URL, SEED_OWNER_EMAIL: EMAIL } });

  const trips = (await (await desktop.request.get("/api/v1/trips")).json()) as { id: string; title: string }[];
  const tripId = trips.find((t) => t.title === "Карпати + Львів")!.id;
  const threads = (await (await desktop.request.get(`/api/v1/trips/${tripId}/threads`)).json()) as { id: string; title: string }[];
  const hoverla = threads.find((t) => t.title.startsWith("Сходження"))!.id;

  const page = await desktop.newPage();
  await page.goto("/uk/trips");
  await expect(page.getByRole("heading", { name: "Мої поїздки" })).toBeVisible();
  await page.screenshot({ path: `${OUT}/trips.png` });

  await page.goto(`/uk/trips/${tripId}`);
  await expect(page.getByTestId("map-pin").first()).toBeVisible();
  await page.waitForTimeout(3500); // map tiles
  await page.screenshot({ path: `${OUT}/itinerary.png` });

  await page.goto(`/uk/trips/${tripId}/budget`);
  await expect(page.getByRole("cell", { name: /Чани/ })).toBeVisible();
  await page.screenshot({ path: `${OUT}/budget.png` });

  await page.goto(`/uk/trips/${tripId}/discussion?thread=${hoverla}`);
  await expect(page.getByText("Добре, ставимо вихід")).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/discussion.png` });

  const mobile = await browser.newContext({ locale: "uk-UA", colorScheme: "light", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await mobile.request.post("/api/v1/auth/e2e-login", { data: { email: EMAIL, name: "Оксана Мельник" } });
  const m = await mobile.newPage();
  await m.goto(`/uk/trips/${tripId}`);
  await expect(m.getByRole("heading", { name: "День 2" })).toBeVisible();
  await m.screenshot({ path: `${OUT}/mobile-itinerary.png` });
  await m.getByRole("navigation", { name: "Розділи поїздки" }).getByRole("link", { name: "Карта" }).click();
  await expect(m.getByTestId("map-pin").first()).toBeVisible();
  await m.getByTestId("map-pin").nth(6).dispatchEvent("click");
  await m.waitForTimeout(3500);
  await m.screenshot({ path: `${OUT}/mobile-map.png` });
});
