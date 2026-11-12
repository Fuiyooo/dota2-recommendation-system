import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

function toBoolean({ value }: { value: unknown }): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  return value === "true" || value === "1";
}

export class CcLabOptionsDto {
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  useDebuffImmunity?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  assumeConditionMet?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  includeUnclassified?: boolean;

  @IsOptional()
  @IsIn(["A", "B", "C", "D"])
  preset?: "A" | "B" | "C" | "D";
}

export class CcImportDto {
  @IsString()
  csv!: string;
}
