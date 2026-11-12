import { Module } from "@nestjs/common";
import { DataStatusController } from "./data-status.controller";
import { DataStatusService } from "./data-status.service";

@Module({
  controllers: [DataStatusController],
  providers: [DataStatusService],
})
export class DataStatusModule {}
