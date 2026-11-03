import { expect, test } from "@playwright/test";

const run = Date.now();

// Geoapify is not reachable in tests: the browser-side search call is answered locally.
const PLACES = [
  { id: "fake-hoverla", name: "Говерла", address: "Яремче", lat: 48.1601, lng: 24.5003, category: "natural.mountain" },
  { id: "fake-lviv", name: "Площа Ринок", address: "Львів", lat: 49.8419, lng: 24.0315, category: "tourism.attraction" },
];

test("places become pins, selection syncs with the list, legend filters days", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "uk-UA" });
  const res = await ctx.request.post("/api/v1/auth/e2e-login", { data: { email: `map-${run}@e2e.test`, name: "Map" } });
  expect(res.status()).toBe(204);
  const page = await ctx.newPage();
  await page.route("**/api/v1/places/search*", (route) => route.fulfill({ json: PLACES }));

  await page.goto("/uk/trips/new");
  await page.getByLabel("Назва").fill(`Мапа ${run}`);
  await page.getByLabel("Початок").fill("2026-07-14");
  await page.getByLabel("Кінець").fill("2026-07-15");
  await page.getByRole("button", { name: "Створити поїздку" }).click();
  await expect(page.getByRole("heading", { name: /^День \d$/ })).toHaveCount(2);

  await page.getByRole("button", { name: "Додати до дня 1" }).click();
  await page.getByRole("combobox", { name: "Нова зупинка" }).fill("Говер");
  await page.getByRole("option", { name: /Говерла/ }).click();
  await expect(page.getByTestId("map-pin")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Маршрут" }).getByText("Яремче", { exact: true })).toBeVisible();

  // Second stop on day 2, picked with the keyboard (two ArrowDowns reach the second option).
  await page.getByRole("button", { name: "Додати до дня 2" }).click();
  const input = page.getByRole("combobox", { name: "Нова зупинка" });
  await input.fill("Рин");
  await expect(page.getByRole("option", { name: /Площа Ринок/ })).toBeVisible();
  await input.press("ArrowDown");
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page.getByTestId("map-pin")).toHaveCount(2);

  // Clicking a pin selects the matching stop in the list.
  await page.getByRole("button", { name: "Говерла, день 1, зупинка 1" }).click();
  await expect(page.getByRole("button", { name: "Говерла, день 1, зупинка 1" })).toHaveAttribute("aria-pressed", "true");

  // Legend: hiding day 2 removes its pin.
  await page.getByRole("group", { name: "Дні на мапі" }).getByRole("button", { name: "Д2" }).click();
  await expect(page.getByTestId("map-pin")).toHaveCount(1);
});

test("phone: bottom nav switches between list and a full-size map with a stop sheet", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "uk-UA", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  expect((await ctx.request.post("/api/v1/auth/e2e-login", { data: { email: `phone-${run}@e2e.test`, name: "Phone" } })).status()).toBe(204);
  const trip = await (await ctx.request.post("/api/v1/trips", { data: { title: `Телефон ${run}`, startDate: "2026-07-14", endDate: "2026-07-15" } })).json();
  const page = await ctx.newPage();
  await page.route("**/api/v1/places/search*", (route) => route.fulfill({ json: PLACES }));

  await page.goto(`/uk/trips/${trip.id}`);
  const nav = page.getByRole("navigation", { name: "Розділи поїздки" });
  await expect(nav.getByRole("link")).toHaveCount(4); // the header tabs are hidden on phones
  await page.getByRole("button", { name: "Додати до дня 1" }).click();
  await page.getByRole("combobox", { name: "Нова зупинка" }).fill("Говер");
  await page.getByRole("option", { name: /Говерла/ }).click();
  await page.keyboard.press("Escape");

  // List view: no map. Map view: the map fills the screen and the selected stop shows in a sheet.
  await expect(page.getByRole("region", { name: "Карта" })).toBeHidden();
  await nav.getByRole("link", { name: "Карта" }).click();
  const map = page.getByRole("region", { name: "Карта" });
  await expect(map).toBeVisible();
  expect((await map.boundingBox())!.height).toBeGreaterThan(300);
  await expect(page.getByTestId("map-pin")).toBeInViewport();
  await page.getByTestId("map-pin").click();
  await expect(page.getByRole("link", { name: "Прокласти" }).or(page.getByRole("link", { name: "Коментарі" })).first()).toBeVisible();
  await nav.getByRole("link", { name: "Маршрут" }).click();
  await expect(page.getByRole("region", { name: "Карта" })).toBeHidden();
});
