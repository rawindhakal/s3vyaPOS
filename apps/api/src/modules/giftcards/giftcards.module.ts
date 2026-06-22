import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { GiftCardsService } from './giftcards.service';
import { GiftCardsController } from './giftcards.controller';

@Module({
  imports: [AccountingModule],
  controllers: [GiftCardsController],
  providers: [GiftCardsService],
})
export class GiftCardsModule {}
