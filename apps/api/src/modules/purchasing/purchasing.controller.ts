import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { PurchasingService } from './purchasing.service';
import { CreatePurchaseDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('purchases')
export class PurchasingController {
  constructor(private purchasing: PurchasingService) {}

  @Post()
  create(@CurrentUser('shopId') shopId: string, @Body() dto: CreatePurchaseDto) {
    return this.purchasing.createPurchase(shopId, dto);
  }

  @Get()
  list(@CurrentUser('shopId') shopId: string) {
    return this.purchasing.list(shopId);
  }
}
