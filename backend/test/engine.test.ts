import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  ValvePatchNotesResponse,
} from "../src/data-sources/valve/valve.types";
import {
  buildMetaStatDrafts,
  positionNumber,
} from "../src/sync/meta-sync.service";
import { collectPatchChanges } from "../src/sync/patch-validation.service";
import { numberValues, sameNumberArray } from "../src/sync/utils";

const notes = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "valve-patch-7.41f.json"), "utf8"),
) as ValvePatchNotesResponse;

describe("patch 7.41f", () => {
  it("berisi 35 hero yang berubah", () => {
    expect(notes.heroes).toHaveLength(35);
  });

  it("mengumpulkan catatan hero dan ability", () => {
    const changes = collectPatchChanges("7.41f", notes);
    expect(changes.length).toBeGreaterThan(35);
    expect(
      changes.some(
        (change) =>
          change.kind === "ability_note" &&
          change.abilityValveId === 5003 &&
          change.heroId === 1,
      ),
    ).toBe(true);
    expect(
      changes.some(
        (change) =>
          change.kind === "hero_note" && change.heroId === 3,
      ),
    ).toBe(true);
  });
});

describe("snapshot meta", () => {
  it("memetakan posisi STRATZ ke angka", () => {
    expect(positionNumber("POSITION_1")).toBe(1);
    expect(positionNumber("POSITION_5")).toBe(5);
    expect(positionNumber("UNKNOWN")).toBeNull();
  });

  it("menghitung pick rate dari total match per posisi", () => {
    const drafts = buildMetaStatDrafts(
      [
        {
          heroId: 1,
          position: "POSITION_2",
          week: 10,
          matchCount: 60,
          winCount: 30,
        },
        {
          heroId: 2,
          position: "POSITION_2",
          week: 10,
          matchCount: 40,
          winCount: 20,
        },
        {
          heroId: 3,
          position: "POSITION_1",
          week: 10,
          matchCount: 100,
          winCount: 55,
        },
      ],
      "DIVINE_IMMORTAL",
      "week 10",
    );

    const mid = drafts.filter((draft) => draft.position === 2);
    expect(mid[0].pickRate).toBeCloseTo(0.6, 6);
    expect(mid[1].pickRate).toBeCloseTo(0.4, 6);
    expect(mid[0].winRate).toBeCloseTo(0.5, 6);
    expect(mid[1].winRate).toBeCloseTo(0.5, 6);

    const carry = drafts.find((draft) => draft.position === 1);
    expect(carry?.pickRate).toBeCloseTo(1, 6);
  });

  it("mengabaikan posisi yang tidak dikenal", () => {
    const drafts = buildMetaStatDrafts(
      [
        {
          heroId: 1,
          position: "UNKNOWN",
          week: 10,
          matchCount: 10,
          winCount: 5,
        },
      ],
      "DIVINE_IMMORTAL",
      "week 10",
    );
    expect(drafts).toHaveLength(0);
  });
});

describe("util angka", () => {
  it("membaca nilai numerik OpenDota", () => {
    expect(numberValues(["80", "125", "170"])).toEqual([80, 125, 170]);
    expect(numberValues("60")).toEqual([60]);
  });

  it("membandingkan array angka dengan toleransi", () => {
    expect(sameNumberArray([1, 2, 3], [1, 2, 3.0001])).toBe(true);
    expect(sameNumberArray([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(sameNumberArray([1], [1, 2])).toBe(false);
  });
});
