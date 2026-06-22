import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { BusinessType } from '@prisma/client';
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
  update(@CurrentUser('shopId') shopId: string, @Body() dto: UpdateShopDto) {
    return this.prisma.shop.update({ where: { id: shopId }, data: dto });
  }
}
