-- Имя из Telegram (first_name) для отображения в TMA вместо ника.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
