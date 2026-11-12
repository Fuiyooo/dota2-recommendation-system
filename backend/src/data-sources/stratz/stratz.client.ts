import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { curlJson } from "./curl-json";
import type { StratzPositionRow, StratzStatsResponse } from "./stratz.types";

const USER_AGENT =
  "dota2-recommendation/0.1 (academic research; meta snapshot)";

const ALLOWED_BRACKETS = new Set([
  "UNCALIBRATED",
  "HERALD_GUARDIAN",
  "CRUSADER_ARCHON",
  "LEGEND_ANCIENT",
  "DIVINE_IMMORTAL",
  "ALL",
]);

@Injectable()
export class StratzClient {
  constructor(private readonly config: ConfigService) {}

  bracket(): string {
    const configured = this.config.get<string>("STRATZ_BRACKET") ?? "DIVINE_IMMORTAL";
    return ALLOWED_BRACKETS.has(configured) ? configured : "DIVINE_IMMORTAL";
  }

  async fetchPositionStats(
    positions: number[] = [1, 2, 3, 4, 5],
  ): Promise<StratzPositionRow[]> {
    const token = this.config.get<string>("STRATZ_TOKEN");
    if (!token) {
      throw new Error(
        "STRATZ_TOKEN belum diisi di backend/.env. Snapshot meta tidak bisa dibuat.",
      );
    }

    const bracket = this.bracket();
    const positionList = positions
      .filter((position) => position >= 1 && position <= 5)
      .map((position) => `POSITION_${position}`)
      .join(", ");

    const query = `
      query HeroPositionSnapshot {
        heroStats {
          stats(
            bracketBasicIds: [${bracket}]
            positionIds: [${positionList}]
            groupByPosition: true
          ) {
            heroId
            position
            week
            matchCount
            winCount
          }
        }
      }
    `;

    const response = await curlJson({
      url: "https://api.stratz.com/graphql",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({ query }),
      timeoutSeconds: 60,
    });

    if (response.status !== 200) {
      throw new Error(
        `STRATZ API ${response.status}. Pastikan token valid dan User-Agent terkirim.`,
      );
    }

    const payload = JSON.parse(response.body) as StratzStatsResponse;
    if (payload.errors?.length) {
      throw new Error(
        `STRATZ GraphQL: ${payload.errors.map((item) => item.message).join("; ")}`,
      );
    }

    return payload.data?.heroStats?.stats ?? [];
  }
}
