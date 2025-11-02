-- ============================================
-- COMPREHENSIVE SEED DATA FOR iHeartEV PLATFORM
-- ============================================

-- ============================================
-- USERS (Members and Admin)
-- All passwords are: Password123!
-- BCrypt hash: $2a$10$F8kQ3nYmuAiLp3chCrB8J.WAtc9XtcZJls2NuOpej7EMkKU7ct4dq
-- ============================================

-- Admin user (password: Password123!)
INSERT INTO users (email, phone, password, full_name, role, enabled)
SELECT 'admin@iheartev.local', '', '$2a$10$F8kQ3nYmuAiLp3chCrB8J.WAtc9XtcZJls2NuOpej7EMkKU7ct4dq', 'System Admin', 'ADMIN', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@iheartev.local');

-- Member users (password: Password123!)
INSERT INTO users (email, phone, password, full_name, role, enabled)
SELECT 'member@iheartev.local', '0901234567', '$2a$10$F8kQ3nYmuAiLp3chCrB8J.WAtc9XtcZJls2NuOpej7EMkKU7ct4dq', 'John Member', 'MEMBER', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'member@iheartev.local');

INSERT INTO users (email, phone, password, full_name, role, enabled)
SELECT 'seller1@iheartev.local', '0912345678', '$2a$10$F8kQ3nYmuAiLp3chCrB8J.WAtc9XtcZJls2NuOpej7EMkKU7ct4dq', 'Alice Seller', 'MEMBER', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'seller1@iheartev.local');

INSERT INTO users (email, phone, password, full_name, role, enabled)
SELECT 'seller2@iheartev.local', '0923456789', '$2a$10$F8kQ3nYmuAiLp3chCrB8J.WAtc9XtcZJls2NuOpej7EMkKU7ct4dq', 'Bob Johnson', 'MEMBER', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'seller2@iheartev.local');

INSERT INTO users (email, phone, password, full_name, role, enabled)
SELECT 'buyer1@iheartev.local', '0934567890', '$2a$10$F8kQ3nYmuAiLp3chCrB8J.WAtc9XtcZJls2NuOpej7EMkKU7ct4dq', 'Charlie Buyer', 'MEMBER', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'buyer1@iheartev.local');

INSERT INTO users (email, phone, password, full_name, role, enabled)
SELECT 'buyer2@iheartev.local', '0945678901', '$2a$10$F8kQ3nYmuAiLp3chCrB8J.WAtc9XtcZJls2NuOpej7EMkKU7ct4dq', 'Diana Smith', 'MEMBER', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'buyer2@iheartev.local');

-- ============================================
-- PAYMENT INFO (For Listings)
-- ============================================

-- Payment Info for VinFast e34 (Cash)
INSERT INTO payment_info (paymentMethod)
SELECT 'CASH'
WHERE NOT EXISTS (SELECT 1 FROM payment_info WHERE id = 1);

-- Payment Info for Tesla Model 3 (VietQR)
INSERT INTO payment_info (paymentMethod, bankCode, bankName, accountNumber, amount, transactionContent)
SELECT 'VIETQR', 'VCB', 'Vietcombank', '001234567890', 32000.00, 'Mua xe Tesla Model 3 - Order #TSL001'
WHERE NOT EXISTS (SELECT 1 FROM payment_info WHERE id = 2);

-- Payment Info for Porsche Taycan (VietQR)
INSERT INTO payment_info (paymentMethod, bankCode, bankName, accountNumber, amount, transactionContent)
SELECT 'VIETQR', 'TCB', 'Techcombank', '987654321000', 85000.00, 'Mua xe Porsche Taycan - Order #POR001'
WHERE NOT EXISTS (SELECT 1 FROM payment_info WHERE id = 3);

-- Payment Info for Nissan Leaf (Cash)
INSERT INTO payment_info (paymentMethod)
SELECT 'CASH'
WHERE NOT EXISTS (SELECT 1 FROM payment_info WHERE id = 4);

-- Payment Info for BMW iX3 (VietQR)
INSERT INTO payment_info (paymentMethod, bankCode, bankName, accountNumber, amount, transactionContent)
SELECT 'VIETQR', 'BIDV', 'BIDV', '555555555555', 45000.00, 'Mua xe BMW iX3 - Order #BMW001'
WHERE NOT EXISTS (SELECT 1 FROM payment_info WHERE id = 5);

-- ============================================
-- LISTINGS (EVs and Batteries)
-- ============================================

