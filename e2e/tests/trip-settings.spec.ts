import { expect, test, type BrowserContext } from "@playwright/test";

const run = Date.now();

async function signIn(ctx: BrowserContext, name: string) {
  const res = await ctx.request.post("/api/v1/auth/e2e-login", { data: { email: `${name}-${run}-s@e2e.test`, name } });
  expect(res.status()).toBe(204);
}

test("owner renames the trip, shifts the dates with the plan, then deletes it", async ({ browser }) => {
  const owner = await browser.newContext({ locale: "uk-UA" });
  const friend = await browser.newContext({ locale: "uk-UA" });
  await signIn(owner, "SettingsOwner");
  await signIn(friend, "SettingsFriend");
  const trip = await (await owner.request.post("/api/v1/trips", { data: { title: `Налаштування ${run}`, startDate: "2026-07-14", endDate: "2026-07-16" } })).json();
  const invite = await (await owner.request.post(`/api/v1/trips/${trip.id}/invites`, { data: { role: "EDITOR" } })).json();
  expect((await friend.request.post(`/api/v1/invites/${invite.token}/accept`)).ok()).toBe(true);

  // Non-owners cannot edit or delete.
  expect((await friend.request.patch(`/api/v1/trips/${trip.id}`, { data: { title: "x" } })).status()).toBe(403);
  expect((await friend.request.delete(`/api/v1/trips/${trip.id}`)).status()).toBe(403);

  const page = await owner.newPage();
  await page.goto(`/uk/trips/${trip.id}/settings`);
  await page.getByLabel("Назва").fill(`Нова назва ${run}`);
  await page.getByRole("button", { name: "Зберегти зміни" }).click();
  await expect(page.getByRole("status").filter({ hasText: "оновлено" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Нова назва ${run}`);

  // Dates shift without stops: no question, API accepts the new range.
  await page.getByLabel("Початок").fill("2026-08-01");
  await page.getByLabel("Кінець").fill("2026-08-03");
  await page.getByRole("button", { name: "Зберегти зміни" }).click();
  await expect
    .poll(async () => {
      const after = await (await owner.request.get(`/api/v1/trips/${trip.id}`)).json();
      return [after.startDate, after.endDate];
    })
    .toEqual(["2026-08-01", "2026-08-03"]);

  // Delete needs the typed title.
  await page.getByRole("button", { name: "Видалити поїздку" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Видалити поїздку" });
  await expect(confirm).toBeDisabled();
  await dialog.getByRole("textbox").fill(`Нова назва ${run}`);
  await confirm.click();
  await expect(page).toHaveURL(/\/uk\/trips$/);

  // Gone for everyone, invite dead.
  expect((await owner.request.get(`/api/v1/trips/${trip.id}`)).status()).toBe(404);
  expect((await friend.request.get(`/api/v1/trips/${trip.id}`)).status()).toBe(404);
  const list = await (await friend.request.get("/api/v1/trips")).json();
  expect(list.some((t: { id: string }) => t.id === trip.id)).toBe(false);
});
