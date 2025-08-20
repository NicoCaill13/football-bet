export const createPrismaMock = () => {
  const prisma: any = {
    competition: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    season:      { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    round:       { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    team:        { findFirst: jest.fn(), upsert: jest.fn(), create: jest.fn(), createMany: jest.fn() },
    match:       { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), createMany: jest.fn(), update: jest.fn(), upsert: jest.fn() },
    odds:        { create: jest.fn(), createMany: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
    fixtureChangeLog: { create: jest.fn(), findMany: jest.fn() },
  };
  return prisma as any;
};
