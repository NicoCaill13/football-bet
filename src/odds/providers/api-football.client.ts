import axios, { AxiosInstance } from "axios";

export type AfFixture = {
  fixture: { id: number; date: string; timezone: string };
  teams: { home: { name: string }, away: { name: string } };
  league: { id: number; season: number };
};

export type AfOdds = {
  fixture: { id: number };
  league: { id: number; season: number };
  update?: string;
  bookmakers: Array<{
    id: number;
    name: string; // ex: Pinnacle, bet365, etc.
    bets: Array<{
      id: number;
      name: string; // "Match Winner" | "1X2" | ...
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

  /** Prochains fixtures via 'next' */
  async upcomingFixtures(leagueId: number, season: number, next: number): Promise<AfFixture[]> {
    const res = await this.http.get("/fixtures", { params: { league: leagueId, season, next, timezone: "UTC" } });
    return res.data?.response ?? [];
  }

  /** Fixtures par plage de dates (UTC) */
  async fixturesRange(leagueId: number, season: number, fromISO: string, toISO: string): Promise<AfFixture[]> {
    const res = await this.http.get("/fixtures", {
      params: { league: leagueId, season, from: fromISO, to: toISO, timezone: "UTC" },
    });
    return res.data?.response ?? [];
  }

  /** Détail d’un fixture par id */
  async fixtureById(id: number): Promise<AfFixture | null> {
    const res = await this.http.get("/fixtures", { params: { id, timezone: "UTC" } });
    const arr: AfFixture[] = res.data?.response ?? [];
    return arr[0] ?? null;
  }

  /** Odds sur plage de dates, paginé */
  async oddsRange(leagueId: number, season: number, fromISO: string, toISO: string, page = 1): Promise<{
    results: AfOdds[];
    paging: { current: number; total: number };
  }> {
    const res = await this.http.get("/odds", {
      params: { league: leagueId, season, from: fromISO, to: toISO, page },
    });
    return {
      results: res.data?.response ?? [],
      paging: res.data?.paging ?? { current: page, total: 1 },
    };
  }

  /** Odds d’un fixture (pré-match) */
  async oddsByFixture(fixtureId: number): Promise<AfOdds | null> {
    const res = await this.http.get("/odds", { params: { fixture: fixtureId } });
    const first = (res.data?.response ?? [])[0];
    return first ?? null;
  }
}
