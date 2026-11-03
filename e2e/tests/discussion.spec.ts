import { expect, test, type BrowserContext } from "@playwright/test";

const run = Date.now();

async function signIn(ctx: BrowserContext, name: string) {
  const res = await ctx.request.post("/api/v1/auth/e2e-login", { data: { email: `${name}-${run}-d@e2e.test`, name } });
  expect(res.status()).toBe(204);
}

async function tripWithFriend(owner: BrowserContext, friend: BrowserContext, role: "EDITOR" | "VIEWER") {
  const trip = await (await owner.request.post("/api/v1/trips", { data: { title: `Чат ${role} ${run}`, startDate: "2026-07-14", endDate: "2026-07-16" } })).json();
  const invite = await (await owner.request.post(`/api/v1/trips/${trip.id}/invites`, { data: { role } })).json();
  expect((await friend.request.post(`/api/v1/invites/${invite.token}/accept`)).ok()).toBe(true);
  return trip.id as string;
}

test("chat and polls update live for the other member", async ({ browser }) => {
  const owner = await browser.newContext({ locale: "uk-UA" });
  const friend = await browser.newContext({ locale: "uk-UA" });
  await signIn(owner, "Owner");
  await signIn(friend, "Friend");
  const tripId = await tripWithFriend(owner, friend, "EDITOR");
  const a = await owner.newPage();
  const b = await friend.newPage();
  await a.goto(`/uk/trips/${tripId}/discussion`);
  await b.goto(`/uk/trips/${tripId}/discussion`);
  await expect(a.getByText("Повідомлень поки немає")).toBeVisible();

  // Messages arrive without a reload, in both directions.
  await a.getByRole("textbox", { name: "Повідомлення" }).fill("Привіт усім");
  await a.keyboard.press("Enter");
  await expect(a.getByText("Привіт усім")).toBeVisible();
  await expect(b.getByText("Привіт усім")).toBeVisible();
  await b.getByRole("textbox", { name: "Повідомлення" }).fill("Привіт!");
  await b.keyboard.press("Enter");
  await expect(a.getByText("Привіт!", { exact: true })).toBeVisible();

  // A poll created by the owner appears for the friend; the friend's vote updates the owner's counts.
  await a.getByRole("button", { name: "Створити опитування" }).click();
  const dialog = a.getByRole("dialog");
  await dialog.getByLabel("Питання").fill("Де ночуємо?");
  await dialog.getByRole("textbox", { name: "Варіант 1" }).fill("Готель");
  await dialog.getByRole("textbox", { name: "Варіант 2" }).fill("Хостел");
  await dialog.getByRole("button", { name: "Створити" }).click();
  await expect(b.getByRole("heading", { name: "Де ночуємо?" })).toBeVisible();

  await b.getByRole("button", { name: /Хостел/ }).click();
  await expect(b.getByRole("button", { name: /Хостел/ })).toHaveAttribute("aria-pressed", "true");
  await expect(a.getByRole("button", { name: /Хостел/ })).toContainText("1");
  await expect(a.getByText("1 з 2 проголосували")).toBeVisible();

  // Single choice: voting for the other option moves the vote; clicking it again withdraws it.
  await b.getByRole("button", { name: /Готель/ }).click();
  await expect(a.getByRole("button", { name: /Готель/ })).toContainText("1");
  await expect(a.getByRole("button", { name: /Хостел/ })).toContainText("0");
  await b.getByRole("button", { name: /Готель/ }).click();
  await expect(a.getByText("0 з 2 проголосували")).toBeVisible();

  // History survives a reload.
  await a.reload();
  await expect(a.getByText("Привіт усім")).toBeVisible();
  await expect(a.getByRole("heading", { name: "Де ночуємо?" })).toBeVisible();
});

