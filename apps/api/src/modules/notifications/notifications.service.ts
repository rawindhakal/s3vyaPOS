import { Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailProvider, MessageProvider, SmsProvider, WhatsappProvider } from './providers';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private sms: SmsProvider,
    private email: EmailProvider,
    private whatsapp: WhatsappProvider,
  ) {}

  private provider(channel: NotificationChannel): MessageProvider {
    if (channel === 'EMAIL') return this.email;
    if (channel === 'WHATSAPP') return this.whatsapp;
    return this.sms;
  }

  /** Sends via the configured provider, or records the message as LOGGED if none. */
  async send(shopId: string, channel: NotificationChannel, to: string, body: string, subject?: string) {
    const provider = this.provider(channel);
    let status: NotificationStatus = 'LOGGED';
    let error: string | undefined;

    if (provider.isConfigured()) {
      try {
        const res = await provider.send(to, body, subject);
        status = res.ok ? 'SENT' : 'FAILED';
        error = res.error;
      } catch (e: any) {
        status = 'FAILED';
        error = e?.message ?? 'send failed';
      }
    }

    return this.prisma.notification.create({
      data: { shopId, channel, to, subject, body, status, error },
    });
  }

  list(shopId: string) {
    return this.prisma.notification.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // Best-effort; never throws (used for non-critical auto-notifications).
  async tryNotify(shopId: string, channel: NotificationChannel, to: string, body: string, subject?: string) {
    try {
      if (to) await this.send(shopId, channel, to, body, subject);
    } catch {
      /* ignore */
    }
  }
}
