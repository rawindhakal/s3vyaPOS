import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { NotificationChannel } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { NotificationsService } from './notifications.service';

class SendDto {
  @IsEnum(NotificationChannel) channel!: NotificationChannel;
  @IsString() @MinLength(1) to!: string;
  @IsString() @MinLength(1) body!: string;
  @IsOptional() @IsString() subject?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser('shopId') shopId: string) {
    return this.notifications.list(shopId);
  }

  @Post('send')
  send(@CurrentUser('shopId') shopId: string, @Body() dto: SendDto) {
    return this.notifications.send(shopId, dto.channel, dto.to, dto.body, dto.subject);
  }
}
