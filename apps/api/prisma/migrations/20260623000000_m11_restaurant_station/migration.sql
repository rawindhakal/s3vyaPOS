-- Product station (KITCHEN / BAR) for KOT routing
CREATE TYPE "StationType" AS ENUM ('KITCHEN', 'BAR');
ALTER TABLE "Product" ADD COLUMN "station" "StationType" NOT NULL DEFAULT 'KITCHEN';

-- Restaurant-only: drop RETAIL/BOTH from BusinessType (all rows already RESTAURANT)
ALTER TYPE "BusinessType" RENAME TO "BusinessType_old";
CREATE TYPE "BusinessType" AS ENUM ('RESTAURANT');
ALTER TABLE "Shop" ALTER COLUMN "businessType" DROP DEFAULT;
ALTER TABLE "Shop" ALTER COLUMN "businessType" TYPE "BusinessType" USING ("businessType"::text::"BusinessType");
ALTER TABLE "Shop" ALTER COLUMN "businessType" SET DEFAULT 'RESTAURANT';
DROP TYPE "BusinessType_old";
