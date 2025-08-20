import axios, { AxiosInstance } from "axios";

export type AfTeam = {
  team: { id: number; name: string; country?: string | null };
};

export type AfFixture = {
  fixture: {
    id: number;
    date: string;
    timezone: string;
    venue?: { name?: string | null } | null;
    status?: { long?: string | null; short?: string | null } | null;
  };
  league: { id: number; season: number; round?: string | null };
  teams: { home: { id: number; name: string }, away: { id: number; name: string } };
};

export type AfOdds = {
  fixture: { id: number };
  league: { id: number; season: number };
  update?: string;
  bookmakers: Array<{
    id: number;
    name: string;
    bets: Array<{
      id: number;
      name: string;
      values: Array<{ value: "Home"|"Draw"|"Away"|"1"|"X"|"2"; odd: string }>;
    }>;
  }>;
};

export class ApiFootballClient {
  private http: AxiosInstance;
  constructor(apiKey: string) {
    this.http = axios.create({
      baseURL: "https://v3.football.api-sports.io",
      headers: { "x-apisports-key": apiKey },
      timeout: 20000,
    });
  }
  async teams(leagueId: number, season: number): Promise<AfTeam[]> {
    const res = await this.http.get("/teams", { params: { league: leagueId, season } });
    return res.data?.response ?? [];
  }
  async fixturesSeason(leagueId: number, season: number): Promise<AfFixture[]> {
    const res = await this.http.get("/fixtures", { params: { league: leagueId, season, timezone: "UTC" } });
    return res.data?.response ?? [];
  }
  async fixtureById(id: number): Promise<AfFixture | null> {
    const res = await this.http.get("/fixtures", { params: { id, timezone: "UTC" } });
    const arr: AfFixture[] = res.data?.response ?? [];
    return arr[0] ?? null;
  }
  async oddsRange(leagueId: number, season: number, fromISO: string, toISO: string, page = 1) {
    const res = await this.http.get("/odds", {
      params: { league: leagueId, season, from: fromISO, to: toISO, page },
    });
    return {
      results: res.data?.response ?? [],
      paging: res.data?.paging ?? { current: page, total: 1 },
    };
  }
}
