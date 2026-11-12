import { Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CharacteristicsService } from "./characteristics.service";

@ApiTags("characteristics")
@Controller("characteristics")
export class CharacteristicsController {
  constructor(private readonly characteristics: CharacteristicsService) {}

  @Post("calculate")
  @ApiOperation({ summary: "Jalankan kalkulasi karakteristik seluruh hero" })
  calculate() {
    return this.characteristics.calculate();
  }

  @Get("heroes")
  @ApiOperation({ summary: "Skor karakteristik seluruh hero" })
  listHeroes() {
    return this.characteristics.listHeroes();
  }

  @Get("heroes/:heroId")
  @ApiOperation({ summary: "Skor karakteristik satu hero" })
  getHero(@Param("heroId", ParseIntPipe) heroId: number) {
    return this.characteristics.getHero(heroId);
  }

  @Get("heroes/:heroId/breakdown")
  @ApiOperation({ summary: "Rincian indikator satu hero" })
  getBreakdown(@Param("heroId", ParseIntPipe) heroId: number) {
    return this.characteristics.getBreakdown(heroId);
  }
}
