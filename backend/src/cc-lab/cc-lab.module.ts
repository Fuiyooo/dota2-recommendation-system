import { Module } from "@nestjs/common";
import { CcLabController } from "./cc-lab.controller";
import { CcLabService } from "./cc-lab.service";

@Module({
  controllers: [CcLabController],
  providers: [CcLabService],
})
export class CcLabModule {}
