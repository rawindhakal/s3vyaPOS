import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { ChargeRequest } from './payment-provider.interface';
import { EsewaProvider, FonepayProvider, ManualProvider } from './providers';

@Injectable()
export class PaymentsService {
  constructor(
    private manual: ManualProvider,
    private fonepay: FonepayProvider,
    private esewa: EsewaProvider,
  ) {}

  private pick(provider: PaymentProvider) {
    if (provider === 'FONEPAY' && this.fonepay.isConfigured()) return this.fonepay;
    if (provider === 'ESEWA' && this.esewa.isConfigured()) return this.esewa;
    return this.manual; // manual confirm fallback
  }

  createCharge(provider: PaymentProvider, req: ChargeRequest) {
    return this.pick(provider).createCharge(req);
  }
}
