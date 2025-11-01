-- ============================================
-- COMPREHENSIVE SEED DATA FOR iHeartEV PLATFORM
-- ============================================

-- ============================================
-- USERS (Members and Admin)
-- All passwords are: Password123!
-- BCrypt hash: $2a$10$hXv1m1y3oZp5kz1R2s7OgeBlyuJuZql5y4rT9lS8Z3Vw3n3o3nPiq
-- ============================================

-- Admin user (password: Admin@123)
INSERT INTO users (email, phone, password, full_name, role, enabled)
SELECT 'admin@iheartev.local', '', '$2a$10$hXv1m1y3oZp5kz1R2s7OgeBlyuJuZql5y4rT9lS8Z3Vw3n3o3nPiq', 'System Admin', 'ADMIN', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@iheartev.local');

-- Member users (password: Member@123)
INSERT INTO users (email, phone, password, full_name, role, enabled)
SELECT 'member@iheartev.local', '0901234567', '$2a$10$hXv1m1y3oZp5kz1R2s7OgeBlyuJuZql5y4rT9lS8Z3Vw3n3o3nPiq', 'John Member', 'MEMBER', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'member@iheartev.local');

INSERT INTO users (email, phone, password, full_name, role, enabled)
SELECT 'seller1@iheartev.local', '0912345678', '$2a$10$hXv1m1y3oZp5kz1R2s7OgeBlyuJuZql5y4rT9lS8Z3Vw3n3o3nPiq', 'Alice Seller', 'MEMBER', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'seller1@iheartev.local');

INSERT INTO users (email, phone, password, full_name, role, enabled)
SELECT 'seller2@iheartev.local', '0923456789', '$2a$10$hXv1m1y3oZp5kz1R2s7OgeBlyuJuZql5y4rT9lS8Z3Vw3n3o3nPiq', 'Bob Johnson', 'MEMBER', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'seller2@iheartev.local');

INSERT INTO users (email, phone, password, full_name, role, enabled)
SELECT 'buyer1@iheartev.local', '0934567890', '$2a$10$hXv1m1y3oZp5kz1R2s7OgeBlyuJuZql5y4rT9lS8Z3Vw3n3o3nPiq', 'Charlie Buyer', 'MEMBER', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'buyer1@iheartev.local');

INSERT INTO users (email, phone, password, full_name, role, enabled)
SELECT 'buyer2@iheartev.local', '0945678901', '$2a$10$hXv1m1y3oZp5kz1R2s7OgeBlyuJuZql5y4rT9lS8Z3Vw3n3o3nPiq', 'Diana Smith', 'MEMBER', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'buyer2@iheartev.local');

-- ============================================
-- LISTINGS (EVs and Batteries)
-- ============================================

-- EV Listings - Active
INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id)
SELECT 'EV', 'VinFast', 'VF e34', 2022, 15000, 42, 'used', 'Well-maintained VinFast e34 with low mileage. Single owner, regular maintenance. Perfect condition interior and exterior. Battery health at 95%.', 18000.00, 'ACTIVE', SYSDATETIME(), (SELECT id FROM users WHERE email = 'member@iheartev.local')
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE brand = 'VinFast' AND model = 'VF e34' AND seller_id = (SELECT id FROM users WHERE email = 'member@iheartev.local'));

INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id)
SELECT 'EV', 'Tesla', 'Model 3', 2021, 25000, 60, 'verified', 'Tesla Model 3 Long Range. Fully loaded with autopilot. Excellent condition. All software updates installed. Clean title.', 32000.00, 'ACTIVE', SYSDATETIME(), (SELECT id FROM users WHERE email = 'seller1@iheartev.local')
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE brand = 'Tesla' AND model = 'Model 3' AND seller_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local'));

INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id)
SELECT 'EV', 'Porsche', 'Taycan', 2023, 5000, 93.4, 'used', 'Porsche Taycan Turbo S. Like new condition, garage kept. Full warranty remaining. Low mileage, perfect for luxury EV enthusiasts.', 85000.00, 'ACTIVE', SYSDATETIME(), (SELECT id FROM users WHERE email = 'seller1@iheartev.local')
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE brand = 'Porsche' AND model = 'Taycan' AND seller_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local'));

INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id)
SELECT 'EV', 'Nissan', 'Leaf', 2020, 35000, 40, 'used', 'Nissan Leaf reliable daily driver. Good battery health. Well maintained, ready to drive. Great for city commuting.', 14000.00, 'ACTIVE', SYSDATETIME(), (SELECT id FROM users WHERE email = 'seller2@iheartev.local')
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE brand = 'Nissan' AND model = 'Leaf' AND seller_id = (SELECT id FROM users WHERE email = 'seller2@iheartev.local'));

INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id)
SELECT 'EV', 'BMW', 'iX3', 2022, 18000, 80, 'verified', 'BMW iX3 in excellent condition. Premium package included. Low mileage, one owner. Full service history available.', 45000.00, 'ACTIVE', SYSDATETIME(), (SELECT id FROM users WHERE email = 'seller2@iheartev.local')
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE brand = 'BMW' AND model = 'iX3' AND seller_id = (SELECT id FROM users WHERE email = 'seller2@iheartev.local'));

-- Battery Listings - Active
INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id)
SELECT 'BATTERY', 'LG Chem', 'LGX E63', 2021, NULL, 63, 'used', 'LG Chem battery pack from 2021 model. 85% capacity remaining. Good for EV conversion projects or replacement. Tested and verified.', 3500.00, 'ACTIVE', SYSDATETIME(), (SELECT id FROM users WHERE email = 'seller1@iheartev.local')
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE type = 'BATTERY' AND brand = 'LG Chem' AND seller_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local'));

INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id)
SELECT 'BATTERY', 'CATL', 'NCM 811', 2022, NULL, 55, 'verified', 'CATL battery module from electric vehicle. High energy density. Excellent condition, 90% capacity. Perfect for energy storage or EV projects.', 2800.00, 'ACTIVE', SYSDATETIME(), (SELECT id FROM users WHERE email = 'seller2@iheartev.local')
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE type = 'BATTERY' AND brand = 'CATL' AND seller_id = (SELECT id FROM users WHERE email = 'seller2@iheartev.local'));

INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id)
SELECT 'BATTERY', 'Panasonic', '2170 Cell', 2020, NULL, 75, 'used', 'Panasonic 2170 cells from Tesla battery pack. Good capacity retention. Suitable for EV upgrades or home energy storage.', 4200.00, 'ACTIVE', SYSDATETIME(), (SELECT id FROM users WHERE email = 'member@iheartev.local')
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE type = 'BATTERY' AND brand = 'Panasonic' AND seller_id = (SELECT id FROM users WHERE email = 'member@iheartev.local'));

-- Draft Listings (for testing draft functionality)
INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id)
SELECT 'EV', 'Hyundai', 'Ioniq 5', 2023, 8000, 77.4, 'used', 'Hyundai Ioniq 5 Limited. Ultra fast charging capable. Like new condition. Considering sale.', 38000.00, 'DRAFT', SYSDATETIME(), (SELECT id FROM users WHERE email = 'member@iheartev.local')
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE brand = 'Hyundai' AND model = 'Ioniq 5' AND status = 'DRAFT' AND seller_id = (SELECT id FROM users WHERE email = 'member@iheartev.local'));

-- Sold Listings (for testing completed transactions)
INSERT INTO listings (type, brand, model, year, mileage_km, battery_capacitykwh, condition_label, description, price, status, created_at, seller_id)
SELECT 'EV', 'Chevrolet', 'Bolt EV', 2019, 40000, 60, 'used', 'Chevrolet Bolt EV. Reliable commuter car. Well maintained, good battery health. SOLD.', 16000.00, 'SOLD', DATEADD(DAY, -30, SYSDATETIME()), (SELECT id FROM users WHERE email = 'seller1@iheartev.local')
WHERE NOT EXISTS (SELECT 1 FROM listings WHERE brand = 'Chevrolet' AND model = 'Bolt EV' AND status = 'SOLD');

-- ============================================
-- ORDERS (Various statuses)
-- ============================================

-- Pending Orders
INSERT INTO orders (listing_id, buyer_id, amount, status, created_at)
SELECT 
    (SELECT id FROM listings WHERE brand = 'Tesla' AND model = 'Model 3' AND seller_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local')),
    (SELECT id FROM users WHERE email = 'buyer1@iheartev.local'),
    (SELECT price FROM listings WHERE brand = 'Tesla' AND model = 'Model 3' AND seller_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local')),
    'PENDING',
    DATEADD(DAY, -5, SYSDATETIME())
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE buyer_id = (SELECT id FROM users WHERE email = 'buyer1@iheartev.local') AND listing_id = (SELECT id FROM listings WHERE brand = 'Tesla' AND model = 'Model 3'));

INSERT INTO orders (listing_id, buyer_id, amount, status, created_at)
SELECT 
    (SELECT id FROM listings WHERE brand = 'BMW' AND model = 'iX3' AND seller_id = (SELECT id FROM users WHERE email = 'seller2@iheartev.local')),
    (SELECT id FROM users WHERE email = 'buyer2@iheartev.local'),
    (SELECT price FROM listings WHERE brand = 'BMW' AND model = 'iX3' AND seller_id = (SELECT id FROM users WHERE email = 'seller2@iheartev.local')),
    'PENDING',
    DATEADD(DAY, -2, SYSDATETIME())
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE buyer_id = (SELECT id FROM users WHERE email = 'buyer2@iheartev.local') AND listing_id = (SELECT id FROM listings WHERE brand = 'BMW' AND model = 'iX3'));

