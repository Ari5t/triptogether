// Demo trip "Карпати + Львів" from docs/design/DESIGN.md §7.8: itinerary (Yjs doc + SQL snapshot), places,
// expenses, a poll with votes, chat and stop comments.
//
//   pnpm db:seed                          demo people only
//   SEED_OWNER_EMAIL=you@gmail.com pnpm db:seed   you own the demo trip (sign in with Google once first)
//   pnpm db:seed -- --reset               delete the demo trip and create it again
//   pnpm db:seed -- --reset --lang en     same trip with English content ("Carpathians + Lviv")
import { addItem, readDays, syncDays } from "@triptogether/doc";
import { splitEqual } from "@triptogether/shared";
import * as Y from "yjs";
import { createPrisma } from "../src/index.js";

const prisma = createPrisma();
const langArg = process.argv.indexOf("--lang");
const EN = process.argv.includes("--lang=en") || (langArg >= 0 && process.argv[langArg + 1] === "en");
const LANG = EN ? "en" : "uk";
// Pick the Ukrainian or English text; amounts, times and coordinates are shared so the numbers match DESIGN §7.8.
const t = (uk: string, en: string) => (EN ? en : uk);
const TITLES = ["Карпати + Львів", "Carpathians + Lviv"];
const TITLE = t(TITLES[0]!, TITLES[1]!);
const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

const demo = [
  { googleId: "seed-oksana", name: t("Оксана Мельник", "Oksana Melnyk"), email: "oksana.melnyk@gmail.com", role: "OWNER" },
  { googleId: "seed-taras", name: t("Тарас Бойко", "Taras Boiko"), email: "taras.boiko@gmail.com", role: "EDITOR" },
  { googleId: "seed-marta", name: t("Марта Левицька", "Marta Levytska"), email: "marta.levytska@gmail.com", role: "EDITOR" },
  { googleId: "seed-andrii", name: t("Андрій Ковальчук", "Andrii Kovalchuk"), email: "andrii.kovalchuk@gmail.com", role: "VIEWER" },
] as const;

// Real coordinates, so the map has something to show.
const PLACES: Record<string, { name: string; address: string; lat: number; lng: number }> = {
  kyiv: { name: t("Київ-Пасажирський", "Kyiv Passenger station"), address: t("Київ", "Kyiv"), lat: 50.4408, lng: 30.4885 },
  frankivsk: { name: t("Івано-Франківськ", "Ivano-Frankivsk"), address: t("Івано-Франківськ", "Ivano-Frankivsk"), lat: 48.9226, lng: 24.7111 },
  yaremche: { name: t("Яремче", "Yaremche"), address: t("Яремче, Івано-Франківська область", "Yaremche, Ivano-Frankivsk Oblast"), lat: 48.4547, lng: 24.5696 },
  chany: { name: t("Чани в Яремче", "Hot tubs in Yaremche"), address: t("Яремче", "Yaremche"), lat: 48.4472, lng: 24.5547 },
  zaroslyak: { name: t("Заросляк", "Zaroslyak"), address: t("Ворохта, Говерла", "Vorokhta, Hoverla trailhead"), lat: 48.1636, lng: 24.5462 },
  hoverla: { name: t("Говерла", "Hoverla"), address: t("Рахівський район", "Rakhiv district"), lat: 48.1601, lng: 24.5003 },
  vorokhta: { name: t("Віадук у Ворохті", "Vorokhta viaduct"), address: t("Ворохта", "Vorokhta"), lat: 48.2822, lng: 24.5547 },
  bukovel: { name: t("Озеро Молодості", "Youth Lake"), address: t("Буковель", "Bukovel"), lat: 48.3607, lng: 24.4043 },
  rynok: { name: t("Площа Ринок", "Rynok Square"), address: t("Львів, центр", "Lviv, city centre"), lat: 49.8419, lng: 24.0315 },
  castle: { name: t("Високий Замок", "High Castle"), address: t("Львів", "Lviv"), lat: 49.8486, lng: 24.0391 },
  opera: { name: t("Львівська опера", "Lviv Opera"), address: t("Львів, проспект Свободи", "Lviv, Svobody Avenue"), lat: 49.8441, lng: 24.0261 },
};

const HOVERLA_STOP = t("Сходження на Говерлу", "Hoverla ascent");

