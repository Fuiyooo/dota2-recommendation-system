import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class MetaQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  position?: number;

  @IsOptional()
  @IsString()
  bracket?: string;

  @IsOptional()
  @IsIn(["STRATZ", "OPENDOTA_API"])
  source?: string;
}
