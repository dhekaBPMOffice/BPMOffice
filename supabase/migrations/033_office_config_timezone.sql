-- Fuso horário por escritório (null = herdar platform_settings.timezone)
ALTER TABLE office_config ADD COLUMN IF NOT EXISTS timezone TEXT;
