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

export class SettleOrderDto {
  @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod;
  @IsOptional() @IsEnum(PaymentProvider) provider?: PaymentProvider;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsNumber() @Min(0) discount?: number;
}
