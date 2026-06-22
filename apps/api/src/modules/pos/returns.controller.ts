import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { ReturnsService } from './returns.service';

class ReturnItemDto {
  @IsString() saleItemId!: string;
  @IsNumber() @Min(0.001) quantity!: number;
}
class CreateReturnDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ReturnItemDto)
  items!: ReturnItemDto[];
  @IsEnum(PaymentMethod) refundMethod!: PaymentMethod;
  @IsOptional() @IsString() note?: string;
}

@UseGuards(JwtAuthGuard)
@Controller()
export class ReturnsController {
  constructor(private returns: ReturnsService) {}

  @Post('sales/:id/returns')
  create(
    @CurrentUser('shopId') shopId: string,
    @Param('id') saleId: string,
    @Body() dto: CreateReturnDto,
  ) {
    return this.returns.createReturn(shopId, saleId, dto);
  }

  @Get('returns')
  list(@CurrentUser('shopId') shopId: string) {
    return this.returns.list(shopId);
  }
}
