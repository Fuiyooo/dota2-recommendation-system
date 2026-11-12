import { describe, expect, it } from "vitest";
import { calculateHeroCc } from "../src/cc-lab/cc-calculator";
import {
  CC_DEFAULT_MULTIPLIERS,
  CC_PRESETS,
} from "../src/cc-lab/cc-config";
import type { CcEffectResult, CcScenario } from "../src/cc-lab/cc-types";
import {
  CC_ACTIVE_REGISTRY,
  CC_EFFECT_REGISTRY,
} from "../src/cc-lab/cc-registry";
import type { AbilityData as CharacteristicAbility } from "../src/characteristics/types";

function special(
  name: string,
  values: number[],
  scepterValues: number[] = [],
  shardValues: number[] = [],
): {
  name: string;
  heading: string;
  values: number[];
  isPercentage: boolean;
  bonuses: never[];
  scepterValues: number[];
  shardValues: number[];
} {
  return {
    name,
    heading: "DURATION:",
    values,
    isPercentage: false,
    bonuses: [],
    scepterValues,
    shardValues,
  };
}

function ability(
  abilityKey: string,
  displayName: string,
  specialValues: ReturnType<typeof special>[],
): CharacteristicAbility {
  return {
    id: Math.floor(Math.random() * 100000),
    abilityKey,
    displayName,
    abilityType: "Active",
    isInnate: false,
    maxLevel: 4,
    damageType: null,
    talentLevel: null,
    linkedAbilityKey: null,
    specialValues,
    rawData: { desc_loc: "" },
    sortOrder: 0,
  } as unknown as CharacteristicAbility;
}

function hero(
  abilities: CharacteristicAbility[],
  localizedName = "Crystal Maiden",
) {
  return {
    id: 1,
    localizedName,
    primaryAttr: "INT",
    complexity: 1,
    abilities,
  };
}

const scenario = (overrides: Partial<CcScenario> = {}): CcScenario => ({
  useDebuffImmunityMultiplier: false,
  assumeConditionMet: true,
  ...overrides,
});

function effect(
  result: ReturnType<typeof calculateHeroCc>,
  id: string,
): CcEffectResult {
  const found = result.effects.find((item) => item.id === id);
  if (!found) throw new Error(`Effect ${id} tidak ditemukan`);
  return found;
}

describe("CC Lab formula", () => {
  it("menghitung silence basic dispellable", () => {
    const result = calculateHeroCc(
      hero([
        ability("death_prophet_silence", "Silence", [
          special("AbilityDuration", [5]),
        ]),
      ]),
      CC_DEFAULT_MULTIPLIERS,
      scenario({ useDebuffImmunityMultiplier: true }),
    );
    const silence = effect(result, "death_prophet_silence:silence");
    expect(silence.duration).toBe(5);
    expect(silence.rawContribution).toBeCloseTo(5 * 0.65 * 0.6 * 0.7, 6);
    expect(silence.status).toBe("SUPPORTED");
  });

  it("menghitung stun Magnus dengan strong dispel dan pierce", () => {
    const result = calculateHeroCc(
      hero([
        ability("magnataur_reverse_polarity", "Reverse Polarity", [
          special("hero_stun_duration", [2.5, 3, 3.5]),
        ]),
      ]),
      CC_DEFAULT_MULTIPLIERS,
      scenario({ useDebuffImmunityMultiplier: true }),
    );
    const stun = effect(result, "magnataur_reverse_polarity:stun");
    expect(stun.duration).toBe(3.5);
    expect(stun.rawContribution).toBeCloseTo(3.5 * 0.8, 6);
  });

  it("menghitung slow undispellable", () => {
    const result = calculateHeroCc(
      hero([
        ability("crystal_maiden_crystal_nova", "Crystal Nova", [
          special("duration", [4]),
        ]),
      ]),
      CC_DEFAULT_MULTIPLIERS,
      scenario({ useDebuffImmunityMultiplier: true }),
    );
    const slow = effect(result, "crystal_maiden_crystal_nova:slow");
    expect(slow.rawContribution).toBeCloseTo(4 * 0.3 * 0.6 * 0.7, 6);
  });
});

