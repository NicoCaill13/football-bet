import { PrismaClient, CompetitionType } from "@prisma/client";

const prisma = new PrismaClient();

type CompDef = {
  name: string;
  code: string;
  country?: string;
  organizer?: string;
  type: CompetitionType;
  // saison
  seasonLabel?: string;          // défaut "2025-2026"
  seasonStart?: string;          // ISO date
  seasonEnd?: string;            // ISO date
  // rounds
  leagueMatchdays?: number;      // si ligue, nombre de journées
  cupRounds?: Array<{ name: string; stage?: string; leg?: number; roundNo?: number }>;
};

const SEASON_LABEL = "2025-2026";
const SEASON_START = "2025-08-01T00:00:00.000Z";
const SEASON_END   = "2026-06-30T23:59:59.000Z";

const comps: CompDef[] = [
  // ---- LIGUES (5)
  { name: "Ligue 1",        code: "L1",  country: "FR", organizer: "LFP",     type: "league", leagueMatchdays: 34 },
  { name: "Premier League", code: "PL",  country: "EN", organizer: "FA/PL",   type: "league", leagueMatchdays: 38 },
  { name: "Serie A",        code: "SA",  country: "IT", organizer: "FIGC",    type: "league", leagueMatchdays: 38 },
  { name: "LaLiga",         code: "LL",  country: "ES", organizer: "LaLiga",  type: "league", leagueMatchdays: 38 },
  { name: "Bundesliga",     code: "BUN", country: "DE", organizer: "DFL",     type: "league", leagueMatchdays: 34 },

  // ---- COUPES NATIONALES
  { name: "Coupe de France", code: "CDF", country: "FR", organizer: "FFF", type: "cup",
    cupRounds: [
      { name: "Round of 64" }, { name: "Round of 32" }, { name: "Round of 16" },
      { name: "Quarterfinal" }, { name: "Semifinal" }, { name: "Final" },
    ],
  },
  { name: "Coppa Italia", code: "CI", country: "IT", organizer: "FIGC", type: "cup",
    cupRounds: [
      { name: "Round of 64" }, { name: "Round of 32" }, { name: "Round of 16" },
      { name: "Quarterfinal" }, { name: "Semifinal", leg: 1 }, { name: "Semifinal", leg: 2 }, { name: "Final" },
    ],
  },
  { name: "Copa del Rey", code: "CDR", country: "ES", organizer: "RFEF", type: "cup",
    cupRounds: [
      { name: "Round of 64" }, { name: "Round of 32" }, { name: "Round of 16" },
      { name: "Quarterfinal" }, { name: "Semifinal", leg: 1 }, { name: "Semifinal", leg: 2 }, { name: "Final" },
    ],
  },
  { name: "DFB-Pokal", code: "DFB", country: "DE", organizer: "DFB", type: "cup",
    cupRounds: [
      { name: "Round of 64" }, { name: "Round of 32" }, { name: "Round of 16" },
      { name: "Quarterfinal" }, { name: "Semifinal" }, { name: "Final" },
    ],
  },
  { name: "FA Cup", code: "FAC", country: "EN", organizer: "FA", type: "cup",
    cupRounds: [
      { name: "Round of 64" }, { name: "Round of 32" }, { name: "Round of 16" },
      { name: "Quarterfinal" }, { name: "Semifinal" }, { name: "Final" },
    ],
  },
  // Optionnel 2e coupe anglaise (EFL Cup / Carabao)
  { name: "EFL Cup", code: "EFLC", country: "EN", organizer: "EFL", type: "cup",
    cupRounds: [
      { name: "Round 1" }, { name: "Round 2" }, { name: "Round 3" }, { name: "Round 4" },
      { name: "Quarterfinal" }, { name: "Semifinal", leg: 1 }, { name: "Semifinal", leg: 2 }, { name: "Final" },
    ],
  },

  // ---- EUROPE (3)
  { name: "UEFA Champions League", code: "UCL", country: "EU", organizer: "UEFA", type: "europe",
    cupRounds: [
      // (format 2024+ avec ligue suisse — on reste générique)
      { name: "League Phase Matchday 1" }, { name: "League Phase Matchday 2" },
      { name: "League Phase Matchday 3" }, { name: "League Phase Matchday 4" },
      { name: "League Phase Matchday 5" }, { name: "League Phase Matchday 6" },
      { name: "League Phase Matchday 7" }, { name: "League Phase Matchday 8" },
      { name: "Knockout Play-offs", stage: "KO playoffs" },
      { name: "Round of 16" }, { name: "Quarterfinal", leg: 1 }, { name: "Quarterfinal", leg: 2 },
      { name: "Semifinal", leg: 1 }, { name: "Semifinal", leg: 2 }, { name: "Final" },
    ],
  },
  { name: "UEFA Europa League", code: "UEL", country: "EU", organizer: "UEFA", type: "europe",
    cupRounds: [
      { name: "League Phase Matchday 1" }, { name: "League Phase Matchday 2" },
      { name: "League Phase Matchday 3" }, { name: "League Phase Matchday 4" },
      { name: "League Phase Matchday 5" }, { name: "League Phase Matchday 6" },
      { name: "League Phase Matchday 7" }, { name: "League Phase Matchday 8" },
      { name: "Knockout Play-offs", stage: "KO playoffs" },
      { name: "Round of 16" }, { name: "Quarterfinal", leg: 1 }, { name: "Quarterfinal", leg: 2 },
      { name: "Semifinal", leg: 1 }, { name: "Semifinal", leg: 2 }, { name: "Final" },
    ],
  },
  { name: "UEFA Europa Conference League", code: "UECL", country: "EU", organizer: "UEFA", type: "europe",
    cupRounds: [
      { name: "League Phase Matchday 1" }, { name: "League Phase Matchday 2" },
      { name: "League Phase Matchday 3" }, { name: "League Phase Matchday 4" },
      { name: "League Phase Matchday 5" }, { name: "League Phase Matchday 6" },
      { name: "League Phase Matchday 7" }, { name: "League Phase Matchday 8" },
      { name: "Knockout Play-offs", stage: "KO playoffs" },
      { name: "Round of 16" }, { name: "Quarterfinal", leg: 1 }, { name: "Quarterfinal", leg: 2 },
      { name: "Semifinal", leg: 1 }, { name: "Semifinal", leg: 2 }, { name: "Final" },
    ],
  },
];