// [day index, place key | null, title, time]
const STOPS: [number, string | null, string, string | null][] = [
  [0, "kyiv", t("Потяг Київ → Івано-Франківськ", "Train Kyiv → Ivano-Frankivsk"), "06:10"],
  [0, "frankivsk", t("Пересадка в Івано-Франківську", "Change at Ivano-Frankivsk"), "11:30"],
  [0, "yaremche", t("Автобус до Яремче", "Bus to Yaremche"), "13:00"],
  [0, "yaremche", t("Заселення в садибу «Смерекова хата»", "Check in at the “Smerekova Khata” guesthouse"), "15:00"],
  [0, "yaremche", t("Вечеря в «Гуцульщині»", "Dinner at “Hutsulshchyna”"), "19:30"],
  [1, "zaroslyak", t("Трансфер до Заросляка", "Transfer to Zaroslyak"), "06:30"],
  [1, "hoverla", HOVERLA_STOP, "08:00"],
  [1, "zaroslyak", t("Обід у колибі біля Заросляка", "Lunch at a mountain hut near Zaroslyak"), "15:00"],
  [1, "chany", t("Чани в Яремче", "Hot tubs in Yaremche"), "19:00"],
  [2, "vorokhta", t("Віадук у Ворохті", "Vorokhta viaduct"), "10:00"],
  [2, "bukovel", t("Озеро Молодості", "Youth Lake"), "13:00"],
  [2, "yaremche", t("Автобус Яремче → Львів", "Bus Yaremche → Lviv"), "17:00"],
  [3, "rynok", t("Площа Ринок", "Rynok Square"), null],
  [3, "castle", t("Високий Замок", "High Castle"), null],
  [3, "opera", t("Опера", "Opera"), "19:00"],
  [3, "rynok", t("Кава на Ринку", "Coffee on Rynok"), null],
  [4, null, t("Потяг Львів → Київ", "Train Lviv → Kyiv"), "16:24"],
];

// [title, category, UAH, payer index, day offset, EUR minor units when paid in euros]
const EXPENSES: [string, string, number, number, number, number?][] = [
  [t("Квитки Інтерсіті Київ → Франківськ ×4", "Intercity tickets Kyiv → Frankivsk ×4"), "TRANSPORT", 3280, 0, 0],
  [t("Садиба «Смерекова хата», 2 ночі", "“Smerekova Khata” guesthouse, 2 nights"), "LODGING", 7200, 1, 0],
  [t("Продукти та спорядження на похід", "Groceries and hiking gear"), "FOOD", 2140, 2, 0],
  [t("Вечеря в «Гуцульщині»", "Dinner at “Hutsulshchyna”"), "FOOD", 2860, 1, 0],
  [t("Трансфер до Заросляка", "Transfer to Zaroslyak"), "TRANSPORT", 1600, 3, 1],
  [t("Чани в Яремче", "Hot tubs in Yaremche"), "LEISURE", 2400, 2, 1],
  [t("Автобус Яремче → Львів", "Bus Yaremche → Lviv"), "TRANSPORT", 1720, 0, 2],
  // Paid in euros at a fixed rate of 48, so the UAH total stays 1 920 and the budget shows a multi-currency row.
  [t("Квитки в Оперу ×4", "Opera tickets ×4"), "LEISURE", 1920, 3, 3, 4000],
];

const POLL_OPTIONS = [t("Апартаменти на Підвальній", "Apartment on Pidvalna"), t("Готель біля Опери", "Hotel near the Opera"), t("Хостел на Вірменській", "Hostel on Virmenska")] as const;

