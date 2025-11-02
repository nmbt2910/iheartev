-- Migration script to add new columns to reviews table
-- Run this if Hibernate auto-update doesn't work

-- Add updatedAt column if it doesn't exist
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'reviews') AND name = 'updatedAt')
BEGIN
    ALTER TABLE reviews ADD updatedAt DATETIME2;
    -- Set existing rows to have updatedAt = createdAt
    UPDATE reviews SET updatedAt = createdAt WHERE updatedAt IS NULL;
END
GO

-- Add editCount column if it doesn't exist
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'reviews') AND name = 'editCount')
BEGIN
    ALTER TABLE reviews ADD editCount INT DEFAULT 0;
    -- Set existing rows to have editCount = 0
    UPDATE reviews SET editCount = 0 WHERE editCount IS NULL;
END
GO

-- Add orderId column if it doesn't exist
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'reviews') AND name = 'orderId')
BEGIN
    ALTER TABLE reviews ADD orderId BIGINT NULL;
END
GO