async function upsertCompetition(def: CompDef) {
  // pas d'unique sur code => on fait un « upsert » maison
  const existing = await prisma.competition.findFirst({
    where: { OR: [{ code: def.code }, { name: def.name }] },
  });

  const data = {
    name: def.name,
    code: def.code,
    country: def.country,
    type: def.type,
    organizer: def.organizer,
  } as const;

  const comp = existing
    ? await prisma.competition.update({ where: { id: existing.id }, data })
    : await prisma.competition.create({ data });

  // Saison 2025-2026
  const seasonLabel = def.seasonLabel ?? SEASON_LABEL;
  let season = await prisma.season.findFirst({
    where: { competitionId: comp.id, label: seasonLabel },
  });
  if (!season) {
    season = await prisma.season.create({
      data: {
        competitionId: comp.id,
        label: seasonLabel,
        startDate: new Date(def.seasonStart ?? SEASON_START),
        endDate: new Date(def.seasonEnd ?? SEASON_END),
      },
    });
  }

  // Rounds
  const existingRoundsCount = await prisma.round.count({ where: { seasonId: season.id } });
  if (existingRoundsCount === 0) {
    if (def.type === "league" && def.leagueMatchdays) {
      // Journées 1..N
      for (let i = 1; i <= def.leagueMatchdays; i++) {
        await prisma.round.create({
          data: { seasonId: season.id, name: `Matchday ${i}`, roundNo: i },
        });
      }
    } else if (def.cupRounds?.length) {
      for (const r of def.cupRounds) {
        await prisma.round.create({
          data: { seasonId: season.id, name: r.name, stage: r.stage, leg: r.leg ?? undefined },
        });
      }
    }
  }

  return { comp, seasonId: season.id };
}

async function main() {
  for (const def of comps) {
    const { comp, seasonId } = await upsertCompetition(def);
    console.log(`✔ ${comp.name} (${comp.code}) — season ${SEASON_LABEL} [id=${seasonId}]`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

