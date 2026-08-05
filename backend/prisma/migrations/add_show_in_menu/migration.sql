-- AddColumn show_in_menu to categories table
ALTER TABLE "categories" ADD COLUMN "show_in_menu" BOOLEAN NOT NULL DEFAULT true;
