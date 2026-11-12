import type { HeroSummary } from "../api/types";
import { heroPortraitUrl } from "../utils/dotaAssets";
import { GameImage } from "./GameImage";

interface HeroThumbProps {
  hero?: HeroSummary;
  width?: number;
  height?: number;
}

export function HeroThumb({ hero, width = 40, height = 24 }: HeroThumbProps) {
  return (
    <GameImage
      src={hero ? heroPortraitUrl(hero.name) : undefined}
      width={width}
      height={height}
    />
  );
}
