import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ReservationStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

class CreateReservationDto {
  @IsString() @MinLength(1) customerName!: string;
  @IsOptional() @IsString() phone?: string;
  @IsInt() @Min(1) partySize!: number;
  @IsDateString() reservedAt!: string;
  @IsOptional() @IsString() tableId?: string;
  @IsOptional() @IsString() note?: string;
}

class UpdateReservationDto {
  @IsOptional() @IsEnum(ReservationStatus) status?: ReservationStatus;
  @IsOptional() @IsString() tableId?: string;
  @IsOptional() @IsInt() @Min(1) partySize?: number;
  @IsOptional() @IsDateString() reservedAt?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  list(
    @CurrentUser('shopId') shopId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.prisma.reservation.findMany({
      where: {
        shopId,
        ...(from || to
          ? { reservedAt: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } }
          : {}),
      },
      orderBy: { reservedAt: 'asc' },
      include: { table: true },
    });
  }

  @Post()
  create(@CurrentUser('shopId') shopId: string, @Body() dto: CreateReservationDto) {
    return this.prisma.reservation.create({
      data: {
        shopId,
        customerName: dto.customerName,
        phone: dto.phone,
        partySize: dto.partySize,
        reservedAt: new Date(dto.reservedAt),
        tableId: dto.tableId || null,
        note: dto.note,
      },
    });
  }

  @Patch(':id')
  async update(
    @CurrentUser('shopId') shopId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReservationDto,
  ) {
    const r = await this.prisma.reservation.findFirst({ where: { id, shopId } });
    if (!r) throw new Error('Reservation not found');
    return this.prisma.reservation.update({
      where: { id },
      data: {
        status: dto.status,
        tableId: dto.tableId,
        partySize: dto.partySize,
        reservedAt: dto.reservedAt ? new Date(dto.reservedAt) : undefined,
      },
    });
  }
}
