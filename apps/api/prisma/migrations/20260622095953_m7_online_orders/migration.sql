-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "channel" TEXT NOT NULL DEFAULT 'POS',
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "phone" TEXT;
