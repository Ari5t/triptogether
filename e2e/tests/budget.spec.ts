import { expect, test, type APIRequestContext, type BrowserContext } from "@playwright/test";

const run = Date.now();

// Intl puts non-breaking spaces in amounts, so match any whitespace.
const money = (text: string) => new RegExp(text.replace(/[+\u2212.]/g, "\\$&").replace(/ /g, "\\s"));

async function signIn(ctx: BrowserContext, name: string) {
  const res = await ctx.request.post("/api/v1/auth/e2e-login", { data: { email: `${name}-${run}-b@e2e.test`, name } });
  expect(res.status()).toBe(204);
}

/** Owner creates a trip and invites `friend` with `role` through the API; returns ids. */
async function tripWithFriend(owner: BrowserContext, friend: BrowserContext, role: "EDITOR" | "VIEWER") {
  const trip = await (await owner.request.post("/api/v1/trips", { data: { title: `Бюджет ${role} ${run}`, startDate: "2026-07-14", endDate: "2026-07-16" } })).json();
  const invite = await (await owner.request.post(`/api/v1/trips/${trip.id}/invites`, { data: { role } })).json();
  const accepted = await friend.request.post(`/api/v1/invites/${invite.token}/accept`);
  expect(accepted.ok()).toBe(true);
  return trip.id as string;
}

const members = async (req: APIRequestContext, tripId: string) => (await (await req.get(`/api/v1/trips/${tripId}`)).json()).members as { userId: string; name: string }[];

