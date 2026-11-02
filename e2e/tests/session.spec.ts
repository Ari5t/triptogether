import { expect, test } from "@playwright/test";

const run = Date.now();

test("landing skips Google when signed in, and refreshes an expired access token", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "uk-UA" });
  const res = await ctx.request.post("/api/v1/auth/e2e-login", { data: { email: `session-${run}@e2e.test`, name: "Session" } });
  expect(res.status()).toBe(204);
  const page = await ctx.newPage();

  await page.goto("/uk");
  await expect(page).toHaveURL(/\/uk\/trips$/);

  // Access token expires (cookie gone); the refresh cookie is still valid.
  await ctx.clearCookies({ name: "tt_access" });
  await page.goto("/uk");
  await expect(page).toHaveURL(/\/uk\/trips$/);
  await expect(page.getByRole("heading", { name: "Мої поїздки" })).toBeVisible();

  // Fully signed out: the landing page stays, with the sign-in button.
  await ctx.clearCookies();
  await page.goto("/uk");
  await expect(page.getByRole("link", { name: /Увійти з Google/ })).toBeVisible();
});
