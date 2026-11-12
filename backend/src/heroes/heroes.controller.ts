import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { HeroesService } from "./heroes.service";

@ApiTags("heroes")
@Controller("heroes")
export class HeroesController {
  constructor(private readonly heroes: HeroesService) {}

  @Get()
  @ApiOperation({ summary: "Daftar seluruh hero" })
  findAll() {
    return this.heroes.findAll();
  }

  @Get(":heroId")
  @ApiOperation({ summary: "Detail hero beserta ability dan talent" })
  findOne(@Param("heroId", ParseIntPipe) heroId: number) {
    return this.heroes.findOne(heroId);
  }

  @Get(":heroId/abilities")
  @ApiOperation({ summary: "Ability dan talent milik hero" })
  findAbilities(@Param("heroId", ParseIntPipe) heroId: number) {
    return this.heroes.findAbilities(heroId);
  }
}
