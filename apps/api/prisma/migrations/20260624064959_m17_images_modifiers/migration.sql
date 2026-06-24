-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "Modifier" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Modifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Modifier_shopId_idx" ON "Modifier"("shopId");

-- CreateIndex
CREATE INDEX "Modifier_productId_idx" ON "Modifier"("productId");

-- AddForeignKey
ALTER TABLE "Modifier" ADD CONSTRAINT "Modifier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