-- EV Listings - Active
INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id, payment_info_id)
SELECT 'EV', 'VinFast', 'VF e34', 2022, 15000, 42, 'used', 'Well-maintained VinFast e34 with low mileage. Single owner, regular maintenance. Perfect condition interior and exterior. Battery health at 95%.', 18000.00, 'ACTIVE', SYSDATETIME(), (SELECT id FROM users WHERE email = 'member@iheartev.local'), 1
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE brand = 'VinFast' AND model = 'VF e34' AND seller_id = (SELECT id FROM users WHERE email = 'member@iheartev.local'));

INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id, payment_info_id)
SELECT 'EV', 'Tesla', 'Model 3', 2021, 25000, 60, 'verified', 'Tesla Model 3 Long Range. Fully loaded with autopilot. Excellent condition. All software updates installed. Clean title.', 32000.00, 'ACTIVE', SYSDATETIME(), (SELECT id FROM users WHERE email = 'seller1@iheartev.local'), 2
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE brand = 'Tesla' AND model = 'Model 3' AND seller_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local'));

INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id, payment_info_id)
SELECT 'EV', 'Porsche', 'Taycan', 2023, 5000, 93.4, 'used', 'Porsche Taycan Turbo S. Like new condition, garage kept. Full warranty remaining. Low mileage, perfect for luxury EV enthusiasts.', 85000.00, 'ACTIVE', SYSDATETIME(), (SELECT id FROM users WHERE email = 'seller1@iheartev.local'), 3
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE brand = 'Porsche' AND model = 'Taycan' AND seller_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local'));

INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id, payment_info_id)
SELECT 'EV', 'Nissan', 'Leaf', 2020, 35000, 40, 'used', 'Nissan Leaf reliable daily driver. Good battery health. Well maintained, ready to drive. Great for city commuting.', 14000.00, 'ACTIVE', SYSDATETIME(), (SELECT id FROM users WHERE email = 'seller2@iheartev.local'), 4
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE brand = 'Nissan' AND model = 'Leaf' AND seller_id = (SELECT id FROM users WHERE email = 'seller2@iheartev.local'));

INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id, payment_info_id)
SELECT 'EV', 'BMW', 'iX3', 2022, 18000, 80, 'verified', 'BMW iX3 in excellent condition. Premium package included. Low mileage, one owner. Full service history available.', 45000.00, 'ACTIVE', SYSDATETIME(), (SELECT id FROM users WHERE email = 'seller2@iheartev.local'), 5
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE brand = 'BMW' AND model = 'iX3' AND seller_id = (SELECT id FROM users WHERE email = 'seller2@iheartev.local'));

-- Additional Payment Info entries for batteries
INSERT INTO payment_info (paymentMethod)
SELECT 'CASH'
WHERE NOT EXISTS (SELECT 1 FROM payment_info WHERE id = 6);

INSERT INTO payment_info (paymentMethod, bankCode, bankName, accountNumber, amount, transactionContent)
SELECT 'VIETQR', 'ACB', 'ACB', '111222333444', 2800.00, 'Mua pin CATL - Order #BAT001'
WHERE NOT EXISTS (SELECT 1 FROM payment_info WHERE id = 7);

INSERT INTO payment_info (paymentMethod)
SELECT 'CASH'
WHERE NOT EXISTS (SELECT 1 FROM payment_info WHERE id = 8);

-- Battery Listings - Active
INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id, payment_info_id)
SELECT 'BATTERY', 'LG Chem', 'LGX E63', 2021, NULL, 63, 'used', 'LG Chem battery pack from 2021 model. 85% capacity remaining. Good for EV conversion projects or replacement. Tested and verified.', 3500.00, 'ACTIVE', SYSDATETIME(), (SELECT id FROM users WHERE email = 'seller1@iheartev.local'), 6
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE type = 'BATTERY' AND brand = 'LG Chem' AND seller_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local'));

INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id, payment_info_id)
SELECT 'BATTERY', 'CATL', 'NCM 811', 2022, NULL, 55, 'verified', 'CATL battery module from electric vehicle. High energy density. Excellent condition, 90% capacity. Perfect for energy storage or EV projects.', 2800.00, 'ACTIVE', SYSDATETIME(), (SELECT id FROM users WHERE email = 'seller2@iheartev.local'), 7
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE type = 'BATTERY' AND brand = 'CATL' AND seller_id = (SELECT id FROM users WHERE email = 'seller2@iheartev.local'));

INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id, payment_info_id)
SELECT 'BATTERY', 'Panasonic', '2170 Cell', 2020, NULL, 75, 'used', 'Panasonic 2170 cells from Tesla battery pack. Good capacity retention. Suitable for EV upgrades or home energy storage.', 4200.00, 'ACTIVE', SYSDATETIME(), (SELECT id FROM users WHERE email = 'member@iheartev.local'), 8
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE type = 'BATTERY' AND brand = 'Panasonic' AND seller_id = (SELECT id FROM users WHERE email = 'member@iheartev.local'));

