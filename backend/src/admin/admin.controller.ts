import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import {
  AdminGuard,
  ADMIN_COOKIE,
  ADMIN_SESSION_HOURS,
  type AdminRequest,
} from "./admin.guard";
import {
  AdminLoginDto,
  CcAbilityBulkDto,
  CcAbilityUpdateDto,
  DamageProfileBulkDto,
  DamageProfileUpdateDto,
} from "./admin.dto";
import { AdminService } from "./admin.service";

@ApiTags("admin")
@Controller("admin")
export class AdminController {
  private readonly secureCookie: boolean;

  constructor(
    private readonly admin: AdminService,
    config: ConfigService,
  ) {
    this.secureCookie = config.get<string>("NODE_ENV") === "production";
  }

  @Post("login")
  @ApiOperation({ summary: "Login admin" })
  async login(
    @Body() body: AdminLoginDto,
    @Req() request: AdminRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.admin.login(
      body.username,
      body.password,
      request.ip ?? "unknown",
    );
    this.setSession(response, result.token);
    return { username: result.username };
  }

  @Post("logout")
  @ApiOperation({ summary: "Logout admin" })
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(ADMIN_COOKIE, { path: "/api" });
    return { ok: true };
  }

  @Get("session")
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Sesi admin aktif" })
  session(@Req() request: AdminRequest) {
    return { username: request.admin?.username ?? null };
  }

  @Get("damage-profiles")
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Daftar profil damage untuk admin" })
  profiles() {
    return this.admin.listProfiles();
  }

  @Patch("damage-profiles/:heroId")
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Ubah profil damage satu hero" })
  updateProfile(
    @Param("heroId", ParseIntPipe) heroId: number,
    @Body() body: DamageProfileUpdateDto,
  ) {
    return this.admin.updateProfile(heroId, body);
  }

  @Get("cc-abilities")
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Daftar ability CC dan pengaturan dispel" })
  ccAbilities() {
    return this.admin.listCcAbilities();
  }

  @Patch("cc-abilities/:abilityId")
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Ubah dispel dan pierce satu ability CC" })
  updateCcAbility(
    @Param("abilityId", ParseIntPipe) abilityId: number,
    @Body() body: CcAbilityUpdateDto,
  ) {
    return this.admin.updateCcAbility(abilityId, body);
  }

  @Post("cc-abilities/bulk")
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Simpan banyak pengaturan ability CC" })
  bulkCcAbilities(@Body() body: CcAbilityBulkDto) {
    return this.admin.bulkCcAbilities(body.rows);
  }

  @Post("damage-profiles/bulk")
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: "Simpan banyak profil damage" })
  bulkProfiles(@Body() body: DamageProfileBulkDto) {
    return this.admin.bulkProfiles(body.rows);
  }

  private setSession(response: Response, token: string): void {
    response.cookie(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: this.secureCookie,
      path: "/api",
      maxAge: ADMIN_SESSION_HOURS * 60 * 60 * 1000,
    });
  }
}
