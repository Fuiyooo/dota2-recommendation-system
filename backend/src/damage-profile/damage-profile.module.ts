import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { DamageProfileController } from "./damage-profile.controller";
import { DamageProfileService } from "./damage-profile.service";

@Module({
  imports: [PrismaModule],
  controllers: [DamageProfileController],
  providers: [DamageProfileService],
  exports: [DamageProfileService],
})
export class DamageProfileModule {}
