import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { OrderType, PaymentMethod, PaymentProvider, TableStatus } from '@prisma/client';

export class CreateTableDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() area?: string;
  @IsOptional() @IsInt() @Min(1) seats?: number;
}

export class UpdateTableDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() area?: string;
  @IsOptional() @IsInt() @Min(1) seats?: number;
  @IsOptional() @IsEnum(TableStatus) status?: TableStatus;
}

export class CreateOrderDto {
  @IsOptional() @IsString() tableId?: string;
  @IsEnum(OrderType) orderType!: OrderType;
}

export class OrderItemDto {
  @IsString() productId!: string;
  @IsNumber() @Min(0.001) quantity!: number;
  @IsOptional() @IsString() note?: string;
}

export class SetOrderItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}

export class SettlePaymentDto {
  @IsEnum(PaymentMethod) method!: PaymentMethod;
  @IsOptional() @IsEnum(PaymentProvider) provider?: PaymentProvider;
  @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsString() cardCode?: string;
}

export class SettleOrderDto {
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @IsEnum(PaymentProvider) provider?: PaymentProvider;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettlePaymentDto)
  payments?: SettlePaymentDto[];

  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsNumber() @Min(0) discount?: number;
  @IsOptional() @IsNumber() @Min(0) redeemPoints?: number;
  @IsOptional() @IsNumber() @Min(0) tip?: number;
}
