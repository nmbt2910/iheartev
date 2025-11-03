-- Migration script to add listing approval workflow columns
-- Run this script in SQL Server Management Studio or via sqlcmd

-- ============================================
-- LISTINGS TABLE
-- Add columns for approval workflow
-- ============================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'listings') AND name = 'edited_after_rejection')
BEGIN
    ALTER TABLE listings ADD edited_after_rejection BIT DEFAULT 0;
    PRINT 'Added edited_after_rejection column to listings table';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'listings') AND name = 'deleted_at')
BEGIN
    ALTER TABLE listings ADD deleted_at DATETIME2 NULL;
    PRINT 'Added deleted_at column to listings table';
END
GO

-- Update existing listings
-- Set edited_after_rejection to 0 for existing listings
UPDATE listings SET edited_after_rejection = 0 WHERE edited_after_rejection IS NULL;
GO

-- Migrate existing ACTIVE listings to APPROVED status
-- (assuming they were already approved before this feature)
UPDATE listings SET status = 'APPROVED' WHERE status = 'ACTIVE';
GO

PRINT 'Migration completed successfully!';
GO

