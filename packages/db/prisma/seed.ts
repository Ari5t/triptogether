// Demo trip "Карпати + Львів" from docs/design/DESIGN.md §7.8: itinerary (Yjs doc + SQL snapshot), places,
// expenses, a poll with votes, chat and stop comments.
//
//   pnpm db:seed                          demo people only
//   SEED_OWNER_EMAIL=you@gmail.com pnpm db:seed   you own the demo trip (sign in with Google once first)
//   pnpm db:seed -- --reset               delete the demo trip and create it again
import { addItem, readDays, syncDays } from "@triptogether/doc";
import { splitEqual } from "@triptogether/shared";
import * as Y from "yjs";
import { createPrisma } from "../src/index.js";

const prisma = createPrisma();
const TITLE = "Карпати + Львів";
const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

const demo = [
  { googleId: "seed-oksana", name: "Оксана Мельник", email: "oksana.melnyk@gmail.com", role: "OWNER" },
  { googleId: "seed-taras", name: "Тарас Бойко", email: "taras.boiko@gmail.com", role: "EDITOR" },
  { googleId: "seed-marta", name: "Марта Левицька", email: "marta.levytska@gmail.com", role: "EDITOR" },
  { googleId: "seed-andrii", name: "Андрій Ковальчук", email: "andrii.kovalchuk@gmail.com", role: "VIEWER" },
] as const;

// Real coordinates, so the map has something to show.
const PLACES: Record<string, { name: string; address: string; lat: number; lng: number }> = {
  kyiv: { name: "Київ-Пасажирський", address: "Київ", lat: 50.4408, lng: 30.4885 },
  frankivsk: { name: "Івано-Франківськ", address: "Івано-Франківськ", lat: 48.9226, lng: 24.7111 },
  yaremche: { name: "Яремче", address: "Яремче, Івано-Франківська область", lat: 48.4547, lng: 24.5696 },
  chany: { name: "Чани в Яремче", address: "Яремче", lat: 48.4472, lng: 24.5547 },
  zaroslyak: { name: "Заросляк", address: "Ворохта, Говерла", lat: 48.1636, lng: 24.5462 },
  hoverla: { name: "Говерла", address: "Рахівський район", lat: 48.1601, lng: 24.5003 },
  vorokhta: { name: "Віадук у Ворохті", address: "Ворохта", lat: 48.2822, lng: 24.5547 },
  bukovel: { name: "Озеро Молодості", address: "Буковель", lat: 48.3607, lng: 24.4043 },
  rynok: { name: "Площа Ринок", address: "Львів, центр", lat: 49.8419, lng: 24.0315 },
  castle: { name: "Високий Замок", address: "Львів", lat: 49.8486, lng: 24.0391 },
  opera: { name: "Львівська опера", address: "Львів, проспект Свободи", lat: 49.8441, lng: 24.0261 },
};

// [day index, place key | null, title, time]
const STOPS: [number, string | null, string, string | null][] = [
  [0, "kyiv", "Потяг Київ → Івано-Франківськ", "06:10"],
  [0, "frankivsk", "Пересадка в Івано-Франківську", "11:30"],
  [0, "yaremche", "Автобус до Яремче", "13:00"],
  [0, "yaremche", "Заселення в садибу «Смерекова хата»", "15:00"],
  [0, "yaremche", "Вечеря в «Гуцульщині»", "19:30"],
  [1, "zaroslyak", "Трансфер до Заросляка", "06:30"],
  [1, "hoverla", "Сходження на Говерлу", "08:00"],
  [1, "zaroslyak", "Обід у колибі біля Заросляка", "15:00"],
  [1, "chany", "Чани в Яремче", "19:00"],
  [2, "vorokhta", "Віадук у Ворохті", "10:00"],
  [2, "bukovel", "Озеро Молодості", "13:00"],
  [2, "yaremche", "Автобус Яремче → Львів", "17:00"],
  [3, "rynok", "Площа Ринок", null],
  [3, "castle", "Високий Замок", null],
  [3, "opera", "Опера", "19:00"],
  [3, "rynok", "Кава на Ринку", null],
  [4, null, "Потяг Львів → Київ", "16:24"],
];

