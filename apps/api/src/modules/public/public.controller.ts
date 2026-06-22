import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
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
import { OrderType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../restaurant/order.service';

class PublicItemDto {
  @IsString() productId!: string;
  @IsNumber() @Min(0.001) quantity!: number;
  @IsOptional() @IsString() note?: string;
}

class PublicOrderDto {
  @IsString() shopId!: string;
  @IsOptional() @IsString() tableId?: string;
  @IsEnum(OrderType) orderType!: OrderType;
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() phone?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PublicItemDto)
  items!: PublicItemDto[];
}

// Unauthenticated, customer-facing endpoints reached by scanning a table/shop QR.
@Controller('public')
export class PublicController {
  constructor(
    private prisma: PrismaService,
    private orders: OrderService,
  ) {}

  @Get('menu/:shopId')
  async menu(@Param('shopId') shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, name: true, currency: true, businessType: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    const [categories, products] = await Promise.all([
      this.prisma.category.findMany({ where: { shopId }, orderBy: { name: 'asc' } }),
      this.prisma.product.findMany({
        where: { shopId, isActive: true },
        select: { id: true, name: true, description: true, salePrice: true, categoryId: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return { shop, categories, products };
  }

  @Post('orders')
  place(@Body() dto: PublicOrderDto) {
    return this.orders.createWithItems(dto.shopId, {
      tableId: dto.tableId,
      orderType: dto.orderType,
      channel: dto.tableId ? 'QR' : 'ONLINE',
      customerName: dto.customerName,
      phone: dto.phone,
      items: dto.items,
    });
  }

  @Get('orders/:shopId/:id')
  async track(@Param('shopId') shopId: string, @Param('id') id: string) {
    const order = await this.orders.get(shopId, id);
    if (!order) throw new NotFoundException('Order not found');
    return { id: order.id, status: order.status, orderType: order.orderType, items: order.items };
  }
}
