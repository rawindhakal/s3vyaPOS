-- CreateEnum
CREATE TYPE "OrderLogAction" AS ENUM ('CREATED', 'ITEMS_UPDATED', 'SENT_KOT', 'CANCELLED', 'SETTLED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'WAITER';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "kotPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kotVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "waiterId" TEXT;

-- CreateTable
CREATE TABLE "OrderLog" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "action" "OrderLogAction" NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderLog_orderId_idx" ON "OrderLog"("orderId");

-- CreateIndex
CREATE INDEX "OrderLog_shopId_createdAt_idx" ON "OrderLog"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_shopId_kotPending_idx" ON "Order"("shopId", "kotPending");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_waiterId_fkey" FOREIGN KEY ("waiterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLog" ADD CONSTRAINT "OrderLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