// [title, category, UAH, payer index, day offset]
const EXPENSES: [string, string, number, number, number][] = [
  ["Квитки Інтерсіті Київ → Франківськ ×4", "TRANSPORT", 3280, 0, 0],
  ["Садиба «Смерекова хата», 2 ночі", "LODGING", 7200, 1, 0],
  ["Продукти та спорядження на похід", "FOOD", 2140, 2, 0],
  ["Вечеря в «Гуцульщині»", "FOOD", 2860, 1, 0],
  ["Трансфер до Заросляка", "TRANSPORT", 1600, 3, 1],
  ["Чани в Яремче", "LEISURE", 2400, 2, 1],
  ["Автобус Яремче → Львів", "TRANSPORT", 1720, 0, 2],
  ["Квитки в Оперу ×4", "LEISURE", 1920, 3, 3],
];

async function main() {
  const ownerEmail = process.env.SEED_OWNER_EMAIL;
  const realOwner = ownerEmail ? await prisma.user.findUnique({ where: { email: ownerEmail } }) : null;
  if (ownerEmail && !realOwner) console.warn(`No user with email ${ownerEmail}: sign in with Google once, then seed again. Using the demo owner.`);

  const users = await Promise.all(
    demo.map((p, i) =>
      i === 0 && realOwner
        ? realOwner
        : prisma.user.upsert({ where: { googleId: p.googleId }, create: { googleId: p.googleId, name: p.name, email: p.email }, update: {} }),
    ),
  );
  const owner = users[0]!;

  const existing = await prisma.trip.findFirst({ where: { createdById: owner.id, title: TITLE } });
  if (existing && process.argv.includes("--reset")) await prisma.trip.delete({ where: { id: existing.id } });
  else if (existing) return console.log(`Demo trip already exists (${existing.id}). Use --reset to recreate it.`);

  // A planned trip: starts in three weeks, five days long.
  const start = Date.parse(iso(Date.now() + 21 * DAY));
  const end = start + 4 * DAY;
  const trip = await prisma.trip.create({
    data: {
      title: TITLE,
      destinations: { create: ["Яремче", "Говерла", "Ворохта", "Львів"].map((name, order) => ({ order, name })) },
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
      update: {},
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
  for (const [title, category, uah, payer, offset] of EXPENSES) {
    const amountMinor = uah * 100;
    await prisma.expense.create({
      data: {
        tripId: trip.id,
        title,
        category: category as "TRANSPORT",
        amountMinor,
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
  await say(1, "Вніс у бюджет садибу в Яремчі — 7 200 за дві ночі, сніданки включені.", 130);
  await say(0, "Дякую! А для Львова давайте проголосуємо — у мене вже 12 вкладок із житлом.", 127);
  const poll = await prisma.poll.create({
    data: {
      tripId: trip.id,
      question: "Де ночуємо у Львові?",
      closesAt: new Date(Date.now() + 7 * DAY),
      createdById: ids[0]!,
      options: { create: ["Апартаменти на Підвальній", "Готель біля Опери", "Хостел на Вірменській"].map((label) => ({ label })) },
      message: { create: { tripId: trip.id, authorId: ids[0]!, body: "Де ночуємо у Львові?", createdAt: at(126) } },
    },
    include: { options: { orderBy: { id: "asc" } } },
  });
  const byLabel = (l: string) => poll.options.find((o) => o.label.startsWith(l))!.id;
  await prisma.vote.createMany({ data: [{ optionId: byLabel("Апартаменти"), userId: ids[0]! }, { optionId: byLabel("Апартаменти"), userId: ids[2]! }, { optionId: byLabel("Готель"), userId: ids[1]! }] });
  await say(2, "Підвальна — п’ять хвилин до Ринку, і там є пральна машина. Після гір саме те.", 110);
  await say(3, "Буду ввечері, гляну все разом.", 60);

  const hoverla = snapshot[1]!.items.find((i) => i.title.startsWith("Сходження"))!.id;
  await say(3, "Може, вийти раніше, ніж о 08:00? Після обіду на Чорногорі часто гроза.", 2880, hoverla);
  await say(1, "Згоден. Трансфер можу перенести на 05:45, водій не проти.", 2860, hoverla);
  await say(2, "Тоді сніданок беремо з собою — у садибі дадуть ланчбокси, я вже спитала.", 1500, hoverla);
  await say(0, "Добре, ставимо вихід о 06:30. Тарасе, онови, будь ласка, час у маршруті.", 40, hoverla);

  console.log(`Demo trip created: /uk/trips/${trip.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
