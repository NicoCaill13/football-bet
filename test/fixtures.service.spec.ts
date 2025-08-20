import { FixturesService } from 'src/fixtures/fixtures.service';
import { createPrismaMock } from './mocks/prisma.mock';

describe('FixturesService', () => {
  const prisma = createPrismaMock();
  const svc = new FixturesService(prisma);

  beforeEach(() => jest.resetAllMocks());

  it('logReschedule crée une ligne de change log', async () => {
    prisma.fixtureChangeLog.create.mockResolvedValue({ id: 1 });
    const res = await svc.reschedule(42, { from: '2025-09-01T18:00:00.000Z', to: '2025-09-02T18:30:00.000Z', note: 'TV' });
    expect(prisma.fixtureChangeLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ matchId: 42, type: 'reschedule' })
    }));
    expect(res).toEqual({ ok: true });
  });
});
