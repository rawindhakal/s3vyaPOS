// Shared enums, constants and DTO contracts used by both api and web.

export const ROLES = ['ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT'] as const;
export type Role = (typeof ROLES)[number];

export const BUSINESS_TYPES = ['RESTAURANT'] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const STATIONS = ['KITCHEN', 'BAR'] as const;
export type Station = (typeof STATIONS)[number];

// Printer stations a terminal can map to a physical printer.
export const PRINTER_STATIONS = ['KITCHEN', 'BAR', 'BILLING'] as const;
export type PrinterStation = (typeof PRINTER_STATIONS)[number];

export const ACCOUNT_TYPES = [
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'EXPENSE',
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const PAYMENT_METHODS = ['CASH', 'BANK', 'QR', 'CREDIT', 'GIFT_CARD', 'STORE_CREDIT'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_PROVIDERS = ['NONE', 'ESEWA', 'FONEPAY'] as const;
export type PaymentProviderName = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_TYPES = ['DINE_IN', 'TAKEAWAY', 'COUNTER'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

// Well-known account codes seeded into every shop's Chart of Accounts.
export const ACCOUNT_CODES = {
  CASH: '1000',
  BANK: '1010',
  QR_CLEARING: '1020',
  ACCOUNTS_RECEIVABLE: '1100',
  INVENTORY: '1200',
  ACCOUNTS_PAYABLE: '2000',
  SALES_TAX_PAYABLE: '2100',
  OWNER_EQUITY: '3000',
  RETAINED_EARNINGS: '3100',
  SALES_REVENUE: '4000',
  SERVICE_CHARGE: '4100',
  COGS: '5000',
  DISCOUNT_ALLOWED: '5100',
  OPERATING_EXPENSE: '6000',
  ROUNDING: '6100',
} as const;

// ── Auth DTO shapes ──────────────────────────────────────────────────
export interface SignupInput {
  shopName: string;
  businessType: BusinessType;
  email: string;
  password: string;
  fullName: string;
  currency?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  shopId: string;
  shopName: string;
  businessType: BusinessType;
  currency: string;
}

// ── POS DTO shapes ───────────────────────────────────────────────────
export interface SaleItemInput {
  productId?: string;
  sku?: string;
  quantity: number;
  unitPrice?: number; // override; defaults to product.salePrice
  discount?: number; // per-line discount amount
}

export interface PaymentSplit {
  method: PaymentMethod;
  provider?: PaymentProviderName;
  amount: number;
}

export interface CreateSaleInput {
  items: SaleItemInput[];
  // Single payment (back-compat) OR split payments.
  paymentMethod?: PaymentMethod;
  provider?: PaymentProviderName;
  payments?: PaymentSplit[];
  customerId?: string;
  discount?: number; // bill-level discount amount
  discountPct?: number; // bill-level discount percent (alternative)
  serviceChargeRate?: number; // override shop default (%)
  redeemPoints?: number; // loyalty points to redeem (1 point = 1 currency)
  roundOff?: boolean; // override shop default
  note?: string;
}
