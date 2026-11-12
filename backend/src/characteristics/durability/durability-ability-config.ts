export interface DurabilityAbilityRule {
  armorFields?: string[];
  hpRegenFields?: string[];
  magicResistanceFields?: string[];
  fixedHp?: number;
  fixedArmor?: number;
}

/**
 * Ability pasif atau innate yang memberi bonus durability permanen.
 * Ability aktif, aura temporer, dan efek kondisional tidak masuk daftar ini.
 */
export const DURABILITY_ABILITY_RULES: Record<string, DurabilityAbilityRule> = {
  dragon_knight_dragon_blood: {
    armorFields: ["armor"],
    hpRegenFields: ["health_regen"],
  },
  antimage_counterspell: {
    magicResistanceFields: ["magic_resistance"],
  },
  viper_corrosive_skin: {
    magicResistanceFields: ["bonus_magic_resistance"],
  },
  lycan_feral_impulse: {
    hpRegenFields: ["bonus_hp_regen"],
  },
  tiny_grow: {
    armorFields: ["bonus_armor"],
  },
  tidehunter_leviathans_catch: {
    fixedHp: 30,
  },
  huskar_berserkers_blood: {
    magicResistanceFields: ["maximum_magic_resist"],
  },
  largo_amphibian_rhapsody: {
    fixedArmor: 20,
  },
  monkey_king_wukongs_command: {
    fixedArmor: 25,
  },
};

/**
 * Ability yang tidak dihitung dalam skor durability karena efeknya temporer,
 * shield/barrier, atau bukan durability diri sendiri. Medusa Mana Shield
 * ditangani terpisah.
 */
export const DURABILITY_EXCLUDED = new Set<string>([
  "abaddon_aphotic_shield",
  "abyssal_underlord_atrophy_aura",
  "alchemist_corrosive_weaponry",
  "axe_berserkers_call",
  "axe_culling_blade",
  "bloodseeker_sanguivore",
  "brewmaster_drunken_brawler",
  "bristleback_prickly",
  "bristleback_quill_spray",
  "broodmother_incapacitating_bite",
  "clinkz_death_pact",
  "dazzle_poison_touch",
  "death_prophet_exorcism",
  "ember_spirit_flame_guard",
  "io_overcharge",
  "juggernaut_blade_fury",
  "kez_raptor_dance",
  "juggernaut_healing_ward",
  "legion_commander_outfight_them",
  "life_stealer_feast",
  "life_stealer_rage",
  "marci_bodyguard",
  "marci_special_delivery",
  "mars_bulwark",
  "medusa_mana_shield",
  "nevermore_requiem",
  "oracle_false_promise",
  "pangolier_gyroshell",
  "phoenix_sun_ray",
  "treant_living_armor",
  "undying_flesh_golem",
  "ursa_enrage",
  "shadow_shaman_fowl_play",
  "sandking_caustic_finale",
  "wisp_overcharge",
  "huskar_blood_magic",
  "huskar_burning_spear",
  "huskar_life_break",
  "techies_land_mines",
  "visage_gravekeepers_cloak",
  "viper_poison_attack",
  "windrunner_windrun",
  "hoodwink_scurry",
  "chen_divine_favor",
  "dark_seer_aggrandize",
  "dark_willow_pixie_dust",
  "jakiro_double_trouble",
  "lone_druid_spirit_bear",
  "lone_druid_true_form",
  "lycan_howl",
  "necrolyte_heartstopper_aura",
  "naga_siren_eelskin",
  "omniknight_martyr",
  "phantom_assassin_immaterial",
  "phantom_lancer_phantom_edge",
  "primal_beast_colossal",
  "puck_puckish",
  "ringmaster_the_box",
  "abyssal_underlord_raid_boss",
]);
