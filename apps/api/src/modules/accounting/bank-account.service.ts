import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BankAccountService {
  constructor(private prisma: PrismaService) {}

  list(shopId: string) {
    return this.prisma.bankAccount.findMany({
      where: { shopId },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(
    shopId: string,
    data: { name: string; bankName?: string; accountNumber?: string },
  ) {
    return this.prisma.bankAccount.create({
      data: {
        shopId,
        name: data.name,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
      },
    });
  }
}
