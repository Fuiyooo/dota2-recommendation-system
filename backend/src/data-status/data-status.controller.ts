import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DataStatusService } from "./data-status.service";

@ApiTags("data")
@Controller("data")
export class DataStatusController {
  constructor(private readonly status: DataStatusService) {}

  @Get("status")
  @ApiOperation({ summary: "Ringkasan sinkronisasi, sumber, dan validasi" })
  getStatus() {
    return this.status.getStatus();
  }

  @Get("sources")
  @ApiOperation({ summary: "Daftar sumber data dan status validasinya" })
  getSources() {
    return this.status.getSources();
  }

  @Get("patch")
  @ApiOperation({ summary: "Target patch dan hasil validasi" })
  getPatch() {
    return this.status.getPatch();
  }
}
