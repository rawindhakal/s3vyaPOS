import { Injectable } from '@nestjs/common';
import {
  ChargeRequest,
  ChargeResult,
  PaymentProviderImpl,
  VerifyResult,
} from './payment-provider.interface';

/** Fallback used when no live wallet credentials are configured. */
@Injectable()
export class ManualProvider implements PaymentProviderImpl {
  readonly name = 'NONE' as const;
  isConfigured() {
    return true;
  }
  async createCharge(req: ChargeRequest): Promise<ChargeResult> {
    // The cashier confirms receipt manually; QR payload is informational.
    return {
      status: 'PAID',
      qrPayload: `MANUAL:${req.invoiceNo}:${req.amount}`,
    };
  }
  async verify(externalRef: string): Promise<VerifyResult> {
    return { status: 'PAID', externalRef };
  }
}

/**
 * Fonepay dynamic QR. Generates a per-transaction QR payload and (later) verifies
 * via Fonepay's API/webhook. Wire real signing once FONEPAY_* env vars are set.
 */
@Injectable()
export class FonepayProvider implements PaymentProviderImpl {
  readonly name = 'FONEPAY' as const;
  isConfigured() {
    return !!process.env.FONEPAY_MERCHANT_CODE && !!process.env.FONEPAY_SECRET_KEY;
  }
  async createCharge(req: ChargeRequest): Promise<ChargeResult> {
    // TODO: call Fonepay dynamic-QR endpoint with signed params.
    const merchant = process.env.FONEPAY_MERCHANT_CODE ?? 'MERCHANT';
    return {
      status: 'PENDING',
      externalRef: `FP-${req.invoiceNo}`,
      qrPayload: `fonepay://pay?merchant=${merchant}&amt=${req.amount}&inv=${req.invoiceNo}`,
    };
  }
  async verify(externalRef: string): Promise<VerifyResult> {
    // TODO: call Fonepay status endpoint.
    return { status: 'PENDING', externalRef };
  }
}

/** eSewa dynamic QR / ePay behind the same interface. */
@Injectable()
export class EsewaProvider implements PaymentProviderImpl {
  readonly name = 'ESEWA' as const;
  isConfigured() {
    return !!process.env.ESEWA_MERCHANT_CODE && !!process.env.ESEWA_SECRET_KEY;
  }
  async createCharge(req: ChargeRequest): Promise<ChargeResult> {
    const merchant = process.env.ESEWA_MERCHANT_CODE ?? 'MERCHANT';
    return {
      status: 'PENDING',
      externalRef: `ES-${req.invoiceNo}`,
      qrPayload: `esewa://pay?scd=${merchant}&amt=${req.amount}&pid=${req.invoiceNo}`,
    };
  }
  async verify(externalRef: string): Promise<VerifyResult> {
    return { status: 'PENDING', externalRef };
  }
}
