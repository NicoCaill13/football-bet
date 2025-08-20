import axios, { AxiosInstance } from "axios";

export type FdMatch = {
  id: number;
  utcDate: string;          // "2025-08-17T18:45:00Z"
  status: string;           // SCHEDULED|POSTPONED|FINISHED...
  matchday: number | null;  // 1..N
  stage?: string | null; 
  venue?: string | null;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
};

export class FootballDataClient {
  private http: AxiosInstance;

  constructor(token: string) {
    this.http = axios.create({
      baseURL: "https://api.football-data.org/v4",
      headers: { "X-Auth-Token": token },
      timeout: 20000,
    });
  }

  // Matches of a competition & season (e.g. FL1, season=2025)
  async matchesByCompetition(competitionCode: string, season: number): Promise<FdMatch[]> {
    const res = await this.http.get(`/competitions/${competitionCode}/matches`, {
      params: { season },
    });
    return res.data?.matches ?? [];
  }
}

