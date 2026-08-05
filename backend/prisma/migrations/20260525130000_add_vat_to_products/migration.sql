-- AlterTable
ALTER TABLE "products" ADD COLUMN "vat_rate" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "products" ADD COLUMN "vat_included" BOOLEAN NOT NULL DEFAULT true;
