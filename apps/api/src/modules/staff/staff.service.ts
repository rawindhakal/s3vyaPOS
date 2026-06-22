import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

const PUBLIC = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  active: true,
  phone: true,
  createdAt: true,
} as const;

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  list(shopId: string) {
    return this.prisma.user.findMany({
      where: { shopId },
      select: PUBLIC,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    shopId: string,
    dto: { email: string; fullName: string; role: Role; password: string; phone?: string },
  ) {
    const exists = await this.prisma.user.findFirst({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');
    return this.prisma.user.create({
      data: {
        shopId,
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
        phone: dto.phone,
        passwordHash: await bcrypt.hash(dto.password, 10),
      },
      select: PUBLIC,
    });
  }

  async update(
    shopId: string,
    id: string,
    dto: { fullName?: string; role?: Role; active?: boolean; phone?: string },
  ) {
    await this.ensure(shopId, id);
    return this.prisma.user.update({ where: { id }, data: dto, select: PUBLIC });
  }

  async resetPassword(shopId: string, id: string, password: string) {
    await this.ensure(shopId, id);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(password, 10), refreshHash: null },
    });
    return { ok: true };
  }

  private async ensure(shopId: string, id: string) {
    const u = await this.prisma.user.findFirst({ where: { id, shopId } });
    if (!u) throw new NotFoundException('Staff member not found');
    return u;
  }
}
