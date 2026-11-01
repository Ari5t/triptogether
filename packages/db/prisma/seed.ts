import { createPrisma } from "../src/index.js";

// Demo trip from docs/design/DESIGN.md §7.8 (itinerary, expenses, poll and chat come in later phases).
const prisma = createPrisma();

const people = [
  { googleId: "seed-oksana", name: "Оксана Мельник", email: "oksana.melnyk@gmail.com", role: "OWNER" },
  { googleId: "seed-taras", name: "Тарас Бойко", email: "taras.boiko@gmail.com", role: "EDITOR" },
  { googleId: "seed-marta", name: "Марта Левицька", email: "marta.levytska@gmail.com", role: "EDITOR" },
  { googleId: "seed-andrii", name: "Андрій Ковальчук", email: "andrii.kovalchuk@gmail.com", role: "VIEWER" },
] as const;

const users = await Promise.all(
  people.map((p) =>
    prisma.user.upsert({
      where: { googleId: p.googleId },
      create: { googleId: p.googleId, name: p.name, email: p.email },
      update: {},
    }),
  ),
);

const owner = users[0]!;
const existing = await prisma.trip.findFirst({ where: { createdById: owner.id, title: "Карпати + Львів" } });
if (!existing) {
  await prisma.trip.create({
    data: {
      title: "Карпати + Львів",
      destination: "Яремче · Говерла · Ворохта · Львів",
      startDate: new Date("2026-07-14T00:00:00Z"),
      endDate: new Date("2026-07-18T00:00:00Z"),
      currency: "UAH",
      createdById: owner.id,
      members: { create: users.map((u, i) => ({ userId: u.id, role: people[i]!.role })) },
    },
  });
}
await prisma.$disconnect();
