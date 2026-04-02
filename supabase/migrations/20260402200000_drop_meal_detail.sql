-- Remove the detail column from meal_entries (restaurant/encomenda field removed from UI)
ALTER TABLE meal_entries DROP COLUMN IF EXISTS detail;
