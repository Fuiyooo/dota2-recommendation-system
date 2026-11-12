import { Injectable } from "@nestjs/common";
import type {
  OpenDotaAbilities,
  OpenDotaHeroes,
} from "./opendota.types";

const USER_AGENT =
  "dota2-recommendation/0.1 (academic research; data sync)";

@Injectable()
export class OpenDotaClient {
  private readonly apiBase = "https://api.opendota.com/api";

  fetchHeroes(): Promise<OpenDotaHeroes> {
    return this.getJson<OpenDotaHeroes>(`${this.apiBase}/constants/heroes`);
  }

  fetchAbilities(): Promise<OpenDotaAbilities> {
    return this.getJson<OpenDotaAbilities>(`${this.apiBase}/constants/abilities`);
  }

  async fetchConstantsCommit(): Promise<string> {
    try {
      const response = await fetch(
        "https://api.github.com/repos/odota/dotaconstants/commits?per_page=1",
        {
          headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": USER_AGENT,
          },
          signal: AbortSignal.timeout(15000),
        },
      );

      if (!response.ok) return "UNKNOWN";
      const data = (await response.json()) as Array<{ sha?: string }>;
      return data[0]?.sha ?? "UNKNOWN";
    } catch {
      return "UNKNOWN";
    }
  }

  private async getJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`OpenDota API ${response.status} untuk ${url}`);
    }

    return (await response.json()) as T;
  }
}
