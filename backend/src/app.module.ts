import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module";
import { CcLabModule } from "./cc-lab/cc-lab.module";
import { CharacteristicsModule } from "./characteristics/characteristics.module";
import { DamageProfileModule } from "./damage-profile/damage-profile.module";
import { DataStatusModule } from "./data-status/data-status.module";
import { HeroesModule } from "./heroes/heroes.module";
import { MetaModule } from "./meta/meta.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SawModule } from "./saw/saw.module";
import { SyncModule } from "./sync/sync.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SyncModule,
    HeroesModule,
    MetaModule,
    DataStatusModule,
    CharacteristicsModule,
    SawModule,
    CcLabModule,
    DamageProfileModule,
    AdminModule,
  ],
})
export class AppModule {}