-- Additional Payment Info for sold listing
INSERT INTO payment_info (paymentMethod)
SELECT 'CASH'
WHERE NOT EXISTS (SELECT 1 FROM payment_info WHERE id = 9);

-- Sold Listings (for testing completed transactions)
INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id, payment_info_id)
SELECT 'EV', 'Chevrolet', 'Bolt EV', 2019, 40000, 60, 'used', 'Chevrolet Bolt EV. Reliable commuter car. Well maintained, good battery health. SOLD.', 16000.00, 'SOLD', DATEADD(DAY, -30, SYSDATETIME()), (SELECT id FROM users WHERE email = 'seller1@iheartev.local'), 9
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE brand = 'Chevrolet' AND model = 'Bolt EV' AND status = 'SOLD');

-- ============================================
-- ORDERS (Various statuses with new fields)
-- ============================================

-- Pending Order for Tesla Model 3
INSERT INTO orders (listing_id, buyer_id, amount, status, created_at, updated_at, buyer_payment_confirmed, seller_payment_received)
SELECT 
    (SELECT id FROM listings WHERE brand = 'Tesla' AND model = 'Model 3' AND seller_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local')),
    (SELECT id FROM users WHERE email = 'buyer1@iheartev.local'),
    (SELECT price FROM listings WHERE brand = 'Tesla' AND model = 'Model 3' AND seller_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local')),
    'PENDING',
    DATEADD(DAY, -5, SYSDATETIME()),
    DATEADD(DAY, -5, SYSDATETIME()),
    0,
    0
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE buyer_id = (SELECT id FROM users WHERE email = 'buyer1@iheartev.local') AND listing_id = (SELECT id FROM listings WHERE brand = 'Tesla' AND model = 'Model 3'));

-- Pending Order for BMW iX3
INSERT INTO orders (listing_id, buyer_id, amount, status, created_at, updated_at, buyer_payment_confirmed, seller_payment_received)
SELECT 
    (SELECT id FROM listings WHERE brand = 'BMW' AND model = 'iX3' AND seller_id = (SELECT id FROM users WHERE email = 'seller2@iheartev.local')),
    (SELECT id FROM users WHERE email = 'buyer2@iheartev.local'),
    (SELECT price FROM listings WHERE brand = 'BMW' AND model = 'iX3' AND seller_id = (SELECT id FROM users WHERE email = 'seller2@iheartev.local')),
    'PENDING',
    DATEADD(DAY, -2, SYSDATETIME()),
    DATEADD(DAY, -2, SYSDATETIME()),
    0,
    0
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE buyer_id = (SELECT id FROM users WHERE email = 'buyer2@iheartev.local') AND listing_id = (SELECT id FROM listings WHERE brand = 'BMW' AND model = 'iX3'));

-- Paid Order (buyer confirmed payment)
INSERT INTO orders (listing_id, buyer_id, amount, status, created_at, updated_at, buyer_payment_confirmed, buyer_payment_confirmed_at, seller_payment_received)
SELECT 
    (SELECT id FROM listings WHERE brand = 'VinFast' AND model = 'VF e34' AND seller_id = (SELECT id FROM users WHERE email = 'member@iheartev.local')),
    (SELECT id FROM users WHERE email = 'buyer1@iheartev.local'),
    (SELECT price FROM listings WHERE brand = 'VinFast' AND model = 'VF e34' AND seller_id = (SELECT id FROM users WHERE email = 'member@iheartev.local')),
    'PAID',
    DATEADD(DAY, -10, SYSDATETIME()),
    DATEADD(DAY, -8, SYSDATETIME()),
    1,
    DATEADD(DAY, -8, SYSDATETIME()),
    0
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE buyer_id = (SELECT id FROM users WHERE email = 'buyer1@iheartev.local') AND listing_id = (SELECT id FROM listings WHERE brand = 'VinFast' AND model = 'VF e34'));

-- Closed Order (completed transaction)
INSERT INTO orders (listing_id, buyer_id, amount, status, created_at, updated_at, buyer_payment_confirmed, buyer_payment_confirmed_at, seller_payment_received, seller_payment_received_at, closed_at)
SELECT 
    (SELECT id FROM listings WHERE brand = 'Chevrolet' AND model = 'Bolt EV' AND status = 'SOLD'),
    (SELECT id FROM users WHERE email = 'buyer1@iheartev.local'),
    16000.00,
    'CLOSED',
    DATEADD(DAY, -35, SYSDATETIME()),
    DATEADD(DAY, -30, SYSDATETIME()),
    1,
    DATEADD(DAY, -32, SYSDATETIME()),
    1,
    DATEADD(DAY, -31, SYSDATETIME()),
    DATEADD(DAY, -30, SYSDATETIME())
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE listing_id = (SELECT id FROM listings WHERE brand = 'Chevrolet' AND model = 'Bolt EV'));