test("budget changes of one member refresh the other's page", async ({ browser }) => {
  const owner = await browser.newContext({ locale: "uk-UA" });
  const friend = await browser.newContext({ locale: "uk-UA" });
  await signIn(owner, "Owner2");
  await signIn(friend, "Friend2");
  const tripId = await tripWithFriend(owner, friend, "EDITOR");
  const b = await friend.newPage();
  await b.goto(`/uk/trips/${tripId}/budget`);
  await expect(b.getByText("Витрат поки немає")).toBeVisible();

  const me = (await (await owner.request.get(`/api/v1/trips/${tripId}`)).json()).currentUserId as string;
  const res = await owner.request.post(`/api/v1/trips/${tripId}/expenses`, {
    data: { title: "Таксі", amountMinor: 50000, category: "TRANSPORT", paidById: me, spentAt: "2026-07-14", splitType: "EQUAL", participants: [me] },
  });
  expect(res.ok()).toBe(true);
  await expect(b.getByRole("cell", { name: "Таксі" })).toBeVisible();
});

test("viewers can chat and comment but not create polls; outsiders get nothing", async ({ browser }) => {
  const owner = await browser.newContext({ locale: "uk-UA" });
  const viewer = await browser.newContext({ locale: "uk-UA" });
  const stranger = await browser.newContext({ locale: "uk-UA" });
  await signIn(owner, "Owner3");
  await signIn(viewer, "Viewer3");
  await signIn(stranger, "Stranger3");
  const tripId = await tripWithFriend(owner, viewer, "VIEWER");

  expect((await viewer.request.post(`/api/v1/trips/${tripId}/messages`, { data: { body: "Я лише дивлюсь" } })).status()).toBe(201);
  expect((await viewer.request.post(`/api/v1/trips/${tripId}/polls`, { data: { question: "q", options: ["a", "b"] } })).status()).toBe(403);
  const page = await viewer.newPage();
  await page.goto(`/uk/trips/${tripId}/discussion`);
  await expect(page.getByText("Я лише дивлюсь")).toBeVisible();
  await expect(page.getByRole("button", { name: "Створити опитування" })).toHaveCount(0);

  // Resolving a thread is an editor action.
  expect((await viewer.request.post(`/api/v1/trips/${tripId}/threads/some-stop/resolve`)).status()).toBe(403);
  expect((await owner.request.post(`/api/v1/trips/${tripId}/threads/some-stop/resolve`)).status()).toBe(204);
  expect((await stranger.request.post(`/api/v1/trips/${tripId}/threads/some-stop/resolve`)).status()).toBe(404);

  expect((await stranger.request.get(`/api/v1/trips/${tripId}/messages`)).status()).toBe(404);
  expect((await stranger.request.post(`/api/v1/trips/${tripId}/messages`, { data: { body: "hi" } })).status()).toBe(404);
  const poll = await (await owner.request.post(`/api/v1/trips/${tripId}/polls`, { data: { question: "q", options: ["a", "b"] } })).json();
  expect((await stranger.request.post(`/api/v1/polls/${poll.id}/vote`, { data: { optionIds: [poll.options[0].id] } })).status()).toBe(404);
});

