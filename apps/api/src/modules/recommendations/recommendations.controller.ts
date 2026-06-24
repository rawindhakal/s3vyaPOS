import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

class RecommendDto {
  @IsArray() @IsString({ each: true }) productIds!: string[];
}

@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(private prisma: PrismaService) {}

  // Upsell suggestions: items most often bought together with the current order,
  // falling back to popular items from other (complementary) categories.
  @Post()
  async recommend(@CurrentUser('shopId') shopId: string, @Body() dto: RecommendDto) {
    const limit = 4;
    const inOrder = new Set(dto.productIds);

    let rankedIds: string[] = [];

    if (dto.productIds.length) {
      // Sales that contained any of the current items.
      const seedItems = await this.prisma.saleItem.findMany({
        where: { productId: { in: dto.productIds }, sale: { shopId } },
        select: { saleId: true },
        take: 500,
      });
      const saleIds = [...new Set(seedItems.map((s) => s.saleId))];
      if (saleIds.length) {
        const others = await this.prisma.saleItem.findMany({
          where: { saleId: { in: saleIds }, productId: { notIn: dto.productIds } },
          select: { productId: true },
        });
        const freq = new Map<string, number>();
        for (const o of others) freq.set(o.productId, (freq.get(o.productId) ?? 0) + 1);
        rankedIds = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
      }
    }

    // Cold-start / not enough signal: popular items overall.
    if (rankedIds.length < limit) {
      const popular = await this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: { sale: { shopId } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 20,
      });
      for (const p of popular) if (!rankedIds.includes(p.productId)) rankedIds.push(p.productId);
    }

    const pickIds = rankedIds.filter((id) => !inOrder.has(id)).slice(0, limit);
    if (!pickIds.length) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: pickIds }, shopId, isActive: true },
      select: {
        id: true, name: true, salePrice: true, hasVariations: true,
        variations: { where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, salePrice: true } },
      },
    });
    // Preserve ranking order.
    const order = new Map(pickIds.map((id, i) => [id, i]));
    return products.sort((a, b) => (order.get(a.id)! - order.get(b.id)!));
  }
}
