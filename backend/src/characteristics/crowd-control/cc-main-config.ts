export type CcDispelType =
  | "STRONG"
  | "BASIC"
  | "UNDISPELLABLE"
  | "UNKNOWN";

export type CcMainControl = "HARD" | "SOFT";

export interface CcMainOverride {
  control: CcMainControl;
  field?: string;
  fixed?: number;
  minField?: string;
  maxField?: string;
  displayName?: string;
  dispelType?: CcDispelType;
  piercesImmunity?: boolean | null;
  aoe?: number;
  castRange?: number;
  noRange?: boolean;
  note: string;
}

/**
 * Ability yang memang menerapkan CC ke musuh, dengan field durasi yang sudah
 * diverifikasi manual. Dipakai untuk menimpa pemilihan field otomatis.
 */
export const CC_MAIN_OVERRIDES: Record<string, CcMainOverride> = {
  chaos_knight_chaos_bolt: {
    control: "HARD",
    minField: "stun_min",
    maxField: "stun_max",
    note: "Durasi stun memakai titik tengah stun_min dan stun_max.",
  },
  vengefulspirit_magic_missile: {
    control: "HARD",
    field: "magic_missile_stun",
    note: "Field durasi stun bernama magic_missile_stun.",
  },
  antimage_mana_void: {
    control: "HARD",
    field: "mana_void_ministun",
    note: "Ministun memakai field mana_void_ministun.",
  },
  alchemist_unstable_concoction: {
    control: "HARD",
    field: "max_stun",
    note: "Durasi stun maksimum saat brew penuh.",
  },
  riki_blink_strike: {
    control: "SOFT",
    field: "slow",
    note: "Slow singkat setelah teleport.",
  },
  void_spirit_astral_step: {
    control: "SOFT",
    field: "pop_damage_delay",
    note: "Slow dari void mark memakai pop_damage_delay.",
  },
  warlock_rain_of_chaos: {
    control: "HARD",
    field: "stun_duration",
    note: "Stun saat cast, bukan durasi golem.",
  },
  enchantress_enchant: {
    control: "SOFT",
    field: "slow_duration",
    note: "Slow Enchant, bukan durasi dominasi creep.",
  },
  broodmother_spawn_spiderlings: {
    control: "SOFT",
    field: "slow_duration",
    note: "Slow dari spiderling, bukan durasi summon.",
  },
  dark_seer_wall_of_replica: {
    control: "SOFT",
    field: "slow_duration",
    note: "Slow dari wall, bukan durasi wall.",
  },
  bounty_hunter_wind_walk: {
    control: "HARD",
    field: "stun_duration",
    castRange: 150,
    note: "Stun saat menyerang dari Wind Walk, range melee.",
  },
  invoker_ice_wall: {
    control: "SOFT",
    field: "slow_duration",
    note: "Slow Ice Wall, bukan durasi wall.",
  },
  undying_flesh_golem: {
    control: "SOFT",
    field: "slow_duration",
    note: "Slow aura, bukan durasi transformasi.",
  },
  arc_warden_spark_wraith: {
    control: "SOFT",
    field: "ministun_duration",
    note: "Slow dan ministun, bukan umur wraith.",
  },
  pangolier_gyroshell: {
    control: "HARD",
    field: "stun_duration",
    note: "Stun saat tabrakan, bukan durasi channel.",
  },
  terrorblade_reflection: {
    control: "SOFT",
    field: "illusion_duration",
    note: "Illusion Reflection memperlambat selama illusion hidup.",
  },
  rattletrap_battery_assault: {
    control: "HARD",
    fixed: 1.5,
    note: "Ministun 15 tick dengan asumsi 0,1 detik per tick.",
  },
  primal_beast_pulverize: {
    control: "HARD",
    fixed: 0.6,
    note: "Tiga ministun 0,2 detik selama channel.",
  },
  crystal_maiden_frostbite: {
    control: "SOFT",
    field: "duration",
    note: "Root, durasi dari field duration.",
  },
  invoker_cold_snap: {
    control: "HARD",
    field: "freeze_duration",
    note: "Stun dari freeze_duration.",
  },
  lone_druid_savage_roar: {
    control: "HARD",
    field: "duration",
    note: "Fear, durasi dari field duration.",
  },
  treant_overgrowth: {
    control: "SOFT",
    field: "duration",
    note: "Root, durasi dari field duration.",
  },
  grimstroke_soul_chain: {
    control: "SOFT",
    field: "chain_duration",
    note: "Leash dari chain_duration.",
  },
  dark_seer_vacuum: {
    control: "HARD",
    field: "duration",
    note: "Pull dan interrupt, durasi dari field duration.",
  },
  doom_bringer_doom: {
    control: "SOFT",
    field: "duration",
    note: "Mute dan heal block, bukan silence biasa.",
  },
  enigma_black_hole: {
    control: "HARD",
    field: "duration",
    note: "Channel disable, durasi dari field duration.",
  },
  bristleback_viscous_nasal_goo: {
    control: "SOFT",
    field: "goo_duration",
    note: "Slow gerak dari Goo.",
  },
  bane_fiends_grip: {
    control: "HARD",
    field: "AbilityChannelTime",
    note: "Channel disable, ditambah talent 3 detik.",
  },
  elder_titan_echo_stomp: {
    control: "HARD",
    field: "sleep_duration",
    note: "Sleep 4,4 detik, tanpa stun awal.",
  },
  faceless_void_time_lock: {
    control: "HARD",
    fixed: 0.5,
    noRange: true,
    note: "Time Lock memicu stun saat basic attack.",
  },
  dark_willow_terrorize: {
    control: "HARD",
    field: "destination_status_duration",
    note: "Fear memakai destination_status_duration.",
  },
  kez_shodo_sai: {
    control: "HARD",
    fixed: 0.8,
    noRange: true,
    note: "Stun Shodo Sai 0,8 detik.",
  },
  lich_sinister_gaze: {
    control: "HARD",
    field: "channel_duration",
    note: "Durasi channel Sinister Gaze.",
  },
  night_stalker_crippling_fear: {
    control: "SOFT",
    field: "duration_night",
    note: "Silence memakai durasi malam.",
  },
  night_stalker_void: {
    control: "HARD",
    field: "duration_night",
    note: "Mini-stun memakai durasi malam.",
  },
  faceless_void_chronosphere: {
    control: "HARD",
    field: "duration",
    note: "Chronosphere.",
  },
  naga_siren_ensnare: {
    control: "SOFT",
    field: "duration",
    note: "Root, mencegah movement dan blink.",
  },
  naga_siren_song_of_the_siren: {
    control: "HARD",
    field: "duration",
    note: "Sleep stasis.",
  },
  obsidian_destroyer_astral_imprisonment: {
    control: "HARD",
    field: "prison_duration",
    note: "Banish ke astral prison.",
  },
  phantom_lancer_spirit_lance: {
    control: "SOFT",
    field: "duration",
    note: "Slow dari Spirit Lance.",
  },
  legion_commander_duel: {
    control: "HARD",
    field: "duration",
    castRange: 200,
    note: "Duel, durasi 5 detik ditambah talent 0,75 detik.",
  },
  pudge_dismember: {
    control: "HARD",
    field: "AbilityChannelTime",
    note: "Channel disable, ditambah talent 0,75 detik.",
  },
  slardar_bash: {
    control: "HARD",
    fixed: 1,
    noRange: true,
    note: "Bash aktif pada hit ke-4 basic attack.",
  },
  nyx_assassin_spiked_carapace: {
    control: "HARD",
    field: "stun_duration",
    noRange: true,
    note: "Stun saat menerima hit musuh.",
  },
  nevermore_requiem: {
    control: "HARD",
    fixed: 2,
    note: "Fear Requiem of Souls 2 detik.",
  },
  winter_wyvern_winters_curse: {
    control: "HARD",
    field: "duration",
    note: "Taunt, durasi dasar 2 detik.",
  },
  visage_summon_familiars: {
    control: "HARD",
    fixed: 1.2,
    displayName: "Stone Form",
    dispelType: "STRONG",
    piercesImmunity: false,
    aoe: 375,
    castRange: 50,
    note: "Stun dari sub-ability Stone Form.",
  },
  morphling_adaptive_strike_agi: {
    control: "HARD",
    field: "stun_max",
    note: "Stun maksimum berdasarkan Strength.",
  },
  grimstroke_spirit_walk: {
    control: "HARD",
    field: "max_stun",
    note: "Stun maksimum Ink Swell.",
  },
  puck_dream_coil: {
    control: "HARD",
    field: "stun_duration",
    note: "Stun awal Dream Coil.",
  },
  spirit_breaker_charge_of_darkness: {
    control: "HARD",
    field: "stun_duration",
    note: "Greater Bash saat charge.",
  },
  spirit_breaker_greater_bash: {
    control: "HARD",
    field: "duration",
    noRange: true,
    note: "Bash passive saat menyerang.",
  },
  storm_spirit_electric_vortex: {
    control: "HARD",
    field: "AbilityDuration",
    castRange: 300,
    note: "Pull Electric Vortex.",
  },
  invoker_tornado: {
    control: "HARD",
    field: "lift_duration",
    note: "Cyclone, musuh terangkat di udara.",
  },
  sandking_burrowstrike: {
    control: "HARD",
    fixed: 1.8,
    note: "Stun Burrowstrike 1,8 detik.",
  },
  witch_doctor_paralyzing_cask: {
    control: "HARD",
    field: "hero_duration",
    note: "Stun Cask 0,8 detik.",
  },
  techies_suicide: {
    control: "HARD",
    field: "stun_duration",
    note: "Blast Off! masuk CC, bukan mobility.",
  },
};


