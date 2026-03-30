-- Remove is_default from categories (no longer needed)
ALTER TABLE categories DROP COLUMN IF EXISTS is_default;

-- Drop vacation_categories join table (trips now use all categories)
DROP TABLE IF EXISTS vacation_categories;
