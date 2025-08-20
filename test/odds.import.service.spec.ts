import { OddsImportService } from 'src/odds/odds.import.service';
import { createPrismaMock } from './mocks/prisma.mock';
import { setApiFootballMock } from './mocks/api-football.mock';

describe('OddsImportService', () => {
  const prisma = createPrismaMock();
  const svc = new OddsImportService(prisma);

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;
    setApiFootballMock();
  });

  it('parse 1X2', () => {
    const input = {
      bookmakers: [
        { name: 'bet365', bets: [{ name: 'Match Winner', values: [{ value: 'Home', odd: '2.10' }, { value: 'Draw', odd: '3.30' }, { value: 'Away', odd: '3.20' }] }] },
        { name: 'Unibet', bets: [{ name: '1X2',         values: [{ value: '1', odd: '2.05' },  { value: 'X', odd: '3.35' },  { value: '2', odd: '3.40' }] }] },
      ],
    } as any;

    // @ts-ignore accès test à la méthode privée
    const rows = (svc as any).parse1X2(input);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ book: 'bet365', o1: 2.10, oX: 3.30, o2: 3.20 });
    expect(rows[1]).toMatchObject({ book: 'Unibet', o1: 2.05, oX: 3.35, o2: 3.40 });
  });

  it('import upcoming: écrit une ligne odds par bookmaker (create ou createMany)', async () => {
    prisma.competition.findFirst.mockResolvedValue({ id: 10, code: 'L1', afLeagueId: 61 });
    prisma.season.findFirst.mockResolvedValue({ id: 20, label: '2025-2026' });

    const inTwoDays = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
    prisma.match.findMany.mockResolvedValue([{ id: 300, afFixtureId: 5001, startsAt: new Date(inTwoDays) }]);
    prisma.match.findUnique.mockResolvedValue({ id: 300, afFixtureId: 5001 });

    prisma.odds.create.mockResolvedValue({});
    prisma.odds.createMany.mockResolvedValue({ count: 2 });

    setApiFootballMock({
      oddsRange: jest.fn().mockResolvedValue({
        results: [{
          fixture: { id: 5001 },
          bookmakers: [
            { name: 'bet365', bets: [{ name: 'Match Winner', values: [{ value: 'Home', odd: '2.10' }, { value: 'Draw', odd: '3.30' }, { value: 'Away', odd: '3.20' }] }] },
            { name: 'Unibet', bets: [{ name: '1X2',         values: [{ value: '1', odd: '2.05' },  { value: 'X', odd: '3.35' },  { value: '2', odd: '3.40' }] }] }
          ]
        }],
        paging: { current: 1, total: 1 }
      })
    });

    const out = await svc.importUpcomingFromApiFootball('L1', 2025, 40);

    // On accepte createMany OU create
    const createManyCount = prisma.odds.createMany.mock.calls?.length
      ? prisma.odds.createMany.mock.calls[0][0]?.data?.length ?? prisma.odds.createMany.mock.calls[0][0]?.count ?? 0
      : 0;
    const createCount = prisma.odds.create.mock.calls?.length || 0;

    expect(createManyCount + createCount).toBe(2); // 2 bookmakers => 2 lignes
    expect(out.rowsSaved).toBe(2);
  });
});
