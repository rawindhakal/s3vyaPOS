import { AccountType } from '@prisma/client';

export const ACCOUNT_CODES = {
  CASH: '1000',
  BANK: '1010',
  QR_CLEARING: '1020',
  ACCOUNTS_RECEIVABLE: '1100',
  INVENTORY: '1200',
  ACCOUNTS_PAYABLE: '2000',
  SALES_TAX_PAYABLE: '2100',
  GIFT_CARD_LIABILITY: '2200',
  STORE_CREDIT_LIABILITY: '2300',
  TIPS_PAYABLE: '2400',
  OWNER_EQUITY: '3000',
  RETAINED_EARNINGS: '3100',
  SALES_REVENUE: '4000',
  SERVICE_CHARGE: '4100',
  COGS: '5000',
  DISCOUNT_ALLOWED: '5100',
  WASTAGE: '5200',
  OPERATING_EXPENSE: '6000',
  ROUNDING: '6100',
} as const;

export interface SeedAccount {
  code: string;
  name: string;
  type: AccountType;
  isSystem: boolean;
}

// Default Chart of Accounts seeded into every new shop.
export const DEFAULT_CHART_OF_ACCOUNTS: SeedAccount[] = [
  { code: ACCOUNT_CODES.CASH, name: 'Cash', type: 'ASSET', isSystem: true },
  { code: ACCOUNT_CODES.BANK, name: 'Bank', type: 'ASSET', isSystem: true },
  { code: ACCOUNT_CODES.QR_CLEARING, name: 'QR / Wallet Clearing', type: 'ASSET', isSystem: true },
  { code: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, name: 'Accounts Receivable', type: 'ASSET', isSystem: true },
  { code: ACCOUNT_CODES.INVENTORY, name: 'Inventory', type: 'ASSET', isSystem: true },
  { code: ACCOUNT_CODES.ACCOUNTS_PAYABLE, name: 'Accounts Payable', type: 'LIABILITY', isSystem: true },
  { code: ACCOUNT_CODES.SALES_TAX_PAYABLE, name: 'Sales Tax Payable', type: 'LIABILITY', isSystem: true },
  { code: ACCOUNT_CODES.GIFT_CARD_LIABILITY, name: 'Gift Card Liability', type: 'LIABILITY', isSystem: true },
  { code: ACCOUNT_CODES.STORE_CREDIT_LIABILITY, name: 'Store Credit Liability', type: 'LIABILITY', isSystem: true },
  { code: ACCOUNT_CODES.TIPS_PAYABLE, name: 'Tips Payable', type: 'LIABILITY', isSystem: true },
  { code: ACCOUNT_CODES.OWNER_EQUITY, name: "Owner's Equity", type: 'EQUITY', isSystem: true },
  { code: ACCOUNT_CODES.RETAINED_EARNINGS, name: 'Retained Earnings', type: 'EQUITY', isSystem: true },
  { code: ACCOUNT_CODES.SALES_REVENUE, name: 'Sales Revenue', type: 'REVENUE', isSystem: true },
  { code: ACCOUNT_CODES.SERVICE_CHARGE, name: 'Service Charge', type: 'REVENUE', isSystem: true },
  { code: ACCOUNT_CODES.COGS, name: 'Cost of Goods Sold', type: 'EXPENSE', isSystem: true },
  { code: ACCOUNT_CODES.DISCOUNT_ALLOWED, name: 'Discount Allowed', type: 'EXPENSE', isSystem: true },
  { code: ACCOUNT_CODES.WASTAGE, name: 'Wastage / Spoilage', type: 'EXPENSE', isSystem: true },
  { code: ACCOUNT_CODES.OPERATING_EXPENSE, name: 'Operating Expense', type: 'EXPENSE', isSystem: true },
  { code: ACCOUNT_CODES.ROUNDING, name: 'Rounding Off', type: 'EXPENSE', isSystem: true },
];
