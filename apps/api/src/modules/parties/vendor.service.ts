import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePartyDto, UpdatePartyDto } from './dto';

@Injectable()
export class VendorService {
  constructor(private prisma: PrismaService) {}

  list(shopId: string) {
    return this.prisma.vendor.findMany({
      where: { shopId },
      orderBy: { name: 'asc' },
    });
  }

  create(shopId: string, dto: CreatePartyDto) {
    return this.prisma.vendor.create({
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
    return this.prisma.vendor.update({ where: { id }, data: dto });
  }

  async statement(shopId: string, id: string) {
    const vendor = await this.ensure(shopId, id);
    const purchases = await this.prisma.purchase.findMany({
      where: { shopId, vendorId: id },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    const payments = await this.prisma.partyPayment.findMany({
      where: { shopId, vendorId: id, type: 'VENDOR_PAYMENT' },
      orderBy: { createdAt: 'desc' },
    });
    return { vendor, purchases, payments };
  }

  private async ensure(shopId: string, id: string) {
    const v = await this.prisma.vendor.findFirst({ where: { id, shopId } });
    if (!v) throw new NotFoundException('Vendor not found');
    return v;
  }
}
