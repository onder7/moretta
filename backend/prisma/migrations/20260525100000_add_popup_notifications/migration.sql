-- CreateTable
CREATE TABLE "popup_notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "button_text" TEXT,
    "button_link" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "display_freq" TEXT NOT NULL DEFAULT 'session',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "popup_notifications_pkey" PRIMARY KEY ("id")
);
