-- Adds a "Хочу послушать" (listen later) list alongside the existing
-- "Добавить в коллекцию" (collection) list, both backed by the same
-- `collections` table, differentiated by the new `list_type` column.
-- Existing rows default to 'collection', preserving their meaning.
-- Apply with:
--   docker exec -i <postgres_container> psql -U postgres -d postgres -f add_collections_list_type.sql

DROP INDEX "collections_user_id_item_id_item_type_key";
ALTER TABLE "collections" ADD COLUMN "list_type" TEXT NOT NULL DEFAULT 'collection';
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_item_id_item_type_list_type_key" UNIQUE ("user_id", "item_id", "item_type", "list_type");
