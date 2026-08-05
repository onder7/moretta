-- CreateTable
CREATE TABLE "chatbot_rules" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "keywords" TEXT[],
    "response" TEXT NOT NULL,
    "quick_replies" TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chatbot_rules_pkey" PRIMARY KEY ("id")
);
