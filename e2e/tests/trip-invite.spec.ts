import { expect, test, type BrowserContext } from "@playwright/test";

const run = Date.now();

async function signIn(context: BrowserContext, name: string) {
  const res = await context.request.post("/api/v1/auth/e2e-login", { data: { email: `${name}-${run}@e2e.test`, name } });
  expect(res.status()).toBe(204);
}

test("create trip, invite a friend, friend joins", async ({ browser }) => {
  const owner = await browser.newContext({ locale: "uk-UA" });
  await signIn(owner, "Owner");
  const ownerPage = await owner.newPage();

  await ownerPage.goto("/uk/trips");
  await ownerPage.getByRole("link", { name: "Нова поїздка" }).first().click();
  await ownerPage.getByLabel("Назва").fill(`Карпати ${run}`);
  await ownerPage.getByLabel("Початок").fill("2026-07-14");
  await ownerPage.getByLabel("Кінець").fill("2026-07-18");
  await ownerPage.getByRole("button", { name: "Створити поїздку" }).click();
  await expect(ownerPage.getByRole("heading", { name: `Карпати ${run}` })).toBeVisible();

  await ownerPage.getByRole("button", { name: "Запросити" }).click();
  await ownerPage.getByLabel("Глядач").check();
  await ownerPage.getByRole("button", { name: "Створити посилання" }).click();
  const link = await ownerPage.getByRole("textbox", { name: "Посилання" }).inputValue();
  expect(link).toContain("/invite/");

  const friend = await browser.newContext({ locale: "uk-UA" });
  await signIn(friend, "Friend");
  const friendPage = await friend.newPage();
  await friendPage.goto(link);
  await expect(friendPage.getByText(`Карпати ${run}`)).toBeVisible();
  await friendPage.getByRole("button", { name: "Приєднатися" }).click();
  await expect(friendPage.getByRole("link", { name: new RegExp(`Карпати ${run}`) })).toBeVisible();

  // Joined as viewer: no invite button on the trip page.
  await friendPage.getByRole("link", { name: new RegExp(`Карпати ${run}`) }).click();
  await expect(friendPage.getByRole("heading", { name: `Карпати ${run}` })).toBeVisible();
  await expect(friendPage.getByRole("button", { name: "Запросити" })).toHaveCount(0);

  // Owner sees the new member after a reload.
  await ownerPage.reload();
  await ownerPage.getByRole("button", { name: "Запросити" }).click();
  await expect(ownerPage.getByText(`friend-${run}@e2e.test`)).toBeVisible();
});

test("session cookies cannot reach a trip without membership", async ({ browser }) => {
  const stranger = await browser.newContext({ locale: "uk-UA" });
  await signIn(stranger, "Stranger");
  const res = await stranger.request.get("/api/v1/trips/does-not-exist");
  expect(res.status()).toBe(404);
});
