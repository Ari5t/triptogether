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

  await expect(page.getByRole("cell", { name: "Садиба" })).toBeVisible();
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
  await expect(page.getByRole("cell", { name: "Вечеря" })).toBeVisible();
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
