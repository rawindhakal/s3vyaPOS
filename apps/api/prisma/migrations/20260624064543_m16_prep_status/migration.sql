-- CreateEnum
CREATE TYPE "PrepStatus" AS ENUM ('PENDING', 'READY');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "prepStatus" "PrepStatus" NOT NULL DEFAULT 'PENDING';
