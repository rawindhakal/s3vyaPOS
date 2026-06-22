import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTableDto, UpdateTableDto } from './dto';

@Injectable()
export class TableService {
  constructor(private prisma: PrismaService) {}

  // Tables grouped with their current open order (for the floor view).
  async listWithOrders(shopId: string) {
    const tables = await this.prisma.restaurantTable.findMany({
      where: { shopId },
      orderBy: [{ area: 'asc' }, { name: 'asc' }],
    });
    const openOrders = await this.prisma.order.findMany({
      where: { shopId, status: 'OPEN', tableId: { not: null } },
      include: { items: true },
    });
    const byTable = new Map(openOrders.map((o) => [o.tableId!, o]));
    return tables.map((t) => {
      const order = byTable.get(t.id);
      const orderTotal = order
        ? order.items.reduce((s, i) => s + Number(i.unitPrice) * Number(i.quantity), 0)
        : 0;
      return {
        ...t,
        openOrderId: order?.id ?? null,
        openOrderItems: order?.items.length ?? 0,
        openOrderTotal: Math.round(orderTotal * 100) / 100,
      };
    });
  }

  create(shopId: string, dto: CreateTableDto) {
    return this.prisma.restaurantTable.create({
      data: { shopId, name: dto.name, area: dto.area, seats: dto.seats ?? 4 },
    });
  }

  async update(shopId: string, id: string, dto: UpdateTableDto) {
    await this.ensure(shopId, id);
    return this.prisma.restaurantTable.update({ where: { id }, data: dto });
  }

  private async ensure(shopId: string, id: string) {
    const t = await this.prisma.restaurantTable.findFirst({ where: { id, shopId } });
    if (!t) throw new NotFoundException('Table not found');
    return t;
  }
}
