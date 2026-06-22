import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { GiftCardsService } from './giftcards.service';

class IssueGiftCardDto {
  @IsString() @MinLength(3) code!: string;
  @IsNumber() @Min(1) amount!: number;
  @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() expiresAt?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('gift-cards')
export class GiftCardsController {
  constructor(private giftCards: GiftCardsService) {}

  @Get()
  list(@CurrentUser('shopId') shopId: string) {
    return this.giftCards.list(shopId);
  }

  @Get(':code')
  get(@CurrentUser('shopId') shopId: string, @Param('code') code: string) {
    return this.giftCards.getByCode(shopId, code);
  }

  @Post()
  issue(@CurrentUser('shopId') shopId: string, @Body() dto: IssueGiftCardDto) {
    return this.giftCards.issue(shopId, dto);
  }
}
