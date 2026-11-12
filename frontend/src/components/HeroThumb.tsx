import type { HeroSummary } from "../api/types";
import { heroPortraitUrl } from "../utils/dotaAssets";
import { GameImage } from "./GameImage";

export const HERO_THUMB_WIDTH = 64;
export const HERO_THUMB_HEIGHT = 36;

interface HeroThumbProps {
  hero?: HeroSummary;
  width?: number;
  height?: number;
}

export function HeroThumb({
  hero,
  width = HERO_THUMB_WIDTH,
  height = HERO_THUMB_HEIGHT,
}: HeroThumbProps) {
  return (
    <GameImage
      src={hero ? heroPortraitUrl(hero.name) : undefined}
      width={width}
      height={height}
    />
  );
}
