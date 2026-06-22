import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class PurchaseItemDto {
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() name?: string; // create product if not found

  @IsNumber() @Min(0.001) quantity!: number;
  @IsNumber() @Min(0) unitCost!: number;
}

export class CreatePurchaseDto {
  @IsOptional() @IsString() vendorId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items!: PurchaseItemDto[];

  @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod;
  @IsOptional() @IsNumber() @Min(0) discount?: number;
  @IsOptional() @IsNumber() @Min(0) tax?: number;
  @IsOptional() @IsString() note?: string;
}