/**
 * Ability yang tidak menerapkan CC ke musuh. Summon, transformasi, self-buff,
 * dan efek yang hanya menyebut kata CC di deskripsi.
 */
export const CC_MAIN_EXCLUDED = new Set<string>([
  "antimage_mana_break",
  "dragon_knight_breathe_fire",
  "dragon_knight_elder_dragon_form",
  "nyx_assassin_vendetta",
  "death_prophet_exorcism",
  "silencer_glaives_of_wisdom",
  "sven_gods_strength",
  "undying_tombstone",
  "lycan_shapeshift",
  "arc_warden_tempest_double",
  "ursa_overpower",
  "marci_unleash",
  "beastmaster_summon_razorback",
  "beastmaster_summon_raptor",
  "huskar_berserkers_blood",
  "silencer_brain_drain",
  "tusk_bitter_chill",
  "magnataur_solid_core",
  "sniper_assassinate",
  "drow_ranger_multishot",
  "faceless_void_distortion_field",
  "clinkz_strafe",
  "monkey_king_mischief",
  "ringmaster_summon_unicycle",
  "rattletrap_rocket_flare",
  "tiny_insurmountable",
  "tiny_grow",
  "brewmaster_liquid_courage",
  "lone_druid_spirit_bear",
  "dawnbreaker_luminosity",
  "dawnbreaker_break_of_dawn",
  "primal_beast_colossal",
  "obsidian_destroyer_sanity_eclipse",
  "largo_amphibian_rhapsody",
  "spirit_breaker_nether_strike",
  "chen_hand_of_god",
  "kez_falcon_rush",
  "legion_commander_overwhelming_odds",
  "lina_slow_burn",
  "lycan_howl",
  "morphling_ebb_and_flow",
  "oracle_fates_edict",
  "pangolier_lucky_shot",
  "ringmaster_the_box",
  "sandking_sand_storm",
  "skywrath_mage_arcane_bolt",
  "slardar_sprint",
  "sniper_take_aim",
  "spirit_breaker_bulldoze",
  "tinker_laser",
  "treant_leech_seed",
  "troll_warlord_battle_trance",
  "viper_nethertoxin",
  "viper_corrosive_skin",
  "keeper_of_the_light_blinding_light",
  "invoker_deafening_blast",
  "techies_reactive_tazer",
  "enchantress_untouchable",
  "dark_seer_surge",
  "largo_song_double_time",
  "pudge_rot",
  "omniknight_degen_aura",
  "invoker_ghost_walk",
  "troll_warlord_berserkers_rage",
]);

