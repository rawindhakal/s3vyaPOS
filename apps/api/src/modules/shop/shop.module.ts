import { Module } from '@nestjs/common';
import { ShopController, PaymentChannelController } from './shop.controller';

@Module({
  controllers: [ShopController, PaymentChannelController],
})
export class ShopModule {}
