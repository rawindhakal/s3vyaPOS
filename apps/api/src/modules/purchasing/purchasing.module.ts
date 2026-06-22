import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { PurchasingService } from './purchasing.service';
import { PurchasingController } from './purchasing.controller';

@Module({
  imports: [AccountingModule],
  controllers: [PurchasingController],
  providers: [PurchasingService],
})
export class PurchasingModule {}
