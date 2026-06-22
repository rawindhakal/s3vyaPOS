import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class RecipeService {
  constructor(private prisma: PrismaService) {}

  async getRecipe(shopId: string, productId: string) {
    const components = await this.prisma.recipeComponent.findMany({
      where: { shopId, productId },
      include: { component: { select: { id: true, name: true, unit: true, purchasePrice: true } } },
    });
    const cost = round2(
      components.reduce((s, c) => s + Number(c.component.purchasePrice) * Number(c.quantity), 0),
    );
    return { productId, components, cost };
  }

  // Replace a product's recipe with the given components.
  async setRecipe(
    shopId: string,
    productId: string,
    components: { componentId: string; quantity: number }[],
  ) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, shopId } });
    if (!product) throw new BadRequestException('Product not found');
    const ids = components.map((c) => c.componentId);
    if (ids.includes(productId)) throw new BadRequestException('A product cannot be its own ingredient');
    const found = await this.prisma.product.count({ where: { shopId, id: { in: ids } } });
    if (found !== new Set(ids).size) throw new BadRequestException('Unknown ingredient');

    await this.prisma.$transaction(async (tx) => {
      await tx.recipeComponent.deleteMany({ where: { shopId, productId } });
      if (components.length > 0) {
        await tx.recipeComponent.createMany({
          data: components.map((c) => ({ shopId, productId, componentId: c.componentId, quantity: c.quantity })),
        });
      }
    });
    return this.getRecipe(shopId, productId);
  }

  // Food-cost report for all products that have a recipe.
  async foodCostReport(shopId: string) {
    const products = await this.prisma.product.findMany({
      where: { shopId, isActive: true, recipe: { some: {} } },
      include: { recipe: { include: { component: { select: { purchasePrice: true } } } } },
      orderBy: { name: 'asc' },
    });
    return products.map((p) => {
      const cost = round2(p.recipe.reduce((s, c) => s + Number(c.component.purchasePrice) * Number(c.quantity), 0));
      const price = Number(p.salePrice);
      return {
        id: p.id,
        name: p.name,
        salePrice: price,
        foodCost: cost,
        margin: round2(price - cost),
        foodCostPct: price > 0 ? round2((cost / price) * 100) : 0,
      };
    });
  }
}
