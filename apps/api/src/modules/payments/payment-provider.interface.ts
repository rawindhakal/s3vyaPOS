// Pluggable payment provider contract. eSewa / Fonepay implement this; until
// merchant credentials are supplied the ManualProvider is used (cashier confirms).

export interface ChargeRequest {
  amount: number;
  invoiceNo: string;
  shopId: string;
}

export interface ChargeResult {
  status: 'PENDING' | 'PAID';
  externalRef?: string;
  qrPayload?: string; // string the web app renders as a QR for the customer
}

export interface VerifyResult {
  status: 'PENDING' | 'PAID' | 'FAILED';
  externalRef?: string;
}

export interface PaymentProviderImpl {
  readonly name: 'NONE' | 'ESEWA' | 'FONEPAY';
  isConfigured(): boolean;
  createCharge(req: ChargeRequest): Promise<ChargeResult>;
  verify(externalRef: string): Promise<VerifyResult>;
}
