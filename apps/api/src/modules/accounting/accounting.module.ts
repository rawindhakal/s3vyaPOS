import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { JournalService } from './journal.service';
import { ReportsService } from './reports.service';
import { BankAccountService } from './bank-account.service';
import { AccountingController } from './accounting.controller';

@Module({
  controllers: [AccountingController],
  providers: [AccountService, JournalService, ReportsService, BankAccountService],
  exports: [JournalService, AccountService],
})
export class AccountingModule {}
