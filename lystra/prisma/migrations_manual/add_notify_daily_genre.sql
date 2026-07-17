-- Переключатель "Уведомления о жанре дня" в настройках TMA — включён по умолчанию для всех.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_daily_genre BOOLEAN NOT NULL DEFAULT true;
