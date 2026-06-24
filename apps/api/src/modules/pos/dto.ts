import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod, PaymentProvider } from '@prisma/client';

export class SaleItemDto {
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() variationId?: string;

  @IsNumber() @Min(0.001) quantity!: number;

  @IsOptional() @IsNumber() @Min(0) unitPrice?: number;
  @IsOptional() @IsNumber() @Min(0) discount?: number; // per-line discount amount
  @IsOptional() @IsArray() @IsString({ each: true }) modifierIds?: string[];
}

export class PaymentSplitDto {
  @IsEnum(PaymentMethod) method!: PaymentMethod;
  @IsOptional() @IsEnum(PaymentProvider) provider?: PaymentProvider;
  @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsString() cardCode?: string; // for GIFT_CARD tender
}

export class CreateSaleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];

  // Single payment (back-compat) ...
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @IsEnum(PaymentProvider) provider?: PaymentProvider;

  // ... or split payments.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentSplitDto)
  payments?: PaymentSplitDto[];

  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsNumber() @Min(0) discount?: number; // bill-level discount amount
  @IsOptional() @IsNumber() @Min(0) discountPct?: number; // bill-level discount %
  @IsOptional() @IsNumber() @Min(0) serviceChargeRate?: number; // override shop default %
  @IsOptional() @IsNumber() @Min(0) redeemPoints?: number; // loyalty points to redeem
  @IsOptional() @IsNumber() @Min(0) tip?: number;
  @IsOptional() @IsBoolean() roundOff?: boolean;
  @IsOptional() @IsString() note?: string;
}