describe("CC Lab tanpa item", () => {
  it("memakai durasi base Flux dan mengabaikan silence Scepter", () => {
    const result = calculateHeroCc(
      hero([
        ability("arc_warden_flux", "Flux", [
          special("duration", [6], [2]),
          special("applies_silence", [0], [1]),
        ]),
      ]),
      CC_DEFAULT_MULTIPLIERS,
      scenario(),
    );
    expect(effect(result, "arc_warden_flux:slow").duration).toBe(6);
    expect(result.effects).toHaveLength(1);
    expect(result.totalCc).toBeCloseTo(6 * 0.3 * 0.6, 6);
  });

  it("hanya memakai entri BASE dari registry", () => {
    expect(
      CC_ACTIVE_REGISTRY.every(
        (entry) => (entry.upgradeType ?? "BASE") === "BASE",
      ),
    ).toBe(true);
    expect(
      CC_EFFECT_REGISTRY.some((entry) => entry.upgradeType === "SCEPTER"),
    ).toBe(true);
  });

  it("Magnus hanya memakai Reverse Polarity dan Skewer", () => {
    const magnus = hero([
      ability("magnataur_reverse_polarity", "Reverse Polarity", [
        special("hero_stun_duration", [2.5, 3, 3.5]),
      ]),
      ability("magnataur_horn_toss", "Horn Toss", [
        special("stun_duration", [0.75]),
        special("slow_duration", [2]),
      ]),
      ability("magnataur_skewer", "Skewer", [
        special("slow_duration", [3.25]),
      ]),
    ]);
    const result = calculateHeroCc(
      magnus,
      CC_DEFAULT_MULTIPLIERS,
      scenario(),
    );
    expect(result.totalCc).toBeCloseTo(3.385, 3);
    expect(result.effectCount).toBe(2);
    expect(
      result.effects.some((item) => item.abilityKey === "magnataur_horn_toss"),
    ).toBe(false);
  });

  it("menghitung tiga stun instance Enigma", () => {
    const enigma = hero([
      ability("enigma_malefice", "Malefice", [
        special("stun_duration", [0.3, 0.5, 0.7, 0.9], [], [0.3]),
      ]),
    ]);
    const result = calculateHeroCc(
      enigma,
      CC_DEFAULT_MULTIPLIERS,
      scenario(),
    );
    const stun = effect(result, "enigma_malefice:stun");
    expect(stun.instances).toBe(3);
    expect(stun.duration).toBe(0.9);
    expect(stun.end - stun.start).toBeCloseTo(2.7, 6);
    expect(result.totalCc).toBeCloseTo(0.9 * 3 * 0.6, 6);
  });

  it("memakai stun base Mars Spear", () => {
    const mars = hero([
      ability("mars_spear", "Spear", [
        special("stun_duration", [1.3, 1.6, 1.9, 2.2]),
        special("shard_debuff_linger_duration", [0], [], [2]),
      ]),
    ]);
    const result = calculateHeroCc(
      mars,
      CC_DEFAULT_MULTIPLIERS,
      scenario(),
    );
    expect(result.totalCc).toBeCloseTo(2.2 * 0.8, 6);
  });

  it("memakai stun base Fissure Earthshaker", () => {
    const earthshaker = hero([
      ability("earthshaker_fissure", "Fissure", [
        special("stun_duration", [1, 1.2, 1.4, 1.6]),
      ]),
    ]);
    const result = calculateHeroCc(
      earthshaker,
      CC_DEFAULT_MULTIPLIERS,
      scenario(),
    );
    expect(result.totalCc).toBeCloseTo(1.6 * 0.8, 6);
  });

  it("hero dengan efek Aghanim saja tidak terklasifikasi", () => {
    const sniper = hero(
      [
        ability("sniper_assassinate", "Assassinate", [
          special("scepter_stun_duration", [0], [1.2]),
        ]),
      ],
      "Sniper",
    );
    const result = calculateHeroCc(
      sniper,
      CC_DEFAULT_MULTIPLIERS,
      scenario(),
    );
    expect(result.effectCount).toBe(0);
    expect(result.classified).toBe(false);
    expect(result.totalCc).toBe(0);
  });
});

