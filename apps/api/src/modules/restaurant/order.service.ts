import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SalesService } from '../pos/sales.service';
import { CreateOrderDto, SetOrderItemsDto, SettleOrderDto } from './dto';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private sales: SalesService,
  ) {}

  async create(shopId: string, dto: CreateOrderDto) {
    if (dto.tableId) {
      const table = await this.prisma.restaurantTable.findFirst({
        where: { id: dto.tableId, shopId },
      });
      if (!table) throw new NotFoundException('Table not found');
      const existing = await this.prisma.order.findFirst({
        where: { shopId, tableId: dto.tableId, status: 'OPEN' },
      });
      if (existing) return this.get(shopId, existing.id);
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: { shopId, tableId: dto.tableId, orderType: dto.orderType },
      });
      if (dto.tableId) {
        await tx.restaurantTable.update({
          where: { id: dto.tableId },
          data: { status: 'OCCUPIED' },
        });
      }
      return created;
    });
    return this.get(shopId, order.id);
  }

  get(shopId: string, id: string) {
    return this.prisma.order.findFirst({
      where: { id, shopId },
      include: { items: true, table: true },
    });
  }

  // Create an order with its items in one shot (used by QR/online self-ordering).
  async createWithItems(
    shopId: string,
    dto: {
      tableId?: string;
      orderType: 'DINE_IN' | 'TAKEAWAY' | 'COUNTER';
      channel?: string;
      customerName?: string;
      phone?: string;
      items: { productId: string; quantity: number; note?: string }[];
    },
  ) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order has no items');
    }
    if (dto.tableId) {
      const table = await this.prisma.restaurantTable.findFirst({ where: { id: dto.tableId, shopId } });
      if (!table) throw new NotFoundException('Table not found');
    }
    const products = await this.prisma.product.findMany({
      where: { shopId, id: { in: dto.items.map((i) => i.productId) }, isActive: true },
    });
    const map = new Map(products.map((p) => [p.id, p]));
    for (const i of dto.items) {
      if (!map.has(i.productId)) throw new BadRequestException(`Product not found: ${i.productId}`);
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          shopId,
          tableId: dto.tableId,
          orderType: dto.orderType,
          channel: dto.channel ?? 'QR',
          customerName: dto.customerName,
          phone: dto.phone,
          items: {
            create: dto.items.map((i) => {
              const p = map.get(i.productId)!;
              return { productId: p.id, name: p.name, quantity: i.quantity, unitPrice: p.salePrice, note: i.note };
            }),
          },
        },
      });
      if (dto.tableId) {
        await tx.restaurantTable.update({ where: { id: dto.tableId }, data: { status: 'OCCUPIED' } });
      }
      return created;
    });
    return this.get(shopId, order.id);
  }

  async getOpenForTable(shopId: string, tableId: string) {
    const order = await this.prisma.order.findFirst({
      where: { shopId, tableId, status: 'OPEN' },
      include: { items: true, table: true },
    });
    return order ?? null;
  }

  // Open orders for the kitchen display / active orders list.
  listOpen(shopId: string) {
    return this.prisma.order.findMany({
      where: { shopId, status: 'OPEN' },
      orderBy: { createdAt: 'asc' },
      include: { items: true, table: true },
    });
  }

  // Replace the order's item list (cart-style save from the order screen).
  async setItems(shopId: string, orderId: string, dto: SetOrderItemsDto) {
    const order = await this.ensureOpen(shopId, orderId);

    const products = await this.prisma.product.findMany({
      where: { shopId, id: { in: dto.items.map((i) => i.productId) } },
    });
    const map = new Map(products.map((p) => [p.id, p]));
    for (const item of dto.items) {
      if (!map.has(item.productId)) {
        throw new BadRequestException(`Product not found: ${item.productId}`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: order.id } });
      if (dto.items.length > 0) {
        await tx.orderItem.createMany({
          data: dto.items.map((i) => {
            const p = map.get(i.productId)!;
            return {
              orderId: order.id,
              productId: p.id,
              name: p.name,
              quantity: i.quantity,
              unitPrice: p.salePrice,
              note: i.note,
            };
          }),
        });
      }
    });
    return this.get(shopId, order.id);
  }

  // Settle: turn the order into a Sale (reusing the double-entry sale flow),
  // mark the order settled and free the table.
  async settle(shopId: string, orderId: string, dto: SettleOrderDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, shopId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'OPEN') throw new BadRequestException('Order is not open');
    if (order.items.length === 0) throw new BadRequestException('Order has no items');

    const sale = await this.sales.createSale(shopId, {
      items: order.items.map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
      })),
      paymentMethod: dto.paymentMethod,
      provider: dto.provider,
      payments: dto.payments,
      customerId: dto.customerId,
      discount: dto.discount,
      redeemPoints: dto.redeemPoints,
      note: `Order ${order.id}${order.tableId ? ' (dine-in)' : ''}`,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'SETTLED', saleId: sale?.id },
      });
      if (order.tableId) {
        await tx.restaurantTable.update({
          where: { id: order.tableId },
          data: { status: 'FREE' },
        });
      }
    });

    return sale;
  }

  async cancel(shopId: string, orderId: string) {
    const order = await this.ensureOpen(shopId, orderId);
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
      if (order.tableId) {
        await tx.restaurantTable.update({
          where: { id: order.tableId },
          data: { status: 'FREE' },
        });
      }
    });
    return { ok: true };
  }

  private async ensureOpen(shopId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, shopId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'OPEN') throw new BadRequestException('Order is not open');
    return order;
  }
}
