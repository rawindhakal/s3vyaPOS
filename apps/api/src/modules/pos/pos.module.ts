import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { PaymentsModule } from '../payments/payments.module';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';

@Module({
  imports: [AccountingModule, PaymentsModule],
  controllers: [SalesController, ReturnsController],
  providers: [SalesService, ReturnsService],
  exports: [SalesService],
})
export class PosModule {}
