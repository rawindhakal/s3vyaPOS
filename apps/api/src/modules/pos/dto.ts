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
import { PaymentMethod, PaymentProvider } from '@prisma/client';

export class SaleItemDto {
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() sku?: string;

  @IsNumber() @Min(0.001) quantity!: number;

  @IsOptional() @IsNumber() @Min(0) unitPrice?: number;
}

export class CreateSaleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];

  @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod;

  @IsOptional() @IsEnum(PaymentProvider) provider?: PaymentProvider;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsNumber() @Min(0) discount?: number;
  @IsOptional() @IsString() note?: string;
}
