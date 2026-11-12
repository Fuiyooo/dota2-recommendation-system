import { Module } from "@nestjs/common";
import { SawController } from "./saw.controller";
import { SawService } from "./saw.service";

@Module({
  controllers: [SawController],
  providers: [SawService],
})
export class SawModule {}