/**
 * Ability yang punya CC, tetapi durasinya belum bisa dipastikan dari data.
 * Kontribusinya 0 dan statusnya PARTIAL sampai field-nya diverifikasi.
 */
export const CC_MAIN_REVIEW: Record<string, string> = {
  pudge_rot: "Slow toggle, tidak punya durasi tetap.",
  omniknight_degen_aura: "Slow aura toggle, tidak punya durasi tetap.",
  invoker_ghost_walk: "Slow aura toggle selama buff aktif, bukan durasi debuff.",
  sandking_sand_storm: "Slow channel, bukan durasi debuff tunggal.",
};

export interface CcMainMetadata {
  cannotBeDispelled?: boolean;
  piercesImmunity?: boolean;
  notCc?: boolean;
}

/**
 * Hasil verifikasi manual per ability.
 * cannotBeDispelled memakai multiplier 1,0.
 * piercesImmunity menentukan multiplier Debuff Immunity: true 1,0, false 0,7.
 */
export const CC_MAIN_METADATA: Record<string, CcMainMetadata> = {
  pangolier_gyroshell: {
    cannotBeDispelled: true,
    piercesImmunity: false,
  },
  phoenix_supernova: {
    cannotBeDispelled: true,
    piercesImmunity: false,
  },
  tusk_snowball: {
    cannotBeDispelled: true,
    piercesImmunity: false,
  },
  medusa_stone_gaze: {
    cannotBeDispelled: true,
    piercesImmunity: false,
  },
  nyx_assassin_spiked_carapace: {
    cannotBeDispelled: true,
    piercesImmunity: false,
  },
  night_stalker_crippling_fear: {
    cannotBeDispelled: true,
    piercesImmunity: false,
  },
  necrolyte_reapers_scythe: {
    cannotBeDispelled: true,
    piercesImmunity: false,
  },
  luna_eclipse: {
    cannotBeDispelled: true,
    piercesImmunity: false,
  },
  spirit_breaker_bull_rush: {
    notCc: true,
  },
  axe_berserkers_call: {
    cannotBeDispelled: true,
    piercesImmunity: false,
  },
  kunkka_ghostship: {
    cannotBeDispelled: true,
    piercesImmunity: false,
  },
  shadow_demon_disruption: {
    cannotBeDispelled: true,
    piercesImmunity: false,
  },
  rattletrap_battery_assault: {
    cannotBeDispelled: true,
    piercesImmunity: false,
  },
  dazzle_nothl_projection: {
    cannotBeDispelled: true,
    piercesImmunity: false,
  },
  puck_dream_coil: {
    cannotBeDispelled: true,
    piercesImmunity: false,
  },
  bounty_hunter_wind_walk: {
    cannotBeDispelled: true,
    piercesImmunity: false,
  },
  enigma_black_hole: {
    cannotBeDispelled: true,
  },
  naga_siren_song_of_the_siren: {
    piercesImmunity: true,
  },
  winter_wyvern_winters_curse: {
    cannotBeDispelled: true,
  },
};

export interface CcAbilityConfigEntry {
  dispelType: CcDispelType;
  piercesImmunity: boolean | null;
}

export type CcAbilityConfigMap = Map<string, CcAbilityConfigEntry>;
