import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CharacteristicsService } from "./characteristics.service";

@ApiTags("calculation")
@Controller("calculation")
export class CalculationController {
  constructor(private readonly characteristics: CharacteristicsService) {}

  @Get("status")
  @ApiOperation({ summary: "Status kalkulasi terakhir" })
  getStatus() {
    return this.characteristics.getStatus();
  }

  @Get("versions")
  @ApiOperation({ summary: "Versi konfigurasi perhitungan" })
  getVersions() {
    return this.characteristics.getVersions();
  }
}
