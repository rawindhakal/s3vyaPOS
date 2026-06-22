import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JournalService } from '../accounting/journal.service';
import { ACCOUNT_CODES } from '../accounting/chart-of-accounts';

const round = (n: number) => Math.round(n * 1000) / 1000;

@Injectable()
export class StockService {
  constructor(
    private prisma: PrismaService,
    private journal: JournalService,
  ) {}

  // Manual stock adjustment (+/-) — no ledger posting (count correction).
  async adjust(shopId: string, productId: string, delta: number, reason?: string) {
    const p = await this.prisma.product.findFirst({ where: { id: productId, shopId } });
    if (!p) throw new NotFoundException('Product not found');
    if (Number(p.stock) + delta < 0) throw new BadRequestException('Adjustment would make stock negative');
    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: productId }, data: { stock: { increment: delta } } });
      await tx.stockMovement.create({
        data: { shopId, productId, type: 'ADJUSTMENT', quantity: round(delta), reason },
      });
      return tx.product.findUnique({ where: { id: productId } });
    });
  }

  // Waste/spoilage — decrement stock and expense the cost: Dr Wastage, Cr Inventory.
  async waste(shopId: string, productId: string, quantity: number, reason?: string) {
    if (quantity <= 0) throw new BadRequestException('Quantity must be positive');
    const p = await this.prisma.product.findFirst({ where: { id: productId, shopId } });
    if (!p) throw new NotFoundException('Product not found');
    if (Number(p.stock) < quantity) throw new BadRequestException('Not enough stock to waste');
    const cost = Math.round(Number(p.purchasePrice) * quantity * 100) / 100;

    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: productId }, data: { stock: { decrement: quantity } } });
      await tx.stockMovement.create({
        data: { shopId, productId, type: 'WASTE', quantity: round(-quantity), reason },
      });
      if (cost > 0) {
        await this.journal.postJournalEntry(
          {
            shopId,
            description: `Wastage: ${p.name}${reason ? ` (${reason})` : ''}`,
            source: 'ADJUSTMENT',
            lines: [
              { accountCode: ACCOUNT_CODES.WASTAGE, debit: cost },
              { accountCode: ACCOUNT_CODES.INVENTORY, credit: cost },
            ],
          },
          tx,
        );
      }
      return tx.product.findUnique({ where: { id: productId } });
    });
  }

  movements(shopId: string, productId?: string, take = 100) {
    return this.prisma.stockMovement.findMany({
      where: { shopId, ...(productId ? { productId } : {}) },
      orderBy: { createdAt: 'desc' },
      take,
      include: { product: { select: { name: true, sku: true } } },
    });
  }

  async lowStock(shopId: string) {
    const products = await this.prisma.product.findMany({
      where: { shopId, isActive: true, reorderLevel: { gt: 0 } },
      orderBy: { name: 'asc' },
    });
    return products
      .filter((p) => Number(p.stock) <= Number(p.reorderLevel))
      .map((p) => ({ id: p.id, name: p.name, sku: p.sku, stock: Number(p.stock), reorderLevel: Number(p.reorderLevel), unit: p.unit }));
  }
}
