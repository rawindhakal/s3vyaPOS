import { Injectable } from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccountService {
  constructor(private prisma: PrismaService) {}

  listChartOfAccounts(shopId: string) {
    return this.prisma.account.findMany({
      where: { shopId },
      orderBy: { code: 'asc' },
    });
  }

  createAccount(
    shopId: string,
    data: { code: string; name: string; type: AccountType },
  ) {
    return this.prisma.account.create({
      data: { shopId, code: data.code, name: data.name, type: data.type },
    });
  }
}