test("equal split: totals, balances and who-pays-whom update", async ({ browser }) => {
  const owner = await browser.newContext({ locale: "uk-UA" });
  const friend = await browser.newContext({ locale: "uk-UA" });
  await signIn(owner, "Owner");
  await signIn(friend, "Friend");
  const tripId = await tripWithFriend(owner, friend, "EDITOR");
  const page = await owner.newPage();

  await page.goto(`/uk/trips/${tripId}`);
  await page.getByRole("navigation", { name: "Розділи поїздки" }).getByRole("link", { name: "Бюджет" }).click();
  await expect(page.getByText("Витрат поки немає")).toBeVisible();

  await page.getByRole("button", { name: "Додати витрату" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Назва").fill("Садиба");
  await dialog.getByLabel(/Сума/).fill("3000,50");
  await dialog.getByRole("button", { name: "Додати витрату" }).click();

  await expect(page.getByRole("cell", { name: /^Садиба/ })).toBeVisible();
  // 3000,50 split in two: 1500,25 each; owner paid, so the friend owes 1500,25.
  await expect(page.getByText(money("3 000,50 ₴")).first()).toBeVisible();
  await expect(page.getByText(money("+1 500,25 ₴"))).toBeVisible();
  await expect(page.getByText(money("−1 500,25 ₴"))).toBeVisible();
  await expect(page.getByText("Friend → Owner")).toBeVisible();
});

test("exact split must add up; save stays disabled until it does", async ({ browser }) => {
  const owner = await browser.newContext({ locale: "uk-UA" });
  const friend = await browser.newContext({ locale: "uk-UA" });
  await signIn(owner, "Owner2");
  await signIn(friend, "Friend2");
  const tripId = await tripWithFriend(owner, friend, "EDITOR");
  const page = await owner.newPage();
  await page.goto(`/uk/trips/${tripId}/budget`);

  await page.getByRole("button", { name: "Додати витрату" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Назва").fill("Вечеря");
  await dialog.getByLabel(/Сума/).fill("1000");
  await dialog.getByRole("button", { name: "За частками" }).click();
  await dialog.getByRole("textbox", { name: "Owner2" }).fill("700");
  const save = dialog.getByRole("button", { name: "Додати витрату" });
  await expect(save).toBeDisabled();
  await expect(dialog.getByRole("status")).toContainText("300");
  await dialog.getByRole("textbox", { name: "Friend2" }).fill("300");
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByRole("cell", { name: /^Вечеря/ })).toBeVisible();
  await expect(page.getByText(money("+300 ₴"))).toBeVisible();
});

test("viewers can read the budget but not write", async ({ browser }) => {
  const owner = await browser.newContext({ locale: "uk-UA" });
  const viewer = await browser.newContext({ locale: "uk-UA" });
  await signIn(owner, "Owner3");
  await signIn(viewer, "Viewer3");
  const tripId = await tripWithFriend(owner, viewer, "VIEWER");

  const page = await viewer.newPage();
  await page.goto(`/uk/trips/${tripId}/budget`);
  await expect(page.getByText("Витрат поки немає")).toBeVisible();
  await expect(page.getByRole("button", { name: "Додати витрату" })).toHaveCount(0);

  const ms = await members(viewer.request, tripId);
  const res = await viewer.request.post(`/api/v1/trips/${tripId}/expenses`, {
    data: { title: "x", amountMinor: 100, category: "FOOD", paidById: ms[0]!.userId, spentAt: "2026-07-14", splitType: "EQUAL", participants: [ms[0]!.userId] },
  });
  expect(res.status()).toBe(403);
  expect((await viewer.request.get(`/api/v1/trips/${tripId}/balances`)).status()).toBe(200);
});

test("expense in another currency is converted with a manual rate", async ({ browser }) => {
  const owner = await browser.newContext({ locale: "uk-UA" });
  const friend = await browser.newContext({ locale: "uk-UA" });
  await signIn(owner, "Owner4");
  await signIn(friend, "Friend4");
  const tripId = await tripWithFriend(owner, friend, "EDITOR");
  const page = await owner.newPage();
  await page.goto(`/uk/trips/${tripId}/budget`);

  await page.getByRole("button", { name: "Додати витрату" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Назва").fill("Квитки");
  await dialog.getByLabel(/Сума/).fill("35");
  await dialog.getByLabel("Валюта").selectOption("EUR");
  // Typing wins over the suggested rate, even if the rates API answers later.
  await dialog.getByLabel(/Курс/).fill("50,2551");
  await expect(dialog.getByText(money("≈ 1 758,93 ₴ · курс вручну"))).toBeVisible();
  await dialog.getByRole("button", { name: "Додати витрату" }).click();

  await expect(page.getByRole("cell", { name: /^Квитки/ })).toBeVisible();
  await expect(page.getByText(money("1 758,93 ₴")).first()).toBeVisible();
  // Under the converted amount: only the original; the rate is in the tooltip.
  const original = page.getByText(money("35 €"), { exact: true }).locator("visible=true").first();
  await expect(page.getByRole("tooltip")).toBeHidden();
  await original.hover();
  await expect(page.getByRole("tooltip")).toHaveText(money("Сплачено 35 €. Переведено за курсом, введеним вручну: 1 € = 50,26 ₴."));
  // Manual rates are never refreshed, so the owner sees no bulk refresh button.
  await expect(page.getByRole("button", { name: "Оновити всі курси" })).toHaveCount(0);

  // Bulk refresh is for the owner only.
  expect((await friend.request.post(`/api/v1/trips/${tripId}/expenses/refresh-rates`)).status()).toBe(403);

  // Row actions: edit opens the dialog, delete asks first.
  await page.getByRole("button", { name: "Редагувати «Квитки»" }).click();
  await expect(page.getByRole("dialog").getByLabel(/Курс/)).toHaveValue("50,2551");
  await page.getByRole("dialog").getByRole("button", { name: "Скасувати" }).click();
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Видалити «Квитки»" }).click();
  await expect(page.getByText("Витрат поки немає")).toBeVisible();
});

test("phone: expenses are cards, the rate opens on tap, the dialog is a bottom sheet", async ({ browser }) => {
  const owner = await browser.newContext({ locale: "uk-UA", viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  await signIn(owner, "Owner5");
  const trip = await (await owner.request.post("/api/v1/trips", { data: { title: `Телефон ${run}`, startDate: "2026-07-14", endDate: "2026-07-16", currency: "EUR" } })).json();
  const me = (await members(owner.request, trip.id))[0]!.userId;
  const res = await owner.request.post(`/api/v1/trips/${trip.id}/expenses`, {
    data: { title: "Дім", amountMinor: 123400, category: "LODGING", paidById: me, spentAt: "2026-07-14", splitType: "EQUAL", participants: [me], currency: "UAH", rate: "0.0199865", rateDate: "2026-07-14" },
  });
  expect(res.ok()).toBe(true);
  const page = await owner.newPage();
  await page.goto(`/uk/trips/${trip.id}/budget`);
  await expect(page.getByRole("cell", { name: /^Дім/ })).toBeVisible();

  // No sideways scroll.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await expect(page.getByRole("button", { name: "Редагувати «Дім»" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Видалити «Дім»" })).toBeVisible();

  // A tap opens the tooltip, fully inside the screen.
  await page.getByText(money("1 234 ₴"), { exact: true }).locator("visible=true").first().tap();
  const tip = page.getByRole("tooltip");
  await expect(tip).toBeVisible();
  const box = (await tip.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);

  // The dialog docks to the bottom and Save stays on screen.
  await page.getByRole("button", { name: "Додати витрату" }).first().tap();
  const dialog = page.getByRole("dialog");
  const sheet = (await dialog.boundingBox())!;
  expect(Math.round(sheet.y + sheet.height)).toBe(812);
  await expect(dialog.getByRole("button", { name: "Додати витрату" })).toBeInViewport();
});
