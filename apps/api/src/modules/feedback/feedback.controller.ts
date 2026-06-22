import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(@CurrentUser('shopId') shopId: string) {
    return this.prisma.feedback.findMany({ where: { shopId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  @Get('summary')
  async summary(@CurrentUser('shopId') shopId: string) {
    const rows = await this.prisma.feedback.findMany({ where: { shopId }, select: { rating: true } });
    const count = rows.length;
    const avg = count ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 100) / 100 : 0;
    const distribution = [1, 2, 3, 4, 5].map((star) => ({ star, count: rows.filter((r) => r.rating === star).length }));
    return { count, avg, distribution };
  }
}
