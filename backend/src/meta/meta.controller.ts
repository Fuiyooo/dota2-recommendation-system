import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { MetaQueryDto } from "./meta-query.dto";
import { MetaService } from "./meta.service";

@ApiTags("meta")
@Controller("meta")
export class MetaController {
  constructor(private readonly meta: MetaService) {}

  @Get("heroes")
  @ApiOperation({ summary: "Statistik meta dari snapshot aktif" })
  overview(@Query() query: MetaQueryDto) {
    return this.meta.overview(query);
  }

  @Get("heroes/:heroId")
  @ApiOperation({ summary: "Statistik meta satu hero" })
  forHero(
    @Param("heroId", ParseIntPipe) heroId: number,
    @Query() query: MetaQueryDto,
  ) {
    return this.meta.forHero(heroId, query);
  }

  @Get("heroes/:heroId/positions")
  @ApiOperation({ summary: "Statistik hero per posisi" })
  positions(
    @Param("heroId", ParseIntPipe) heroId: number,
    @Query() query: MetaQueryDto,
  ) {
    return this.meta.positions(heroId, query);
  }
}