-- Paid Orders
INSERT INTO orders (listing_id, buyer_id, amount, status, created_at)
SELECT 
    (SELECT id FROM listings WHERE brand = 'VinFast' AND model = 'VF e34' AND seller_id = (SELECT id FROM users WHERE email = 'member@iheartev.local')),
    (SELECT id FROM users WHERE email = 'buyer1@iheartev.local'),
    (SELECT price FROM listings WHERE brand = 'VinFast' AND model = 'VF e34' AND seller_id = (SELECT id FROM users WHERE email = 'member@iheartev.local')),
    'PAID',
    DATEADD(DAY, -10, SYSDATETIME())
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE buyer_id = (SELECT id FROM users WHERE email = 'buyer1@iheartev.local') AND listing_id = (SELECT id FROM listings WHERE brand = 'VinFast' AND model = 'VF e34'));

-- Cancelled Orders
INSERT INTO orders (listing_id, buyer_id, amount, status, created_at)
SELECT 
    (SELECT id FROM listings WHERE type = 'BATTERY' AND brand = 'LG Chem' AND seller_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local')),
    (SELECT id FROM users WHERE email = 'buyer2@iheartev.local'),
    (SELECT price FROM listings WHERE type = 'BATTERY' AND brand = 'LG Chem' AND seller_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local')),
    'CANCELLED',
    DATEADD(DAY, -7, SYSDATETIME())
WHERE NOT EXISTS (SELECT 1 FROM orders WHERE buyer_id = (SELECT id FROM users WHERE email = 'buyer2@iheartev.local') AND listing_id = (SELECT id FROM listings WHERE type = 'BATTERY' AND brand = 'LG Chem'));

-- ============================================
-- REVIEWS (User-to-User reviews)
-- ============================================

-- Reviews between users
INSERT INTO reviews (reviewer_id, reviewee_id, rating, comment, created_at)
SELECT 
    (SELECT id FROM users WHERE email = 'buyer1@iheartev.local'),
    (SELECT id FROM users WHERE email = 'seller1@iheartev.local'),
    5,
    'Excellent seller! Fast response, honest description. The Tesla Model 3 was exactly as described. Highly recommended!',
    DATEADD(DAY, -8, SYSDATETIME())
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE reviewer_id = (SELECT id FROM users WHERE email = 'buyer1@iheartev.local') AND reviewee_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local'));

INSERT INTO reviews (reviewer_id, reviewee_id, rating, comment, created_at)
SELECT 
    (SELECT id FROM users WHERE email = 'buyer2@iheartev.local'),
    (SELECT id FROM users WHERE email = 'seller2@iheartev.local'),
    4,
    'Good experience overall. Car was in good condition. Minor delay in delivery but seller was communicative.',
    DATEADD(DAY, -12, SYSDATETIME())
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE reviewer_id = (SELECT id FROM users WHERE email = 'buyer2@iheartev.local') AND reviewee_id = (SELECT id FROM users WHERE email = 'seller2@iheartev.local'));

INSERT INTO reviews (reviewer_id, reviewee_id, rating, comment, created_at)
SELECT 
    (SELECT id FROM users WHERE email = 'seller1@iheartev.local'),
    (SELECT id FROM users WHERE email = 'buyer1@iheartev.local'),
    5,
    'Great buyer! Quick payment, smooth transaction. Would definitely sell to again.',
    DATEADD(DAY, -9, SYSDATETIME())
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE reviewer_id = (SELECT id FROM users WHERE email = 'seller1@iheartev.local') AND reviewee_id = (SELECT id FROM users WHERE email = 'buyer1@iheartev.local'));

INSERT INTO reviews (reviewer_id, reviewee_id, rating, comment, created_at)
SELECT 
    (SELECT id FROM users WHERE email = 'member@iheartev.local'),
    (SELECT id FROM users WHERE email = 'seller2@iheartev.local'),
    3,
    'Decent seller. Product as described but could improve communication during transaction.',
    DATEADD(DAY, -15, SYSDATETIME())
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE reviewer_id = (SELECT id FROM users WHERE email = 'member@iheartev.local') AND reviewee_id = (SELECT id FROM users WHERE email = 'seller2@iheartev.local'));

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
