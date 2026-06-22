import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { AccountType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { AccountService } from './account.service';
import { JournalService } from './journal.service';
import { ReportsService } from './reports.service';
import { BankAccountService } from './bank-account.service';

class CreateAccountDto {
  @IsString() @MinLength(1) code!: string;
  @IsString() @MinLength(2) name!: string;
  @IsEnum(AccountType) type!: AccountType;
}

class CreateBankAccountDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() accountNumber?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('accounting')
export class AccountingController {
  constructor(
    private accounts: AccountService,
    private journal: JournalService,
    private reports: ReportsService,
    private bankAccounts: BankAccountService,
  ) {}

  @Get('accounts')
  chart(@CurrentUser('shopId') shopId: string) {
    return this.accounts.listChartOfAccounts(shopId);
  }

  @Post('accounts')
  createAccount(@CurrentUser('shopId') shopId: string, @Body() dto: CreateAccountDto) {
    return this.accounts.createAccount(shopId, dto);
  }

  @Get('journal')
  journalEntries(@CurrentUser('shopId') shopId: string) {
    return this.journal.listEntries(shopId);
  }

  @Get('reports/trial-balance')
  trialBalance(@CurrentUser('shopId') shopId: string) {
    return this.reports.getTrialBalance(shopId);
  }

  @Get('reports/balance-sheet')
  balanceSheet(@CurrentUser('shopId') shopId: string) {
    return this.reports.getBalanceSheet(shopId);
  }

  @Get('reports/income-statement')
  incomeStatement(@CurrentUser('shopId') shopId: string) {
    return this.reports.getIncomeStatement(shopId);
  }

  @Get('reports/cash-book')
  cashBook(@CurrentUser('shopId') shopId: string) {
    return this.reports.getCashBook(shopId);
  }

  @Get('reports/bank-book')
  bankBook(@CurrentUser('shopId') shopId: string) {
    return this.reports.getBankBook(shopId);
  }

  @Get('reports/day-end')
  dayEnd(
    @CurrentUser('shopId') shopId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.getDayEnd(shopId, from, to);
  }

  @Get('reports/tax-summary')
  taxSummary(
    @CurrentUser('shopId') shopId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.getTaxSummary(shopId, from, to);
  }

  @Get('ledger/:accountId')
  ledger(
    @CurrentUser('shopId') shopId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.reports.getLedger(shopId, accountId);
  }

  // ── Bank accounts ──
  @Get('bank-accounts')
  listBankAccounts(@CurrentUser('shopId') shopId: string) {
    return this.bankAccounts.list(shopId);
  }

  @Post('bank-accounts')
  createBankAccount(
    @CurrentUser('shopId') shopId: string,
    @Body() dto: CreateBankAccountDto,
  ) {
    return this.bankAccounts.create(shopId, dto);
  }
}
