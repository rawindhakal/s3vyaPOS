-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "hasVariations" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "variationId" TEXT;

-- CreateTable
CREATE TABLE "ProductVariation" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "salePrice" DECIMAL(18,2) NOT NULL,
    "sku" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductVariation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductVariation_shopId_idx" ON "ProductVariation"("shopId");

-- CreateIndex
CREATE INDEX "ProductVariation_productId_idx" ON "ProductVariation"("productId");

-- AddForeignKey
ALTER TABLE "ProductVariation" ADD CONSTRAINT "ProductVariation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
