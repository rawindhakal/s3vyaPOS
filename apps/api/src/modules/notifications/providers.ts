import { Injectable } from '@nestjs/common';

export interface SendResult {
  ok: boolean;
  error?: string;
}

export interface MessageProvider {
  isConfigured(): boolean;
  send(to: string, body: string, subject?: string): Promise<SendResult>;
}

/**
 * SMS via a generic gateway (e.g. Sparrow SMS / Twilio in Nepal). Until credentials
 * are set the message is "logged" (recorded in-app) so the flow works end-to-end.
 */
@Injectable()
export class SmsProvider implements MessageProvider {
  isConfigured() {
    return !!process.env.SMS_API_URL && !!process.env.SMS_API_TOKEN;
  }
  async send(): Promise<SendResult> {
    // TODO: POST to SMS_API_URL with token + to + text.
    return { ok: true };
  }
}

@Injectable()
export class EmailProvider implements MessageProvider {
  isConfigured() {
    return !!process.env.SMTP_HOST && !!process.env.SMTP_USER;
  }
  async send(): Promise<SendResult> {
    // TODO: send via SMTP / SendGrid.
    return { ok: true };
  }
}

@Injectable()
export class WhatsappProvider implements MessageProvider {
  isConfigured() {
    return !!process.env.WHATSAPP_TOKEN && !!process.env.WHATSAPP_PHONE_ID;
  }
  async send(): Promise<SendResult> {
    // TODO: WhatsApp Cloud API.
    return { ok: true };
  }
}