describe("CC Lab conditional dan unknown", () => {
  it("menandai efek kondisional sebagai PARTIAL saat kondisi tidak diasumsikan", () => {
    const result = calculateHeroCc(
      hero([
        ability("lion_mana_drain", "Mana Drain", [
          special("duration", [5]),
        ]),
      ]),
      CC_DEFAULT_MULTIPLIERS,
      scenario({ assumeConditionMet: false }),
    );
    const slow = effect(result, "lion_mana_drain:slow");
    expect(slow.rawContribution).toBeNull();
    expect(slow.status).toBe("PARTIAL");
  });

  it("tidak memakai multiplier default untuk dispel UNKNOWN", () => {
    const result = calculateHeroCc(
      hero([
        ability("lion_mana_drain", "Mana Drain", [
          special("duration", [5]),
        ]),
      ]),
      CC_DEFAULT_MULTIPLIERS,
      scenario(),
    );
    const slow = effect(result, "lion_mana_drain:slow");
    expect(slow.dispelType).toBe("UNKNOWN");
    expect(slow.rawContribution).toBeNull();
    expect(slow.status).toBe("PARTIAL");
  });

  it("tidak menghitung pierce UNKNOWN jika multiplier aktif", () => {
    const resultWithPierce = calculateHeroCc(
      hero([
        ability("furion_sprout", "Sprout", [special("duration", [4])]),
      ]),
      CC_DEFAULT_MULTIPLIERS,
      scenario({ useDebuffImmunityMultiplier: true }),
    );
    expect(
      effect(resultWithPierce, "furion_sprout:root").rawContribution,
    ).toBeNull();

    const resultWithoutPierce = calculateHeroCc(
      hero([
        ability("furion_sprout", "Sprout", [special("duration", [4])]),
      ]),
      CC_DEFAULT_MULTIPLIERS,
      scenario({ useDebuffImmunityMultiplier: false }),
    );
    expect(
      effect(resultWithoutPierce, "furion_sprout:root").rawContribution,
    ).toBeCloseTo(4 * 0.55, 6);
  });
});

describe("CC Lab overlap", () => {
  it("menggabungkan efek sama yang overlap", () => {
    const result = calculateHeroCc(
      hero([
        ability("lion_impale", "Impale", [special("duration", [2])]),
        ability("mars_spear", "Spear", [special("stun_duration", [2.2])]),
      ]),
      CC_DEFAULT_MULTIPLIERS,
      scenario(),
    );
    const stunGroup = result.overlapGroups.find(
      (group) => group.controlType === "STUN",
    );
    expect(stunGroup?.unionDuration).toBeCloseTo(2.2, 6);
    expect(stunGroup?.conflict).toBe(true);
  });
});

describe("CC Lab tanpa Aghanim", () => {
  it("tidak menghitung efek Scepter dan Shard", () => {
    const magnus = hero([
      ability("magnataur_reverse_polarity", "Reverse Polarity", [
        special("hero_stun_duration", [2.5, 3, 3.5]),
      ]),
      ability("magnataur_horn_toss", "Horn Toss", [
        special("stun_duration", [0.75]),
        special("slow_duration", [2]),
      ]),
      ability("magnataur_skewer", "Skewer", [
        special("slow_duration", [3.25]),
      ]),
    ]);
    const result = calculateHeroCc(
      magnus,
      CC_DEFAULT_MULTIPLIERS,
      scenario(),
    );
    expect(result.totalCc).toBeCloseTo(3.385, 3);
    expect(
      result.effects.every((item) => item.upgradeType === "BASE"),
    ).toBe(true);
  });
});

describe("CC Lab preset", () => {
  it("preset D memakai multiplier 1", () => {
    const preset = CC_PRESETS.find((item) => item.id === "D");
    expect(preset?.dispelMultiplier.BASIC_DISPELLABLE).toBe(1);
    expect(preset?.debuffImmunityMultiplier.DOES_NOT_PIERCE).toBe(1);
  });
});
