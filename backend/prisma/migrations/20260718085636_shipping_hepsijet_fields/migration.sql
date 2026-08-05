-- AlterTable
ALTER TABLE "shippings" ADD COLUMN     "barcode_data" TEXT,
ADD COLUMN     "delivery_no" TEXT,
ADD COLUMN     "payload" JSONB;
