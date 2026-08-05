-- AlterTable: product_variants
ALTER TABLE "product_variants" ADD COLUMN "desi" DECIMAL(8,2);
ALTER TABLE "product_variants" DROP COLUMN IF EXISTS "attributes";

-- CreateTable: attributes
CREATE TABLE "attributes" (
  "id"         TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "slug"       TEXT NOT NULL,
  "input_type" TEXT NOT NULL DEFAULT 'select',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active"  BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attributes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "attributes_name_key" ON "attributes"("name");
CREATE UNIQUE INDEX "attributes_slug_key" ON "attributes"("slug");

-- CreateTable: attribute_values
CREATE TABLE "attribute_values" (
  "id"           TEXT NOT NULL,
  "attribute_id" TEXT NOT NULL,
  "value"        TEXT NOT NULL,
  "color_hex"    TEXT,
  "sort_order"   INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "attribute_values_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attribute_values_attribute_id_fkey"
    FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "attribute_values_attribute_id_value_key" ON "attribute_values"("attribute_id", "value");

-- CreateTable: variant_attribute_values
CREATE TABLE "variant_attribute_values" (
  "variant_id"         TEXT NOT NULL,
  "attribute_value_id" TEXT NOT NULL,
  CONSTRAINT "variant_attribute_values_pkey" PRIMARY KEY ("variant_id", "attribute_value_id"),
  CONSTRAINT "variant_attribute_values_variant_id_fkey"
    FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "variant_attribute_values_attribute_value_id_fkey"
    FOREIGN KEY ("attribute_value_id") REFERENCES "attribute_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
