import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const run = Date.now();

async function signIn(context: BrowserContext, name: string) {
  const res = await context.request.post("/api/v1/auth/e2e-login", { data: { email: `${name}-${run}-i@e2e.test`, name } });
  expect(res.status()).toBe(204);
}

const titles = (page: Page) => page.getByRole("textbox", { name: "Назва зупинки" }).evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));

async function createTrip(page: Page, title: string) {
  await page.goto("/uk/trips/new");
  await page.getByLabel("Назва").fill(title);
  await page.getByLabel("Початок").fill("2026-07-14");
  await page.getByLabel("Кінець").fill("2026-07-16");
  await page.getByRole("button", { name: "Створити поїздку" }).click();
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
}

test("days come from trip dates; stops sync live between members and survive reload", async ({ browser }) => {
  const title = `Маршрут ${run}`;
  const owner = await browser.newContext({ locale: "uk-UA" });
  await signIn(owner, "Owner");
  const ownerPage = await owner.newPage();
  await createTrip(ownerPage, title);

  await expect(ownerPage.getByRole("heading", { name: /^День \d$/ })).toHaveCount(3);
  await ownerPage.getByRole("button", { name: "Додати до дня 1" }).click();
  await ownerPage.getByLabel("Нова зупинка").fill("Сходження на Говерлу");
  await ownerPage.keyboard.press("Enter");
  await expect.poll(() => titles(ownerPage)).toEqual(["Сходження на Говерлу"]);

  // Invite an editor and watch the stop arrive on their screen.
  await ownerPage.getByRole("button", { name: "Запросити" }).click();
  await ownerPage.getByRole("button", { name: "Створити посилання" }).click();
  const link = await ownerPage.getByRole("textbox", { name: "Посилання" }).inputValue();
  await ownerPage.getByRole("dialog").getByRole("button", { name: "Готово" }).click();

  const friend = await browser.newContext({ locale: "uk-UA" });
  await signIn(friend, "Friend");
  const friendPage = await friend.newPage();
  await friendPage.goto(link);
  await friendPage.getByRole("button", { name: "Приєднатися" }).click();
  await friendPage.getByRole("link", { name: new RegExp(title) }).click();
  await expect.poll(() => titles(friendPage)).toEqual(["Сходження на Говерлу"]);

  // Live edit from the friend appears for the owner without reload.
  await friendPage.getByRole("button", { name: "Додати до дня 2" }).click();
  await friendPage.getByLabel("Нова зупинка").fill("Озеро Молодості");
  await friendPage.keyboard.press("Enter");
  await expect.poll(() => titles(ownerPage)).toEqual(["Сходження на Говерлу", "Озеро Молодості"]);

  // Drag the friend's stop into day 1 with the keyboard (Space to lift, arrows to move, Space to drop).
  const grip = ownerPage.getByRole("button", { name: "Перетягнути зупинку" }).nth(1);
  await grip.focus();
  // dnd-kit attaches its keyboard listeners asynchronously, so give each key a beat.
  for (const key of ["Space", "ArrowUp", "Space"]) {
    await ownerPage.keyboard.press(key);
    await ownerPage.waitForTimeout(150);
  }
  await expect(ownerPage.getByText("вт, 14 липня · 2 зупинки")).toBeVisible();

  // Snapshot is written ~2 s after the last change; a reload must show the same state from the server.
  await ownerPage.waitForTimeout(3500);
  await ownerPage.reload();
  await expect(ownerPage.getByText("вт, 14 липня · 2 зупинки")).toBeVisible();
  await expect.poll(async () => (await titles(ownerPage)).length).toBe(2);
});

test("changing trip dates adds days", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "uk-UA" });
  await signIn(ctx, "Dates");
  const page = await ctx.newPage();
  await createTrip(page, `Дати ${run}`);
  await expect(page.getByRole("heading", { name: /^День \d$/ })).toHaveCount(3);
  const id = page.url().split("/").pop()!;
  const res = await ctx.request.patch(`/api/v1/trips/${id}`, { data: { endDate: "2026-07-18" } });
  expect(res.ok()).toBe(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: /^День \d$/ })).toHaveCount(5);
});
