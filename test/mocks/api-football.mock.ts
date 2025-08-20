type Impl = {
  teams: jest.Mock;
  fixturesSeason: jest.Mock;
  fixtureById: jest.Mock;
  oddsRange: jest.Mock;
};

const state: { impl: Impl } = {
  impl: {
    teams: jest.fn().mockResolvedValue([]),
    fixturesSeason: jest.fn().mockResolvedValue([]),
    fixtureById: jest.fn().mockResolvedValue(null),
    oddsRange: jest.fn().mockResolvedValue({ results: [], paging: { current: 1, total: 1 } }),
  },
};

export function setApiFootballMock(partial?: Partial<Impl>) {
  state.impl = {
    teams: jest.fn().mockResolvedValue([]),
    fixturesSeason: jest.fn().mockResolvedValue([]),
    fixtureById: jest.fn().mockResolvedValue(null),
    oddsRange: jest.fn().mockResolvedValue({ results: [], paging: { current: 1, total: 1 } }),
    ...(partial ?? {}),
  };
}

jest.mock('src/import/providers/api-football.client', () => ({
  ApiFootballClient: jest.fn().mockImplementation(() => state.impl),
}));
