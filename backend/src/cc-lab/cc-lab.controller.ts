import {
  Body,
  Controller,
  Res,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CcImportDto, CcLabOptionsDto } from "./cc-lab.dto";
import { CcLabService } from "./cc-lab.service";
import type { Response } from "express";

@ApiTags("cc-lab")
@Controller("cc-lab")
export class CcLabController {
  constructor(private readonly ccLab: CcLabService) {}

  @Get("config")
  @ApiOperation({ summary: "Konfigurasi dan preset CC Lab" })
  getConfig() {
    return this.ccLab.getConfig();
  }

  @Get("heroes")
  @ApiOperation({ summary: "Perhitungan CC eksperimen seluruh hero" })
  heroes(@Query() options: CcLabOptionsDto) {
    return this.ccLab.heroes(options);
  }

  @Get("heroes/:heroId")
  @ApiOperation({ summary: "Breakdown efek CC satu hero" })
  hero(
    @Param("heroId", ParseIntPipe) heroId: number,
    @Query() options: CcLabOptionsDto,
  ) {
    return this.ccLab.hero(heroId, options);
  }

  @Get("abilities")
  @ApiOperation({ summary: "Registry efek CC dan ability terkait" })
  abilities() {
    return this.ccLab.abilities();
  }

  @Get("audit")
  @ApiOperation({
    summary: "Audit upgrade Scepter dan Shard, dikecualikan dari perhitungan",
  })
  audit() {
    return this.ccLab.audit();
  }

  @Get("verification/export")
  @ApiOperation({ summary: "Unduh CSV verifikasi CC" })
  async exportVerification(@Res() response: Response) {
    const csv = await this.ccLab.exportVerificationCsv();
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="cc-verification.csv"',
    );
    response.send(csv);
  }

  @Post("verification/import")
  @ApiOperation({ summary: "Impor CSV verifikasi CC" })
  importVerification(@Body() body: CcImportDto) {
    return this.ccLab.importVerificationCsv(body.csv);
  }

  @Post("calculate")
  @ApiOperation({ summary: "Hitung CC dengan skenario atau preset" })
  calculate(@Body() options: CcLabOptionsDto) {
    return this.ccLab.calculate(options);
  }

  @Post("sensitivity")
  @ApiOperation({ summary: "Bandingkan preset multiplier A sampai D" })
  sensitivity(@Body() options: CcLabOptionsDto) {
    return this.ccLab.sensitivity(options);
  }
}
