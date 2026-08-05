-- CreateTable
CREATE TABLE "discount_campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discount_text" TEXT NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "show_on_home" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT 'primary',
    "display_type" TEXT NOT NULL DEFAULT 'sticky',
    "cta_text" TEXT,
    "cta_link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_campaigns_pkey" PRIMARY KEY ("id")
);
