import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async list(shopId: string, search?: string) {
    return this.prisma.product.findMany({
      where: {
        shopId,
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      include: { category: true },
    });
  }

  // Inventory valuation at latest cost (stock * purchasePrice).
  async valuation(shopId: string) {
    const products = await this.prisma.product.findMany({
      where: { shopId, isActive: true },
      orderBy: { name: 'asc' },
    });
    const rows = products.map((p) => {
      const stock = Number(p.stock);
      const cost = Number(p.purchasePrice);
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        stock,
        unitCost: cost,
        value: Math.round(stock * cost * 100) / 100,
      };
    });
    const totalValue = Math.round(rows.reduce((s, r) => s + r.value, 0) * 100) / 100;
    return { rows, totalValue };
  }

  async findByCode(shopId: string, code: string) {
    return this.prisma.product.findFirst({
      where: {
        shopId,
        isActive: true,
        OR: [{ barcode: code }, { sku: code }],
      },
    });
  }

  async create(shopId: string, dto: CreateProductDto) {
    const sku = dto.sku?.trim() || (await this.nextSku(shopId));
    return this.prisma.product.create({
      data: {
        shopId,
        sku,
        barcode: dto.barcode?.trim() || null,
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId || null,
        unit: dto.unit ?? 'pcs',
        purchasePrice: dto.purchasePrice ?? 0,
        salePrice: dto.salePrice ?? 0,
        stock: dto.stock ?? 0,
        taxRate: dto.taxRate ?? 0,
      },
    });
  }

  async update(shopId: string, id: string, dto: UpdateProductDto) {
    await this.ensure(shopId, id);
    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        barcode: dto.barcode?.trim() || null,
        description: dto.description,
        categoryId: dto.categoryId || null,
        unit: dto.unit,
        purchasePrice: dto.purchasePrice,
        salePrice: dto.salePrice,
        stock: dto.stock,
        taxRate: dto.taxRate,
        isActive: dto.isActive,
      },
    });
  }

  private async ensure(shopId: string, id: string) {
    const p = await this.prisma.product.findFirst({ where: { id, shopId } });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  // Sequential per-shop SKU: SKU-0001, SKU-0002, ...
  private async nextSku(shopId: string) {
    const count = await this.prisma.product.count({ where: { shopId } });
    let n = count + 1;
    // guard against collisions if SKUs were deleted/renamed
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const sku = `SKU-${String(n).padStart(4, '0')}`;
      const exists = await this.prisma.product.findUnique({
        where: { shopId_sku: { shopId, sku } },
        select: { id: true },
      });
      if (!exists) return sku;
      n += 1;
    }
  }
}
