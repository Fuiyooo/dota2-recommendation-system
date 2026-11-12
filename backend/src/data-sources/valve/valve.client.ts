import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  ValveHeroDataResponse,
  ValveHeroListResponse,
  ValvePatchListResponse,
  ValvePatchNotesResponse,
} from "./valve.types";

const USER_AGENT =
  "dota2-recommendation/0.1 (academic research; data sync)";
const RETRY_DELAYS_MS = [800, 1600, 3200, 5000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class ValveClient {
  private readonly baseUrl = "https://www.dota2.com/datafeed";

  constructor(private readonly config: ConfigService) {}

  fetchHeroList(locale = this.locale()): Promise<ValveHeroListResponse> {
    return this.getJson<ValveHeroListResponse>(
      `${this.baseUrl}/herolist?language=${encodeURIComponent(locale)}`,
    );
  }

  fetchHeroData(
    heroId: number,
    locale = this.locale(),
  ): Promise<ValveHeroDataResponse> {
    return this.fetchHeroDataWithShapeCheck(heroId, locale);
  }

  private async fetchHeroDataWithShapeCheck(
    heroId: number,
    locale: string,
  ): Promise<ValveHeroDataResponse> {
    const url = `${this.baseUrl}/herodata?language=${encodeURIComponent(locale)}&hero_id=${heroId}`;
    let lastError: unknown;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const response = await this.getJson<ValveHeroDataResponse>(url);
        if (response?.result?.data?.heroes?.[0]) {
          return response;
        }
        lastError = new Error(
          `Valve Datafeed mengembalikan data kosong untuk hero ${heroId}`,
        );
      } catch (error) {
        lastError = error;
      }

      await sleep(1000 * (attempt + 1));
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Hero ${heroId} tidak dapat diambil`);
  }

  fetchPatchList(locale = this.locale()): Promise<ValvePatchListResponse> {
    return this.getJson<ValvePatchListResponse>(
      `${this.baseUrl}/patchnoteslist?language=${encodeURIComponent(locale)}`,
    );
  }

  fetchPatchNotes(
    version: string,
    locale = this.locale(),
  ): Promise<ValvePatchNotesResponse> {
    return this.getJson<ValvePatchNotesResponse>(
      `${this.baseUrl}/patchnotes?version=${encodeURIComponent(version)}&language=${encodeURIComponent(locale)}`,
    );
  }

  private locale(): string {
    return this.config.get<string>("VALVE_LOCALE") ?? "english";
  }

  private async getJson<T>(url: string): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": USER_AGENT,
          },
          signal: AbortSignal.timeout(20000),
        });

        if (!response.ok) {
          throw new Error(`Valve Datafeed ${response.status} untuk ${url}`);
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error;
        const delay = RETRY_DELAYS_MS[attempt];
        if (delay === undefined) break;
        await sleep(delay);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Valve Datafeed tidak dapat diakses");
  }
}
