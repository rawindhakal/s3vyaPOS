import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { BusinessType, PaymentMethod, PaymentProvider } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';

class UpdateShopDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(BusinessType) businessType?: BusinessType;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsNumber() @Min(0) taxRate?: number;
  @IsOptional() @IsNumber() @Min(0) serviceChargeRate?: number;
  @IsOptional() @IsNumber() @Min(0) loyaltyEarnRate?: number;
  @IsOptional() @IsBoolean() roundOff?: boolean;
  @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
}

@UseGuards(JwtAuthGuard)
@Controller('shop')
export class ShopController {
  constructor(private prisma: PrismaService) {}

  @Get()
  get(@CurrentUser('shopId') shopId: string) {
    return this.prisma.shop.findUnique({ where: { id: shopId } });
  }

  @Patch()
  update(@CurrentUser('shopId') shopId: string, @CurrentUser('role') role: string, @Body() dto: UpdateShopDto) {
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException('Not allowed');
    return this.prisma.shop.update({ where: { id: shopId }, data: dto });
  }
}

class PaymentChannelDto {
  @IsString() @MinLength(1) name!: string;
  @IsEnum(PaymentMethod) method!: PaymentMethod;
  @IsOptional() @IsEnum(PaymentProvider) provider?: PaymentProvider;
  @IsOptional() @IsString() qrImageUrl?: string;
  @IsOptional() @IsString() instructions?: string;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsInt() sortOrder?: number;
}
class UpdatePaymentChannelDto extends PaymentChannelDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller('payment-channels')
export class PaymentChannelController {
  constructor(private prisma: PrismaService) {}

  // Listed for everyone (the settlement screen needs it); mutations are admin-only.
  @Get()
  list(@CurrentUser('shopId') shopId: string) {
    return this.prisma.paymentChannel.findMany({ where: { shopId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  @Post()
  create(@CurrentUser('shopId') shopId: string, @CurrentUser('role') role: string, @Body() dto: PaymentChannelDto) {
    this.assertAdmin(role);
    return this.prisma.paymentChannel.create({ data: { shopId, ...dto } });
  }

  @Patch(':id')
  async update(@CurrentUser('shopId') shopId: string, @CurrentUser('role') role: string, @Param('id') id: string, @Body() dto: UpdatePaymentChannelDto) {
    this.assertAdmin(role);
    await this.ensure(shopId, id);
    return this.prisma.paymentChannel.update({ where: { id }, data: dto });
  }

  @Delete(':id')
  async remove(@CurrentUser('shopId') shopId: string, @CurrentUser('role') role: string, @Param('id') id: string) {
    this.assertAdmin(role);
    await this.ensure(shopId, id);
    await this.prisma.paymentChannel.delete({ where: { id } });
    return { ok: true };
  }

  private assertAdmin(role: string) {
    if (role !== 'ADMIN' && role !== 'MANAGER') throw new ForbiddenException('Only admins can manage payment methods');
  }
  private async ensure(shopId: string, id: string) {
    const c = await this.prisma.paymentChannel.findFirst({ where: { id, shopId } });
    if (!c) throw new ForbiddenException('Channel not found');
    return c;
  }
}
