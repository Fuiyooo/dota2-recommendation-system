import { Module } from "@nestjs/common";
import { ScoringModule } from "../scoring/scoring.module";
import { DamageProfileModule } from "../damage-profile/damage-profile.module";
import { CalculationController } from "./calculation.controller";
import { CharacteristicsController } from "./characteristics.controller";
import { CharacteristicsService } from "./characteristics.service";

@Module({
  imports: [ScoringModule, DamageProfileModule],
  controllers: [CharacteristicsController, CalculationController],
  providers: [CharacteristicsService],
  exports: [CharacteristicsService],
})
export class CharacteristicsModule {}