-- Cancelled Order  
INSERT INTO orders (listing_id, buyer_id, amount, status, created_at, updated_at, buyer_payment_confirmed, seller_payment_received, cancelled_by, cancellation_reason, cancelled_at)
SELECT 
    (SELECT id FROM listings WHERE type = 'BATTERY' AND brand = 'LG Chem' AND seller_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local')),
    (SELECT id FROM users WHERE email = 'buyer2@iheartev.local'),
    3500.00,
    'CANCELLED',
    DATEADD(DAY, -7, SYSDATETIME()),
    DATEADD(DAY, -6, SYSDATETIME()),
    0,
    0,
    'BUYER',
    'Changed my mind, found a better option',
    DATEADD(DAY, -6, SYSDATETIME())
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE buyer_id = (SELECT id FROM users WHERE email = 'buyer2@iheartev.local') AND listing_id = (SELECT id FROM listings WHERE type = 'BATTERY' AND brand = 'LG Chem'));

-- ============================================
-- REVIEWS (User-to-User reviews with order_id)
-- ============================================

-- Review from buyer1 to seller1 (for closed order)
INSERT INTO reviews (reviewer_id, reviewee_id, rating, comment, created_at, updated_at, edit_count, order_id)
SELECT 
    (SELECT id FROM users WHERE email = 'buyer1@iheartev.local'),
    (SELECT id FROM users WHERE email = 'seller1@iheartev.local'),
    5,
    'Excellent seller! Fast response, honest description. The car was exactly as described. Highly recommended!',
    DATEADD(DAY, -28, SYSDATETIME()),
    DATEADD(DAY, -28, SYSDATETIME()),
    0,
    (SELECT id FROM orders WHERE listing_id = (SELECT id FROM listings WHERE brand = 'Chevrolet' AND model = 'Bolt EV') AND status = 'CLOSED')
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE reviewer_id = (SELECT id FROM users WHERE email = 'buyer1@iheartev.local') AND reviewee_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local') AND order_id IS NOT NULL);

-- Review from seller1 to buyer1
INSERT INTO reviews (reviewer_id, reviewee_id, rating, comment, created_at, updated_at, edit_count, order_id)
SELECT 
    (SELECT id FROM users WHERE email = 'seller1@iheartev.local'),
    (SELECT id FROM users WHERE email = 'buyer1@iheartev.local'),
    5,
    'Great buyer! Quick payment, smooth transaction. Would definitely sell to again.',
    DATEADD(DAY, -27, SYSDATETIME()),
    DATEADD(DAY, -27, SYSDATETIME()),
    0,
    (SELECT id FROM orders WHERE listing_id = (SELECT id FROM listings WHERE brand = 'Chevrolet' AND model = 'Bolt EV') AND status = 'CLOSED')
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE reviewer_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local') AND reviewee_id = (SELECT id FROM users WHERE email = 'buyer1@iheartev.local') AND order_id IS NOT NULL);

-- Review from buyer2 to seller2
INSERT INTO reviews (reviewer_id, reviewee_id, rating, comment, created_at, updated_at, edit_count)
SELECT 
    (SELECT id FROM users WHERE email = 'buyer2@iheartev.local'),
    (SELECT id FROM users WHERE email = 'seller2@iheartev.local'),
    4,
    'Good experience overall. Product was in good condition. Minor delay in delivery but seller was communicative.',
    DATEADD(DAY, -20, SYSDATETIME()),
    DATEADD(DAY, -20, SYSDATETIME()),
    0
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE reviewer_id = (SELECT id FROM users WHERE email = 'buyer2@iheartev.local') AND reviewee_id = (SELECT id FROM users WHERE email = 'seller2@iheartev.local') AND order_id IS NULL);

-- Review from member to seller2
INSERT INTO reviews (reviewer_id, reviewee_id, rating, comment, created_at, updated_at, edit_count)
SELECT 
    (SELECT id FROM users WHERE email = 'member@iheartev.local'),
    (SELECT id FROM users WHERE email = 'seller2@iheartev.local'),
    3,
    'Decent seller. Product as described but could improve communication during transaction.',
    DATEADD(DAY, -15, SYSDATETIME()),
    DATEADD(DAY, -15, SYSDATETIME()),
    0
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE reviewer_id = (SELECT id FROM users WHERE email = 'member@iheartev.local') AND reviewee_id = (SELECT id FROM users WHERE email = 'seller2@iheartev.local'));

