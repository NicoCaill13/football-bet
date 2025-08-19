import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Basic teams
  const lille = await prisma.team.upsert({
    where: { slug: "lille" },
    update: {},
    create: { name: "Lille OSC", slug: "lille", country: "FR" },
  });
  const monaco = await prisma.team.upsert({
    where: { slug: "monaco" },
    update: {},
    create: { name: "AS Monaco", slug: "monaco", country: "FR" },
  });

  // Example match (update date as needed)
  const m = await prisma.match.create({
    data: {
      competitionName: "Ligue 1",
      venue: "Decathlon Arena – Pierre-Mauroy",
      startsAt: new Date("2025-08-24T18:45:00.000Z"), // 20:45 CEST
      homeTeamId: lille.id,
      awayTeamId: monaco.id,
    },
  });

  // Example odds snapshot
  await prisma.odds.create({
    data: {
      matchId: m.id,
      book: "demo-book",
      o1: 3.05,
      oX: 3.60,
      o2: 2.40,
    },
  });

  console.log({ lille, monaco, m });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });