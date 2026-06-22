import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { SmsProvider, EmailProvider, WhatsappProvider } from './providers';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, SmsProvider, EmailProvider, WhatsappProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
