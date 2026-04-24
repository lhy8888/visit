UPDATE app_settings
SET value = '365', updated_at = CURRENT_TIMESTAMP
WHERE key = 'data_retention_days'
  AND CAST(value AS INTEGER) < 365;