-- Additional reviews for seller1 (to show rating diversity)
INSERT INTO reviews (reviewer_id, reviewee_id, rating, comment, created_at, updated_at, edit_count)
SELECT 
    (SELECT id FROM users WHERE email = 'member@iheartev.local'),
    (SELECT id FROM users WHERE email = 'seller1@iheartev.local'),
    5,
    'Outstanding seller! Very professional, great communication, and product exceeded expectations.',
    DATEADD(DAY, -25, SYSDATETIME()),
    DATEADD(DAY, -25, SYSDATETIME()),
    0
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE reviewer_id = (SELECT id FROM users WHERE email = 'member@iheartev.local') AND reviewee_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local'));

-- ============================================
-- FAVORITES (Users favoriting listings)
-- ============================================

-- Favorites for buyer1
INSERT INTO favorites (user_id, listing_id)
SELECT 
    (SELECT id FROM users WHERE email = 'buyer1@iheartev.local'),
    (SELECT id FROM listings WHERE brand = 'Porsche' AND model = 'Taycan' AND seller_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local'))
WHERE NOT EXISTS (SELECT 1 FROM favorites WHERE user_id = (SELECT id FROM users WHERE email = 'buyer1@iheartev.local') AND listing_id = (SELECT id FROM listings WHERE brand = 'Porsche' AND model = 'Taycan'));

INSERT INTO favorites (user_id, listing_id)
SELECT 
    (SELECT id FROM users WHERE email = 'buyer1@iheartev.local'),
    (SELECT id FROM listings WHERE brand = 'BMW' AND model = 'iX3' AND seller_id = (SELECT id FROM users WHERE email = 'seller2@iheartev.local'))
WHERE NOT EXISTS (SELECT 1 FROM favorites WHERE user_id = (SELECT id FROM users WHERE email = 'buyer1@iheartev.local') AND listing_id = (SELECT id FROM listings WHERE brand = 'BMW' AND model = 'iX3'));

-- Favorites for buyer2
INSERT INTO favorites (user_id, listing_id)
SELECT 
    (SELECT id FROM users WHERE email = 'buyer2@iheartev.local'),
    (SELECT id FROM listings WHERE brand = 'VinFast' AND model = 'VF e34' AND seller_id = (SELECT id FROM users WHERE email = 'member@iheartev.local'))
WHERE NOT EXISTS (SELECT 1 FROM favorites WHERE user_id = (SELECT id FROM users WHERE email = 'buyer2@iheartev.local') AND listing_id = (SELECT id FROM listings WHERE brand = 'VinFast' AND model = 'VF e34'));

INSERT INTO favorites (user_id, listing_id)
SELECT 
    (SELECT id FROM users WHERE email = 'buyer2@iheartev.local'),
    (SELECT id FROM listings WHERE type = 'BATTERY' AND brand = 'CATL' AND seller_id = (SELECT id FROM users WHERE email = 'seller2@iheartev.local'))
WHERE NOT EXISTS (SELECT 1 FROM favorites WHERE user_id = (SELECT id FROM users WHERE email = 'buyer2@iheartev.local') AND listing_id = (SELECT id FROM listings WHERE type = 'BATTERY' AND brand = 'CATL'));

-- Favorites for member
INSERT INTO favorites (user_id, listing_id)
SELECT 
    (SELECT id FROM users WHERE email = 'member@iheartev.local'),
    (SELECT id FROM listings WHERE brand = 'Tesla' AND model = 'Model 3' AND seller_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local'))
WHERE NOT EXISTS (SELECT 1 FROM favorites WHERE user_id = (SELECT id FROM users WHERE email = 'member@iheartev.local') AND listing_id = (SELECT id FROM listings WHERE brand = 'Tesla' AND model = 'Model 3'));

INSERT INTO favorites (user_id, listing_id)
SELECT 
    (SELECT id FROM users WHERE email = 'member@iheartev.local'),
    (SELECT id FROM listings WHERE type = 'BATTERY' AND brand = 'Panasonic' AND seller_id = (SELECT id FROM users WHERE email = 'member@iheartev.local'))
WHERE NOT EXISTS (SELECT 1 FROM favorites WHERE user_id = (SELECT id FROM users WHERE email = 'member@iheartev.local') AND listing_id = (SELECT id FROM listings WHERE type = 'BATTERY' AND brand = 'Panasonic'));
