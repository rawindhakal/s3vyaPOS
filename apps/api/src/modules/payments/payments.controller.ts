import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

// Payment tracking — all sale payments with status (paid / pending / etc.).
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@CurrentUser('shopId') shopId: string, @Query('status') status?: string) {
    return this.prisma.payment.findMany({
      where: { shopId, ...(status ? { status: status as any } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { sale: { select: { invoiceNo: true, customer: { select: { name: true } } } } },
    });
  }
}
