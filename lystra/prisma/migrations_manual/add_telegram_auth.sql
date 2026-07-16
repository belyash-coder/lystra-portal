-- Поддержка входа через Telegram Mini App: email/password_hash больше не обязательны,
-- у telegram-only пользователей их просто не будет.
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_id BIGINT;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_telegram_id_key ON profiles (telegram_id);
