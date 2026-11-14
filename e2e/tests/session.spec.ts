import { expect, test } from "@playwright/test";

const run = Date.now();

test("landing stays for signed-in users, refreshes an expired access token, honours ?next=", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "uk-UA" });
  const res = await ctx.request.post("/api/v1/auth/e2e-login", { data: { email: `session-${run}@e2e.test`, name: "Session" } });
  expect(res.status()).toBe(204);
  const page = await ctx.newPage();

  await page.goto("/uk");
  await expect(page).toHaveURL(/\/uk$/);
  await expect(page.getByRole("button", { name: "Меню акаунта" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Мої поїздки" }).first()).toBeVisible();

  // Access token expires (cookie gone); the refresh cookie is still valid: the client refreshes and the menu appears.
  await ctx.clearCookies({ name: "tt_access" });
  await page.goto("/uk");
  await expect(page.getByRole("button", { name: "Меню акаунта" })).toBeVisible();

  // An explicit in-site target is still followed.
  await page.goto("/uk?next=/uk/trips");
  await expect(page).toHaveURL(/\/uk\/trips$/);
  await expect(page.getByRole("heading", { name: "Мої поїздки" })).toBeVisible();

  // Fully signed out: the landing page stays, with the sign-in button.
  await ctx.clearCookies();
  await page.goto("/uk");
  await expect(page.getByRole("link", { name: /Увійти з Google/ }).first()).toBeVisible();
});

test("avatar menu shows the user and signs out", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "uk-UA" });
  const email = `menu-${run}@e2e.test`;
  expect((await ctx.request.post("/api/v1/auth/e2e-login", { data: { email, name: "Menu Tester" } })).status()).toBe(204);
  const page = await ctx.newPage();

  await page.goto("/uk/trips");
  await page.getByRole("button", { name: "Меню акаунта" }).click();
  const menu = page.locator("#account-menu");
  await expect(menu.locator("p", { hasText: "Menu Tester" })).toBeVisible();
  await expect(menu.getByText(email)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();

  await page.getByRole("button", { name: "Меню акаунта" }).click();
  await page.getByRole("button", { name: "Вийти" }).click();
  await expect(page).toHaveURL(/\/uk$/);
  await expect(page.getByRole("link", { name: /Увійти з Google/ }).first()).toBeVisible(); // no bounce back to /trips
});

test("avatar menu on the landing signs out", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "uk-UA" });
  expect((await ctx.request.post("/api/v1/auth/e2e-login", { data: { email: `land-${run}@e2e.test`, name: "Landing Tester" } })).status()).toBe(204);
  const page = await ctx.newPage();
  await page.goto("/uk");
  await page.getByRole("button", { name: "Меню акаунта" }).click();
  await expect(page.locator("#account-menu")).toBeVisible();
  await page.getByRole("button", { name: "Вийти" }).click();
  await expect(page.getByRole("link", { name: /Увійти з Google/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Меню акаунта" })).toHaveCount(0);
});
