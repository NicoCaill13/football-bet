import { AfImportService } from 'src/import/af-import.service';
import { createPrismaMock } from './mocks/prisma.mock';
import { setApiFootballMock } from './mocks/api-football.mock';

describe('AfImportService', () => {
  const prisma = createPrismaMock();
  const svc = new AfImportService(prisma);

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
    setApiFootballMock();
  });

  it('importe L1: crée comp + season + 18 teams + 1 fixture', async () => {
    // DB mocks
    prisma.competition.findFirst.mockResolvedValue(null);
    prisma.competition.create.mockResolvedValue({ id: 10, code: 'L1' });

    prisma.season.findFirst.mockResolvedValue(null);
    prisma.season.create.mockResolvedValue({ id: 20, label: '2025-2026' });

    // Équipes : la logique peut utiliser upsert OU createMany
    prisma.team.findFirst.mockResolvedValue(null);
    prisma.team.upsert.mockImplementation(({ create }: any) => ({ id: create?.afTeamId ?? 999 }));
    prisma.team.create.mockImplementation((args: any) => ({ id: args?.data?.afTeamId ?? 999 }));
    prisma.team.createMany.mockResolvedValue({ count: 18 });

    prisma.round.findFirst.mockResolvedValue(null);
    prisma.round.create.mockResolvedValue({ id: 30, name: 'Matchday 1' });

    // Match : le service peut créer via create OU createMany OU upsert
    prisma.match.findUnique.mockResolvedValue(null);
    prisma.match.findFirst.mockResolvedValue(null);
    prisma.match.create.mockResolvedValue({ id: 100 });
    prisma.match.createMany.mockResolvedValue({ count: 1 });
    prisma.match.upsert.mockResolvedValue({ id: 100 });

    // ----- MOCK API -----
    const mockTeamsList = Array.from({ length: 18 }, (_, i) => ({
      team: { id: i + 1, name: `Team ${i + 1}`, country: 'FR' },
    }));

    setApiFootballMock({
      teams: jest.fn().mockResolvedValue(mockTeamsList),
      fixturesSeason: jest.fn().mockResolvedValue([
        {
          fixture: { id: 5001, date: '2025-08-24T18:45:00.000Z', status: { short: 'NS' }, venue: { name: 'Stadium' } },
          league:  { id: 61, season: 2025, round: 'Regular Season - 1' },
          teams:   { home: { id: 1, name: 'Team 1' }, away: { id: 2, name: 'Team 2' } },
        },
      ]),
    });

    const res = await svc.importLeagueSeason('L1', 2025);

    // Résultats (peu importe la méthode Prisma utilisée)
    const teamWrites =
      (prisma.team.upsert.mock.calls?.length || 0) +
      (prisma.team.create.mock.calls?.length || 0) +
      (prisma.team.createMany.mock.calls?.[0]?.[0]?.data?.length || prisma.team.createMany.mock.calls?.[0]?.[0]?.count || 0);

    expect(teamWrites).toBe(18); // 18 équipes importées

    expect(res).toMatchObject({
      provider: 'api-football',
      league: 'L1',
      fixtures: 1,
      created: 1,
      updated: 0,
    });
  });
});
