-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "creditLimit" DECIMAL(18,2) NOT NULL DEFAULT 1000;

-- CreateTable
CREATE TABLE "PaymentChannel" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "provider" "PaymentProvider",
    "qrImageUrl" TEXT,
    "instructions" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentChannel_shopId_idx" ON "PaymentChannel"("shopId");

-- AddForeignKey
ALTER TABLE "PaymentChannel" ADD CONSTRAINT "PaymentChannel_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentChannel" ADD CONSTRAINT "PaymentChannel_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PaymentChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
