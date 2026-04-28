UPDATE app_settings
SET value = 'Visitor Access', updated_at = CURRENT_TIMESTAMP
WHERE key = 'site_title'
  AND value IN ('Visitor Register');

UPDATE app_settings
SET value = 'Pre-register before you arrive.', updated_at = CURRENT_TIMESTAMP
WHERE key = 'welcome_message'
  AND value IN ('Bienvenue', 'Bienvenue dans notre entreprise');

UPDATE app_settings
SET value = '/images/logo.svg', updated_at = CURRENT_TIMESTAMP
WHERE key = 'logo_path'
  AND value IN ('/images/logo.png');
