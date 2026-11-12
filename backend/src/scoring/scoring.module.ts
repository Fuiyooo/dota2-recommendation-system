import { Module } from "@nestjs/common";
import { DamageProfileModule } from "../damage-profile/damage-profile.module";
import { ScoringService } from "./scoring.service";

@Module({
  imports: [DamageProfileModule],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
