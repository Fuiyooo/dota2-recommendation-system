const CDN_BASE = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react";

export type AttributeKey = "STR" | "AGI" | "INT" | "UNIVERSAL";

const ATTRIBUTE_FILES: Record<AttributeKey, string> = {
  STR: "hero_strength",
  AGI: "hero_agility",
  INT: "hero_intelligence",
  UNIVERSAL: "hero_universal",
};

export function heroSlug(name: string): string {
  return name.replace(/^npc_dota_hero_/, "");
}

export function heroIconUrl(name: string): string {
  return `${CDN_BASE}/heroes/icons/${heroSlug(name)}.png`;
}

export function heroPortraitUrl(name: string): string {
  return `${CDN_BASE}/heroes/${heroSlug(name)}.png`;
}

export function attributeIconUrl(attribute: AttributeKey): string {
  return `${CDN_BASE}/icons/${ATTRIBUTE_FILES[attribute]}.png`;
}

export function abilityIconUrl(abilityKey: string): string {
  return `${CDN_BASE}/abilities/${abilityKey}.png`;
}
