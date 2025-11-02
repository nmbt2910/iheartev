-- Migration script to add missing columns to reviews and orders tables
-- Run this script in SQL Server Management Studio or via sqlcmd

-- ============================================
-- REVIEWS TABLE
-- Using snake_case to match existing schema
-- ============================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'reviews') AND name = 'updated_at')
BEGIN
    ALTER TABLE reviews ADD updated_at DATETIME2;
    PRINT 'Added updated_at column to reviews table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'reviews') AND name = 'edit_count')
BEGIN
    ALTER TABLE reviews ADD edit_count INT DEFAULT 0;
    PRINT 'Added edit_count column to reviews table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'reviews') AND name = 'order_id')
BEGIN
    ALTER TABLE reviews ADD order_id BIGINT NULL;
    PRINT 'Added order_id column to reviews table';
END
GO

-- Update existing rows
UPDATE reviews SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE reviews SET edit_count = 0 WHERE edit_count IS NULL;
GO

-- ============================================
-- ORDERS TABLE
-- Using snake_case to match existing schema
-- ============================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'orders') AND name = 'updated_at')
BEGIN
    ALTER TABLE orders ADD updated_at DATETIME2;
    PRINT 'Added updated_at column to orders table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'orders') AND name = 'cancelled_by')
BEGIN
    ALTER TABLE orders ADD cancelled_by NVARCHAR(50) NULL;
    PRINT 'Added cancelled_by column to orders table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'orders') AND name = 'cancellation_reason')
BEGIN
    ALTER TABLE orders ADD cancellation_reason NVARCHAR(500) NULL;
    PRINT 'Added cancellation_reason column to orders table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'orders') AND name = 'cancelled_at')
BEGIN
    ALTER TABLE orders ADD cancelled_at DATETIME2 NULL;
    PRINT 'Added cancelled_at column to orders table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'orders') AND name = 'buyer_payment_confirmed')
BEGIN
    ALTER TABLE orders ADD buyer_payment_confirmed BIT DEFAULT 0;
    PRINT 'Added buyer_payment_confirmed column to orders table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'orders') AND name = 'buyer_payment_confirmed_at')
BEGIN
    ALTER TABLE orders ADD buyer_payment_confirmed_at DATETIME2 NULL;
    PRINT 'Added buyer_payment_confirmed_at column to orders table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'orders') AND name = 'seller_payment_received')
BEGIN
    ALTER TABLE orders ADD seller_payment_received BIT DEFAULT 0;
    PRINT 'Added seller_payment_received column to orders table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'orders') AND name = 'seller_payment_received_at')
BEGIN
    ALTER TABLE orders ADD seller_payment_received_at DATETIME2 NULL;
    PRINT 'Added seller_payment_received_at column to orders table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'orders') AND name = 'closed_at')
BEGIN
    ALTER TABLE orders ADD closed_at DATETIME2 NULL;
    PRINT 'Added closed_at column to orders table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'orders') AND name = 'buyer_review_id')
BEGIN
    ALTER TABLE orders ADD buyer_review_id BIGINT NULL;
    PRINT 'Added buyer_review_id column to orders table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'orders') AND name = 'seller_review_id')
BEGIN
    ALTER TABLE orders ADD seller_review_id BIGINT NULL;
    PRINT 'Added seller_review_id column to orders table';
END
GO

-- Update existing orders
UPDATE orders SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE orders SET buyer_payment_confirmed = 0 WHERE buyer_payment_confirmed IS NULL;
UPDATE orders SET seller_payment_received = 0 WHERE seller_payment_received IS NULL;
GO

PRINT 'Migration completed successfully!';
GO

