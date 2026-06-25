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

  async create(shopId: string, dto: CreateOrderDto, userId?: string) {
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
        data: { shopId, tableId: dto.tableId, orderType: dto.orderType, waiterId: userId },
      });
      await tx.orderLog.create({ data: { shopId, orderId: created.id, userId, action: 'CREATED' } });
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

  // Waiter sends the order to the kitchen: queue it for printing on the cashier device.
  async sendToKitchen(shopId: string, orderId: string, userId?: string) {
    const order = await this.ensureOpen(shopId, orderId);
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { kotPending: true, kotVersion: { increment: 1 } },
      });
      await tx.orderItem.updateMany({ where: { orderId: order.id, sent: false }, data: { sent: true } });
      await tx.orderLog.create({ data: { shopId, orderId: order.id, userId, action: 'SENT_KOT' } });
    });
    return this.get(shopId, order.id);
  }

  // Orders queued for KOT printing (polled by the cashier/kitchen device).
  listPendingKot(shopId: string) {
    return this.prisma.order.findMany({
      where: { shopId, kotPending: true, status: 'OPEN' },
      orderBy: { updatedAt: 'asc' },
      include: { items: true, table: true, waiter: { select: { fullName: true } } },
    });
  }

  async markKotPrinted(shopId: string, orderId: string) {
    await this.prisma.order.updateMany({ where: { id: orderId, shopId }, data: { kotPending: false } });
    return { ok: true };
  }

  listLogs(shopId: string, orderId: string) {
    return this.prisma.orderLog.findMany({
      where: { shopId, orderId },
      orderBy: { createdAt: 'asc' },
    });
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
      items: { productId: string; variationId?: string; quantity: number; note?: string; modifierIds?: string[] }[];
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
    const variationIds = dto.items.map((i) => i.variationId).filter(Boolean) as string[];
    const variations = variationIds.length
      ? await this.prisma.productVariation.findMany({ where: { shopId, id: { in: variationIds } } })
      : [];
    const vmap = new Map(variations.map((v) => [v.id, v]));
    const mmap = await this.modifierMap(shopId, dto.items);

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
              const v = i.variationId ? vmap.get(i.variationId) : null;
              const { add, suffix } = this.applyModifiers(i.modifierIds, mmap);
              return {
                productId: p.id,
                name: (v ? `${p.name} (${v.name})` : p.name) + suffix,
                variationId: v?.id,
                quantity: i.quantity,
                unitPrice: Number(v ? v.salePrice : p.salePrice) + add,
                note: i.note,
              };
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
      include: {
        items: { include: { product: { select: { station: true } } } },
        table: true,
        waiter: { select: { fullName: true } },
      },
    });
  }

  // Toggle a single item's prep status (kitchen display bump).
  async bumpItem(shopId: string, orderId: string, itemId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, shopId } });
    if (!order) throw new NotFoundException('Order not found');
    const item = await this.prisma.orderItem.findFirst({ where: { id: itemId, orderId } });
    if (!item) throw new NotFoundException('Item not found');
    const next = item.prepStatus === 'READY' ? 'PENDING' : 'READY';
    await this.prisma.orderItem.update({ where: { id: itemId }, data: { prepStatus: next } });
    return { id: itemId, prepStatus: next };
  }

  // Build a lookup of every modifier referenced across an order's items.
  private async modifierMap(shopId: string, items: { modifierIds?: string[] }[]) {
    const ids = [...new Set(items.flatMap((i) => i.modifierIds ?? []))];
    if (ids.length === 0) return new Map<string, { name: string; price: any }>();
    const mods = await this.prisma.modifier.findMany({ where: { shopId, id: { in: ids } } });
    return new Map(mods.map((m) => [m.id, m]));
  }

  // Sum add-on prices and build the "+ Cheese, Bacon" name suffix for one item.
  private applyModifiers(ids: string[] | undefined, mmap: Map<string, { name: string; price: any }>) {
    const mods = (ids ?? []).map((id) => mmap.get(id)).filter(Boolean) as { name: string; price: any }[];
    const add = Math.round(mods.reduce((s, m) => s + Number(m.price), 0) * 100) / 100;
    const suffix = mods.length ? ` + ${mods.map((m) => m.name).join(', ')}` : '';
    return { add, suffix };
  }

  // ── Item-level operations (advanced order screen) ──

  // Add a single item to an open order (resolves variation + add-ons, logs it).
  async addItem(
    shopId: string,
    orderId: string,
    dto: { productId: string; variationId?: string; modifierIds?: string[]; quantity: number; note?: string },
    userId?: string,
  ) {
    const order = await this.ensureOpen(shopId, orderId);
    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, shopId, isActive: true } });
    if (!product) throw new BadRequestException('Product not found');
    let variation = null;
    if (dto.variationId) {
      variation = await this.prisma.productVariation.findFirst({ where: { id: dto.variationId, shopId, productId: product.id } });
      if (!variation) throw new BadRequestException('Variation not found');
    }
    const mmap = await this.modifierMap(shopId, [dto]);
    const { add, suffix } = this.applyModifiers(dto.modifierIds, mmap);
    const name = (variation ? `${product.name} (${variation.name})` : product.name) + suffix;
    const unitPrice = Number(variation ? variation.salePrice : product.salePrice) + add;

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.create({
        data: { orderId: order.id, productId: product.id, name, variationId: variation?.id, quantity: dto.quantity, unitPrice, note: dto.note },
      });
      await tx.order.update({ where: { id: order.id }, data: { updatedAt: new Date() } });
      await tx.orderLog.create({ data: { shopId, orderId: order.id, userId, action: 'ITEM_ADDED', detail: `${dto.quantity}× ${name}` } });
    });
    return this.get(shopId, order.id);
  }

  // Change quantity / kitchen note on one item. Reducing a sent item is a partial void.
  async updateItem(shopId: string, orderId: string, itemId: string, dto: { quantity?: number; note?: string; reason?: string }, userId?: string) {
    const order = await this.ensureOpen(shopId, orderId);
    const item = await this.prisma.orderItem.findFirst({ where: { id: itemId, orderId: order.id } });
    if (!item) throw new NotFoundException('Item not found');
    const newQty = dto.quantity ?? Number(item.quantity);
    if (newQty <= 0) throw new BadRequestException('Use void to remove an item');
    const reduced = item.sent && newQty < Number(item.quantity);

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.update({ where: { id: item.id }, data: { quantity: newQty, note: dto.note ?? item.note } });
      await tx.order.update({ where: { id: order.id }, data: { updatedAt: new Date() } });
      await tx.orderLog.create({
        data: {
          shopId, orderId: order.id, userId,
          action: reduced ? 'ITEM_VOIDED' : 'ITEMS_UPDATED',
          detail: reduced
            ? `Reduced ${item.name} ${Number(item.quantity)}→${newQty}${dto.reason ? ` — ${dto.reason}` : ''}`
            : `${item.name} → ${newQty}`,
        },
      });
    });
    return this.get(shopId, order.id);
  }

  // Remove an item entirely; a reason is recorded for accountability.
  async voidItem(shopId: string, orderId: string, itemId: string, dto: { reason?: string }, userId?: string) {
    const order = await this.ensureOpen(shopId, orderId);
    const item = await this.prisma.orderItem.findFirst({ where: { id: itemId, orderId: order.id } });
    if (!item) throw new NotFoundException('Item not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.delete({ where: { id: item.id } });
      await tx.order.update({ where: { id: order.id }, data: { updatedAt: new Date() } });
      await tx.orderLog.create({
        data: { shopId, orderId: order.id, userId, action: 'ITEM_VOIDED', detail: `Void ${Number(item.quantity)}× ${item.name}${item.sent ? ' (sent)' : ''}${dto.reason ? ` — ${dto.reason}` : ''}` },
      });
    });
    return this.get(shopId, order.id);
  }

  // Order-level note (e.g. "birthday") and guest/cover count.
  async updateMeta(shopId: string, orderId: string, dto: { note?: string; guests?: number }, userId?: string) {
    const order = await this.ensureOpen(shopId, orderId);
    await this.prisma.order.update({ where: { id: order.id }, data: { note: dto.note, guests: dto.guests } });
    await this.prisma.orderLog.create({ data: { shopId, orderId: order.id, userId, action: 'ITEMS_UPDATED', detail: `Order info updated` } });
    return this.get(shopId, order.id);
  }

  // Move an order to another (free) table.
  async moveTable(shopId: string, orderId: string, dto: { tableId: string }, userId?: string) {
    const order = await this.ensureOpen(shopId, orderId);
    const target = await this.prisma.restaurantTable.findFirst({ where: { id: dto.tableId, shopId } });
    if (!target) throw new NotFoundException('Table not found');
    const busy = await this.prisma.order.findFirst({ where: { shopId, tableId: dto.tableId, status: 'OPEN', NOT: { id: order.id } } });
    if (busy) throw new BadRequestException('Target table is occupied');
    await this.prisma.$transaction(async (tx) => {
      if (order.tableId && order.tableId !== dto.tableId) {
        await tx.restaurantTable.update({ where: { id: order.tableId }, data: { status: 'FREE' } });
      }
      await tx.restaurantTable.update({ where: { id: dto.tableId }, data: { status: 'OCCUPIED' } });
      await tx.order.update({ where: { id: order.id }, data: { tableId: dto.tableId } });
      await tx.orderLog.create({ data: { shopId, orderId: order.id, userId, action: 'MOVED', detail: `→ Table ${target.name}` } });
    });
    return this.get(shopId, order.id);
  }

  // Replace the order's item list (cart-style save from the order screen).
  async setItems(shopId: string, orderId: string, dto: SetOrderItemsDto, userId?: string) {
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
    const variationIds = dto.items.map((i) => i.variationId).filter(Boolean) as string[];
    const variations = variationIds.length
      ? await this.prisma.productVariation.findMany({ where: { shopId, id: { in: variationIds } } })
      : [];
    const vmap = new Map(variations.map((v) => [v.id, v]));
    const mmap = await this.modifierMap(shopId, dto.items);

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: order.id } });
      if (dto.items.length > 0) {
        await tx.orderItem.createMany({
          data: dto.items.map((i) => {
            const p = map.get(i.productId)!;
            const v = i.variationId ? vmap.get(i.variationId) : null;
            const { add, suffix } = this.applyModifiers(i.modifierIds, mmap);
            return {
              orderId: order.id,
              productId: p.id,
              name: (v ? `${p.name} (${v.name})` : p.name) + suffix,
              variationId: v?.id,
              quantity: i.quantity,
              unitPrice: Number(v ? v.salePrice : p.salePrice) + add,
              note: i.note,
            };
          }),
        });
      }
      await tx.order.update({ where: { id: order.id }, data: { updatedAt: new Date() } });
      await tx.orderLog.create({
        data: { shopId, orderId: order.id, userId, action: 'ITEMS_UPDATED', detail: `${dto.items.length} item(s)` },
      });
    });
    return this.get(shopId, order.id);
  }

  // Settle: turn the order into a Sale (reusing the double-entry sale flow),
  // mark the order settled and free the table.
  async settle(shopId: string, orderId: string, dto: SettleOrderDto, userId?: string) {
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
        variationId: i.variationId ?? undefined,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
      })),
      paymentMethod: dto.paymentMethod,
      provider: dto.provider,
      payments: dto.payments,
      customerId: dto.customerId,
      discount: dto.discount,
      redeemPoints: dto.redeemPoints,
      tip: dto.tip,
      note: `Order ${order.id}${order.tableId ? ' (dine-in)' : ''}`,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'SETTLED', saleId: sale?.id, kotPending: false },
      });
      await tx.orderLog.create({
        data: { shopId, orderId: order.id, userId, action: 'SETTLED', detail: sale?.invoiceNo },
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

  async cancel(shopId: string, orderId: string, userId?: string) {
    const order = await this.ensureOpen(shopId, orderId);
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED', kotPending: false } });
      await tx.orderLog.create({ data: { shopId, orderId: order.id, userId, action: 'CANCELLED' } });
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