async function main() {
  const ownerEmail = process.env.SEED_OWNER_EMAIL;
  const realOwner = ownerEmail ? await prisma.user.findUnique({ where: { email: ownerEmail } }) : null;
  if (ownerEmail && !realOwner) console.warn(`No user with email ${ownerEmail}: sign in with Google once, then seed again. Using the demo owner.`);

  const users = await Promise.all(
    demo.map((p, i) =>
      i === 0 && realOwner
        ? realOwner
        : prisma.user.upsert({ where: { googleId: p.googleId }, create: { googleId: p.googleId, name: p.name, email: p.email }, update: { name: p.name } }),
    ),
  );
  const owner = users[0]!;

  if (process.argv.includes("--reset")) await prisma.trip.deleteMany({ where: { createdById: owner.id, title: { in: TITLES } } });
  else {
    const existing = await prisma.trip.findFirst({ where: { createdById: owner.id, title: TITLE } });
    if (existing) return console.log(`Demo trip already exists (${existing.id}). Use --reset to recreate it.`);
  }

  // A planned trip: starts in three weeks, five days long.
  const start = Date.parse(iso(Date.now() + 21 * DAY));
  const end = start + 4 * DAY;
  const trip = await prisma.trip.create({
    data: {
      title: TITLE,
      destinations: { create: [t("Яремче", "Yaremche"), t("Говерла", "Hoverla"), t("Ворохта", "Vorokhta"), t("Львів", "Lviv")].map((name, order) => ({ order, name })) },
      startDate: new Date(start),
      endDate: new Date(end),
      currency: "UAH",
      createdById: owner.id,
      members: { create: users.map((u, i) => ({ userId: u.id, role: demo[i]!.role })) },
    },
  });

  // Places
  const placeIds: Record<string, string> = {};
  for (const [key, p] of Object.entries(PLACES)) {
    const row = await prisma.place.upsert({
      where: { provider_externalId: { provider: "seed", externalId: key } },
      create: { provider: "seed", externalId: key, ...p },
      update: p,
    });
    placeIds[key] = row.id;
  }

  // Itinerary: the Yjs document is the source of truth, the SQL snapshot is rebuilt from it (as the collab server does).
  const doc = new Y.Doc();
  syncDays(doc, iso(start), iso(end));
  const days = readDays(doc);
  for (const [dayIndex, key, title, time] of STOPS) {
    const place = key ? PLACES[key]! : null;
    addItem(doc, days[dayIndex]!.id, { title, startTime: time ?? undefined, ...(key && place ? { placeId: placeIds[key]!, address: place.address, lat: place.lat, lng: place.lng } : {}) });
  }
  const state = Buffer.from(Y.encodeStateAsUpdate(doc));
  await prisma.tripDoc.upsert({ where: { tripId: trip.id }, create: { tripId: trip.id, state }, update: { state } });
  const snapshot = readDays(doc);
  for (const [order, d] of snapshot.entries()) {
    await prisma.day.create({
      data: { id: d.id, tripId: trip.id, date: new Date(`${d.date}T00:00:00Z`), order, items: { create: d.items.map((i, n) => ({ id: i.id, title: i.title, startTime: i.startTime, placeId: i.placeId, order: n })) } },
    });
  }

  // Expenses, split equally between everyone
  const ids = users.map((u) => u.id);
  for (const [title, category, uah, payer, offset, eur] of EXPENSES) {
    const amountMinor = uah * 100;
    await prisma.expense.create({
      data: {
        tripId: trip.id,
        title,
        category: category as "TRANSPORT",
        amountMinor,
        ...(eur ? { originalCurrency: "EUR", originalAmountMinor: eur, rate: String(amountMinor / eur), rateDate: new Date(iso(Date.now())) } : {}),
        paidById: ids[payer]!,
        splitType: "EQUAL",
        spentAt: new Date(start + offset * DAY),
        createdById: ids[payer]!,
        splits: { create: Object.entries(splitEqual(amountMinor, ids)).map(([userId, amount]) => ({ userId, amountMinor: amount })) },
      },
    });
  }

  // Chat, a poll with votes, and comments on the Hoverla stop
  const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000);
  const say = (who: number, body: string, minutesAgo: number, itemId?: string) => prisma.message.create({ data: { tripId: trip.id, authorId: ids[who]!, body, itemId: itemId ?? null, createdAt: at(minutesAgo) } });
  await say(1, t("Вніс у бюджет садибу в Яремчі — 7 200 за дві ночі, сніданки включені.", "Added the Yaremche guesthouse to the budget — 7,200 for two nights, breakfasts included."), 130);
  await say(0, t("Дякую! А для Львова давайте проголосуємо — у мене вже 12 вкладок із житлом.", "Thanks! For Lviv let’s vote — I already have 12 tabs open with places to stay."), 127);
  const question = t("Де ночуємо у Львові?", "Where do we stay in Lviv?");
  const poll = await prisma.poll.create({
    data: {
      tripId: trip.id,
      question,
      closesAt: new Date(Date.now() + 7 * DAY),
      createdById: ids[0]!,
      options: { create: POLL_OPTIONS.map((label) => ({ label })) },
      message: { create: { tripId: trip.id, authorId: ids[0]!, body: question, createdAt: at(126) } },
    },
    include: { options: { orderBy: { id: "asc" } } },
  });
  const option = (n: number) => poll.options.find((o) => o.label === POLL_OPTIONS[n])!.id;
  await prisma.vote.createMany({ data: [{ optionId: option(0), userId: ids[0]! }, { optionId: option(0), userId: ids[2]! }, { optionId: option(1), userId: ids[1]! }] });
  await say(2, t("Підвальна — п’ять хвилин до Ринку, і там є пральна машина. Після гір саме те.", "Pidvalna is five minutes from Rynok and has a washing machine. Just what we need after the mountains."), 110);
  await say(3, t("Буду ввечері, гляну все разом.", "I’ll be on in the evening, will look at everything then."), 60);

  const hoverla = snapshot[1]!.items.find((i) => i.title === HOVERLA_STOP)!.id;
  await say(3, t("Може, вийти раніше, ніж о 08:00? Після обіду на Чорногорі часто гроза.", "Maybe start earlier than 08:00? Afternoon thunderstorms on Chornohora are common."), 2880, hoverla);
  await say(1, t("Згоден. Трансфер можу перенести на 05:45, водій не проти.", "Agreed. I can move the transfer to 05:45, the driver doesn’t mind."), 2860, hoverla);
  await say(2, t("Тоді сніданок беремо з собою — у садибі дадуть ланчбокси, я вже спитала.", "Then we take breakfast with us — the guesthouse will give us lunch boxes, I already asked."), 1500, hoverla);
  await say(0, t("Добре, ставимо вихід о 06:30. Тарасе, онови, будь ласка, час у маршруті.", "Good, we set the start at 06:30. Taras, please update the time in the itinerary."), 40, hoverla);

  console.log(`Demo trip created: /${LANG}/trips/${trip.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
