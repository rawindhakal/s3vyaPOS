import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePartyDto, UpdatePartyDto } from './dto';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  list(shopId: string) {
    return this.prisma.customer.findMany({
      where: { shopId },
      orderBy: { name: 'asc' },
    });
  }

  create(shopId: string, dto: CreatePartyDto) {
    return this.prisma.customer.create({
      data: {
        shopId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        balance: dto.openingBalance ?? 0,
      },
    });
  }

  async update(shopId: string, id: string, dto: UpdatePartyDto) {
    await this.ensure(shopId, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async statement(shopId: string, id: string) {
    const customer = await this.ensure(shopId, id);
    const sales = await this.prisma.sale.findMany({
      where: { shopId, customerId: id },
      orderBy: { createdAt: 'desc' },
      include: { items: true, payments: true },
    });
    const receipts = await this.prisma.partyPayment.findMany({
      where: { shopId, customerId: id, type: 'CUSTOMER_RECEIPT' },
      orderBy: { createdAt: 'desc' },
    });
    return { customer, sales, receipts };
  }

  private async ensure(shopId: string, id: string) {
    const c = await this.prisma.customer.findFirst({ where: { id, shopId } });
    if (!c) throw new NotFoundException('Customer not found');
    return c;
  }
}
