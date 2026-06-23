import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_CHART_OF_ACCOUNTS } from '../accounting/chart-of-accounts';
import { SignupDto, LoginDto } from './dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    // Create shop + admin + default Chart of Accounts atomically.
    const result = await this.prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: {
          name: dto.shopName,
          businessType: 'RESTAURANT',
          currency: dto.currency ?? 'NPR',
          accounts: {
            create: DEFAULT_CHART_OF_ACCOUNTS.map((a) => ({
              code: a.code,
              name: a.name,
              type: a.type,
              isSystem: a.isSystem,
            })),
          },
        },
      });

      const user = await tx.user.create({
        data: {
          shopId: shop.id,
          email: dto.email,
          passwordHash: await bcrypt.hash(dto.password, 10),
          fullName: dto.fullName,
          role: 'ADMIN',
        },
      });

      return { shop, user };
    });

    return this.issueAndReturn(result.user, result.shop);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, active: true },
      include: { shop: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.issueAndReturn(user, user.shop);
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { shop: true },
    });
    if (!user || !user.refreshHash) throw new UnauthorizedException();
    const ok = await bcrypt.compare(refreshToken, user.refreshHash);
    if (!ok) throw new UnauthorizedException('Refresh token revoked');
    return this.issueAndReturn(user, user.shop);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { shop: true },
    });
    if (!user) throw new UnauthorizedException();
    return this.publicUser(user, user.shop);
  }

  private async issueAndReturn(
    user: { id: string; shopId: string; role: any; email: string },
    shop: { id: string; name: string; businessType: any; currency: string },
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      shopId: user.shopId,
      role: user.role,
      email: user.email,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
      expiresIn: process.env.JWT_ACCESS_TTL ?? '15m',
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      expiresIn: process.env.JWT_REFRESH_TTL ?? '7d',
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshHash: await bcrypt.hash(refreshToken, 10) },
    });
    return {
      accessToken,
      refreshToken,
      user: this.publicUser(user, shop),
    };
  }

  private publicUser(
    user: { id: string; email: string; fullName?: string; role: any; shopId: string },
    shop: { name: string; businessType: any; currency: string },
  ) {
    return {
      id: user.id,
      email: user.email,
      fullName: (user as any).fullName ?? '',
      role: user.role,
      shopId: user.shopId,
      shopName: shop.name,
      businessType: shop.businessType,
      currency: shop.currency,
    };
  }
}
