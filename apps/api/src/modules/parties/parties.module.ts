import { Module } from '@nestjs/common';
import { AccountingModule } from '../accounting/accounting.module';
import { VendorService } from './vendor.service';
import { CustomerService } from './customer.service';
import { SettlementService } from './settlement.service';
import { PartiesController } from './parties.controller';

@Module({
  imports: [AccountingModule],
  controllers: [PartiesController],
  providers: [VendorService, CustomerService, SettlementService],
  exports: [VendorService, CustomerService],
})
export class PartiesModule {}
