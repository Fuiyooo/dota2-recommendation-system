import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  DAMAGE_TYPES,
  SECONDARY_TYPES,
} from "../damage-profile/damage-profile.types";

export class AdminLoginDto {
  @IsString()
  @MinLength(1)
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class DamageProfileUpdateDto {
  @IsIn(DAMAGE_TYPES)
  main!: string;

  @IsIn(SECONDARY_TYPES)
  secondary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class DamageProfileRowDto extends DamageProfileUpdateDto {
  @IsInt()
  heroId!: number;
}

export class DamageProfileBulkDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DamageProfileRowDto)
  rows!: DamageProfileRowDto[];
}

export class CcAbilityUpdateDto {
  @IsIn(["STRONG", "BASIC", "UNDISPELLABLE", "UNKNOWN"])
  dispelType!: string;

  @IsIn(["YES", "NO", "UNKNOWN"])
  piercesImmunity!: string;
}

export class CcAbilityRowDto extends CcAbilityUpdateDto {
  @IsInt()
  abilityId!: number;
}

export class CcAbilityBulkDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CcAbilityRowDto)
  rows!: CcAbilityRowDto[];
}
