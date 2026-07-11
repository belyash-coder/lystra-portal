-- Adds an optional fine-grained tags array to releases (in addition to the
-- single primary "genre"), sourced from data/genres.json in the app.
-- Additive-only, safe on existing data (default '{}' backfills existing rows).
-- Apply with:
--   docker exec -i <postgres_container> psql -U postgres -d postgres -f add_release_tags.sql

ALTER TABLE "releases" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}';
