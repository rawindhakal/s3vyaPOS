import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { PaymentsModule } from '../payments/payments.module';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';

@Module({
  imports: [AccountingModule, PaymentsModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class PosModule {}
