import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { StationType } from '@prisma/client';

export class CreateProductDto {
  @IsString() @MinLength(1) name!: string;

  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() unit?: string;

  @IsOptional() @IsNumber() @Min(0) purchasePrice?: number;
  @IsOptional() @IsNumber() @Min(0) salePrice?: number;
  @IsOptional() @IsNumber() @Min(0) stock?: number;
  @IsOptional() @IsNumber() @Min(0) taxRate?: number;
  @IsOptional() @IsNumber() @Min(0) reorderLevel?: number;
  @IsOptional() @IsEnum(StationType) station?: StationType;
}

export class UpdateProductDto extends CreateProductDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
}
