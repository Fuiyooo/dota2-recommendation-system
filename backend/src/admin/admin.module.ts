import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { DamageProfileModule } from "../damage-profile/damage-profile.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminController } from "./admin.controller";
import { AdminGuard } from "./admin.guard";
import { AdminService } from "./admin.service";

@Module({
  imports: [
    PrismaModule,
    DamageProfileModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("ADMIN_JWT_SECRET");
        if (!secret && config.get<string>("NODE_ENV") === "production") {
          throw new Error("ADMIN_JWT_SECRET wajib diisi di production.");
        }
        return {
          secret: secret ?? "dev-only-insecure-secret",
          signOptions: { expiresIn: "8h" },
        };
      },
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
  exports: [AdminService],
})
export class AdminModule {}