test("stop comments: thread list counts and a comment thread", async ({ browser }) => {
  const owner = await browser.newContext({ locale: "uk-UA" });
  await signIn(owner, "Owner4");
  const trip = await (await owner.request.post("/api/v1/trips", { data: { title: `Коментарі ${run}`, startDate: "2026-07-14", endDate: "2026-07-15" } })).json();
  const page = await owner.newPage();

  await page.goto(`/uk/trips/${trip.id}`);
  await page.getByRole("button", { name: "Додати до дня 1" }).click();
  await page.getByRole("combobox", { name: "Нова зупинка" }).fill("Сходження на Говерлу");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: "Назва зупинки" })).toHaveCount(1);

  // Stops reach SQL (and so the thread list) about 2 s after the last change.
  await page.waitForTimeout(3500);
  await page.getByRole("link", { name: "Коментарі" }).click();
  await expect(page).toHaveURL(/discussion\?thread=/);
  await expect(page.getByRole("complementary", { name: "Коментарі до зупинки" })).toBeVisible();

  await page.getByRole("textbox", { name: "Відповісти" }).fill("Виходимо о 06:30");
  await page.getByRole("complementary").getByRole("button", { name: "Надіслати" }).click();
  await expect(page.getByRole("complementary").getByText("Виходимо о 06:30")).toBeVisible();
  // The comment is not in the general chat, and the thread count went up.
  await expect(page.getByRole("region", { name: "Загальний чат" }).getByText("Виходимо о 06:30")).toHaveCount(0);
  const nav = page.getByRole("navigation", { name: "Розмови" });
  const thread = nav.getByRole("button", { name: /Сходження на Говерлу/ });
  await expect(thread.locator("span").last()).toHaveText("1");

  // Several more comments (here through the API, as another client would): the count always equals the real number.
  const itemId = new URL(page.url()).searchParams.get("thread")!;
  for (const body of ["Другий", "Третій"]) expect((await owner.request.post(`/api/v1/trips/${trip.id}/messages`, { data: { body, itemId } })).status()).toBe(201);
  await expect(thread.locator("span").last()).toHaveText("3");
  await expect(page.getByRole("complementary").getByText("Третій")).toBeVisible();

  // Switching threads must not count the comment twice (regression: the count was refetched and added to the live increment).
  await nav.getByRole("button", { name: "Загальний чат" }).click();
  await thread.click();
  await expect(thread.locator("span").last()).toHaveText("3");
  await expect(page.getByRole("complementary").locator("li")).toHaveCount(3);

  // Resolve and reopen the thread.
  const aside = page.getByRole("complementary");
  await aside.getByRole("button", { name: "Позначити вирішеним" }).click();
  await expect(aside.getByText("Обговорення позначено як вирішене")).toBeVisible();
  await expect(thread.getByLabel("Вирішено")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("complementary").getByText("Обговорення позначено як вирішене")).toBeVisible();
  await page.getByRole("complementary").getByRole("button", { name: "Відновити обговорення" }).click();
  await expect(page.getByRole("complementary").getByText("Обговорення позначено як вирішене")).toHaveCount(0);
  await expect(page.getByRole("complementary").getByRole("button", { name: "Позначити вирішеним" })).toBeVisible();
});

test("long threads scroll inside their column, not the page", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "uk-UA", viewport: { width: 1280, height: 720 } });
  await signIn(ctx, "Owner5");
  const trip = await (await ctx.request.post("/api/v1/trips", { data: { title: `Скрол ${run}`, startDate: "2026-07-14", endDate: "2026-07-15" } })).json();
  for (let i = 1; i <= 40; i++) expect((await ctx.request.post(`/api/v1/trips/${trip.id}/messages`, { data: { body: `Повідомлення ${i}` } })).status()).toBe(201);

  const page = await ctx.newPage();
  await page.goto(`/uk/trips/${trip.id}/discussion`);
  await expect(page.getByText("Повідомлення 40")).toBeVisible();
  const heights = await page.evaluate(() => ({ doc: document.documentElement.scrollHeight, view: window.innerHeight }));
  expect(heights.doc).toBeLessThanOrEqual(heights.view);
  // The newest message is in view at the bottom and the composer is still on screen.
  await expect(page.getByRole("textbox", { name: "Повідомлення" })).toBeInViewport();
  await expect(page.getByText("Повідомлення 40")).toBeInViewport();
});

test("a long itinerary scrolls inside the list, not the page", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "uk-UA", viewport: { width: 1280, height: 720 } });
  await signIn(ctx, "Owner6");
  const trip = await (await ctx.request.post("/api/v1/trips", { data: { title: `Довгий ${run}`, startDate: "2026-07-14", endDate: "2026-07-18" } })).json();
  const page = await ctx.newPage();
  await page.goto(`/uk/trips/${trip.id}`);
  await page.getByRole("button", { name: "Додати до дня 1" }).click();
  for (let i = 1; i <= 12; i++) {
    await page.getByRole("combobox", { name: "Нова зупинка" }).fill(`Зупинка ${i}`);
    await page.keyboard.press("Enter");
  }
  await expect.poll(async () => (await page.getByRole("textbox", { name: "Назва зупинки" }).count())).toBe(12);
  const heights = await page.evaluate(() => ({ doc: document.documentElement.scrollHeight, view: window.innerHeight }));
  expect(heights.doc).toBeLessThanOrEqual(heights.view);
  await expect(page.getByRole("region", { name: "Карта" })).toBeInViewport();
});
