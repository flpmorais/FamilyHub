-- Remove sort_order from template_items (was added by mistake)
ALTER TABLE template_items DROP COLUMN IF EXISTS sort_order;
