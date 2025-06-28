-- CreateEnum
CREATE TYPE "PaymentMethodStatus" AS ENUM ('ACTIVE', 'UNVERIFIED', 'SUSPENDED_TEMPORARY', 'SUSPENDED_PERMANENT');

-- AlterTable
ALTER TABLE "PaymentMethod" ADD COLUMN     "status" "PaymentMethodStatus" NOT NULL DEFAULT 'ACTIVE';
