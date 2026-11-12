import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { OpenDotaHeroes } from "../src/data-sources/opendota/opendota.types";
import type { ValveHeroDataResponse } from "../src/data-sources/valve/valve.types";
import {
  mapAttackType,
  mapDamageType,
  mapPrimaryAttr,
  normalizeHeroBundle,
} from "../src/sync/normalizers";

function fixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(join(__dirname, "fixtures", name), "utf8"),
  ) as T;
}

const linaResponse = fixture<ValveHeroDataResponse>("valve-lina.json");
const antiMageResponse = fixture<ValveHeroDataResponse>("valve-antimage.json");
const opendotaHeroes = fixture<OpenDotaHeroes>("opendota-heroes.json");

const lina = linaResponse.result.data.heroes[0];
const antiMage = antiMageResponse.result.data.heroes[0];

describe("pemetaan enum", () => {
  it("memetakan primary attribute", () => {
    expect(mapPrimaryAttr(0)).toBe("STR");
    expect(mapPrimaryAttr(1)).toBe("AGI");
    expect(mapPrimaryAttr(2)).toBe("INT");
    expect(mapPrimaryAttr(3)).toBe("UNIVERSAL");
  });

  it("memetakan attack type dari attack_capability", () => {
    expect(mapAttackType(1)).toBe("Melee");
    expect(mapAttackType(2)).toBe("Ranged");
  });

  it("memetakan damage type Valve", () => {
    expect(mapDamageType(0)).toBeNull();
    expect(mapDamageType(1)).toBe("Physical");
    expect(mapDamageType(2)).toBe("Magical");
    expect(mapDamageType(3)).toBe("Pure");
  });
});

describe("normalisasi hero Lina", () => {
  const bundle = normalizeHeroBundle(lina, opendotaHeroes["25"]);

  it("memakai atribut Valve meskipun dotaconstants berbeda", () => {
    expect(bundle.hero.id).toBe(25);
    expect(bundle.hero.localizedName).toBe("Lina");
    expect(bundle.hero.primaryAttr).toBe("INT");
    expect(bundle.hero.attackType).toBe("Ranged");
    expect(opendotaHeroes["25"].base_int).toBe(30);
    expect(bundle.hero.baseInt).toBe(28);
    expect(bundle.hero.intGain).toBe(4);
  });

  it("mengenali innate, passive, active, dan ultimate", () => {
    const byKey = Object.fromEntries(
      bundle.abilities.map((ability) => [ability.abilityKey, ability]),
    );
    expect(byKey["lina_dragon_slave"].abilityType).toBe("Active");
    expect(byKey["lina_fiery_soul"].abilityType).toBe("Passive");
    expect(byKey["lina_slow_burn"].abilityType).toBe("Innate");
    expect(byKey["lina_slow_burn"].isInnate).toBe(true);
    expect(byKey["lina_laguna_blade"].abilityType).toBe("Ultimate");
  });

  it("menyimpan nilai special ability dari patch 7.41f", () => {
    const lsa = bundle.abilities.find(
      (ability) => ability.abilityKey === "lina_light_strike_array",
    );
    const damage = lsa?.specialValues.find(
      (value) => value.name === "light_strike_array_damage",
    );
    expect(damage?.values).toEqual([80, 125, 170, 215]);
  });

  it("menggabungkan nilai talent dari bonuses ability", () => {
    const talent = bundle.talents.find(
      (item) => item.abilityKey === "special_bonus_unique_lina_3",
    );
    expect(talent?.talentLevel).toBe(15);
    expect(talent?.linkedAbilityKey).toBe("lina_light_strike_array");
    expect(talent?.displayName).toContain("110");
    expect(
      talent?.specialValues.bonusRefs.some(
        (ref) =>
          ref.abilityKey === "lina_light_strike_array" && ref.value === 110,
      ),
    ).toBe(true);
  });

  it("menghasilkan 8 talent pada empat tier", () => {
    expect(bundle.talents).toHaveLength(8);
    expect(bundle.talents.map((item) => item.talentLevel)).toEqual([
      10, 10, 15, 15, 20, 20, 25, 25,
    ]);
  });

  it("menyimpan urutan ability dan talent", () => {
    expect(bundle.abilities.map((item) => item.sortOrder)).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
    expect(bundle.talents[0].sortOrder).toBe(100);
  });
});

describe("normalisasi hero Anti-Mage", () => {
  const bundle = normalizeHeroBundle(antiMage, opendotaHeroes["1"]);

  it("mengenali hero melee", () => {
    expect(bundle.hero.attackType).toBe("Melee");
    expect(bundle.hero.primaryAttr).toBe("AGI");
  });

  it("mengenali innate Anti-Mage", () => {
    const innate = bundle.abilities.find(
      (ability) => ability.abilityKey === "antimage_persectur",
    );
    expect(innate?.abilityType).toBe("Innate");
  });
});
