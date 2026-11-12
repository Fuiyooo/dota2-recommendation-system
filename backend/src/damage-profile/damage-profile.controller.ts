import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DamageProfileService } from "./damage-profile.service";

@ApiTags("damage-profile")
@Controller("damage-profiles")
export class DamageProfileController {
  constructor(private readonly profiles: DamageProfileService) {}

  @Get()
  @ApiOperation({ summary: "Profil main dan secondary damage seluruh hero" })
  list() {
    return this.profiles.publicList();
  }
}
