-- Fix test user for E2E: set password to password123 and bypass MFA for today
USE 02_db_stg_compliance_hub_users;

UPDATE users 
SET 
  passwordHash = '$2b$10$EmQpbAjo041jAiP7y8Z0OeL.iP.3D2ho401AaBzaKc5iPRtP3BLsa',
  mfa_last_verified_at = NOW()
WHERE email = 'mpmabazza@dswd.gov.ph';
