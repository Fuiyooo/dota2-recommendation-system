import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SawWeightsDto } from "./saw.dto";
import { SawService } from "./saw.service";

@ApiTags("saw")
@Controller("saw")
export class SawController {
  constructor(private readonly saw: SawService) {}

  @Post("calculate")
  @ApiOperation({ summary: "Hitung SAW dan simpan ranking" })
  calculate(@Body() weights: SawWeightsDto) {
    return this.saw.calculate(weights);
  }

  @Post("rankings")
  @ApiOperation({ summary: "Hitung ranking berdasarkan bobot" })
  rankings(@Body() weights: SawWeightsDto) {
    return this.saw.calculate(weights);
  }

  @Get("rankings")
  @ApiOperation({ summary: "Ranking SAW terakhir" })
  getRankings() {
    return this.saw.getLatest();
  }

  @Get("heroes/:heroId")
  @ApiOperation({ summary: "Hasil SAW satu hero" })
  getHero(@Param("heroId", ParseIntPipe) heroId: number) {
    return this.saw.getHero(heroId);
  }
}
