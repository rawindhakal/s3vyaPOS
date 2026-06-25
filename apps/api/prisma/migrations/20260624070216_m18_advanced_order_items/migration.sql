-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderLogAction" ADD VALUE 'ITEM_ADDED';
ALTER TYPE "OrderLogAction" ADD VALUE 'ITEM_VOIDED';
ALTER TYPE "OrderLogAction" ADD VALUE 'MOVED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "guests" INTEGER,
ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "sent" BOOLEAN NOT NULL DEFAULT false;
