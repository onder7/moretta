-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP(3);

-- Mevcut kullanicilar dogrulanmis sayilir (geriye donuk zorunluluk uygulanmaz).
UPDATE "users" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL;
