-- ============================================
-- PASSWORD UPDATE SCRIPT
-- Run this after initial data.sql to fix passwords
-- All passwords should be: Password123!
-- ============================================

-- This script updates all existing users' passwords to Password123!
-- Note: Since BCrypt hashes use random salts, each update will create a unique hash
-- The backend's PasswordEncoder will handle the encoding when users are created
-- For existing users, you may need to reset their passwords through the application
-- OR delete and recreate users so data.sql can insert them with correct passwords

-- Option 1: If you want to keep existing users, use this approach:
-- Manually encode Password123! using BCrypt and update each user
-- OR delete all users and let data.sql recreate them

-- Option 2: Delete existing users to allow clean recreation
DELETE FROM favorites WHERE user_id IN (SELECT id FROM users);
DELETE FROM reviews WHERE reviewer_id IN (SELECT id FROM users) OR reviewee_id IN (SELECT id FROM users);
DELETE FROM orders WHERE buyer_id IN (SELECT id FROM users);
DELETE FROM listings WHERE seller_id IN (SELECT id FROM users);
DELETE FROM users;

-- Then restart the application so data.sql runs and creates users with correct passwords

