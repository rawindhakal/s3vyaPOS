import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JournalService } from '../accounting/journal.service';
import { ACCOUNT_CODES } from '../accounting/chart-of-accounts';
import { SettlementDto } from './dto';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Maps a cash-like payment method to its asset account code.
function cashAccountCode(method: PaymentMethod): string {
  switch (method) {
    case 'BANK':
      return ACCOUNT_CODES.BANK;
    case 'QR':
      return ACCOUNT_CODES.QR_CLEARING;
    case 'CASH':
      return ACCOUNT_CODES.CASH;
    default:
      throw new BadRequestException('Settlements must use CASH, BANK or QR');
  }
}

@Injectable()
export class SettlementService {
  constructor(
    private prisma: PrismaService,
    private journal: JournalService,
  ) {}

  /** Pay a vendor: DR Accounts Payable, CR Cash/Bank. Reduces vendor balance. */
  async payVendor(shopId: string, vendorId: string, dto: SettlementDto) {
    const amount = round2(dto.amount);
    const cash = cashAccountCode(dto.method);

    return this.prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor.findFirst({ where: { id: vendorId, shopId } });
      if (!vendor) throw new NotFoundException('Vendor not found');

      const entry = await this.journal.postJournalEntry(
        {
          shopId,
          description: `Payment to vendor ${vendor.name}`,
          source: 'PAYMENT',
          lines: [
            { accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, debit: amount },
            { accountCode: cash, credit: amount },
          ],
        },
        tx,
      );

      await tx.vendor.update({
        where: { id: vendorId },
        data: { balance: { decrement: amount } },
      });

      return tx.partyPayment.create({
        data: {
          shopId,
          type: 'VENDOR_PAYMENT',
          vendorId,
          method: dto.method,
          amount,
          note: dto.note,
          journalId: entry.id,
        },
      });
    });
  }

  /** Receive from a customer: DR Cash/Bank, CR Accounts Receivable. Reduces customer balance. */
  async receiveFromCustomer(shopId: string, customerId: string, dto: SettlementDto) {
    const amount = round2(dto.amount);
    const cash = cashAccountCode(dto.method);

    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: customerId, shopId } });
      if (!customer) throw new NotFoundException('Customer not found');

      const entry = await this.journal.postJournalEntry(
        {
          shopId,
          description: `Receipt from customer ${customer.name}`,
          source: 'PAYMENT',
          lines: [
            { accountCode: cash, debit: amount },
            { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, credit: amount },
          ],
        },
        tx,
      );

      await tx.customer.update({
        where: { id: customerId },
        data: { balance: { decrement: amount } },
      });

      return tx.partyPayment.create({
        data: {
          shopId,
          type: 'CUSTOMER_RECEIPT',
          customerId,
          method: dto.method,
          amount,
          note: dto.note,
          journalId: entry.id,
        },
      });
    });
  }
}
