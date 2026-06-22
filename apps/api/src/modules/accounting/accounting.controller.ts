import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { AccountType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { AccountService } from './account.service';
import { JournalService } from './journal.service';
import { ReportsService } from './reports.service';

class CreateAccountDto {
  @IsString() @MinLength(1) code!: string;
  @IsString() @MinLength(2) name!: string;
  @IsEnum(AccountType) type!: AccountType;
}

@UseGuards(JwtAuthGuard)
@Controller('accounting')
export class AccountingController {
  constructor(
    private accounts: AccountService,
    private journal: JournalService,
    private reports: ReportsService,
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

  @Get('ledger/:accountId')
  ledger(
    @CurrentUser('shopId') shopId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.reports.getLedger(shopId, accountId);
  }
}
