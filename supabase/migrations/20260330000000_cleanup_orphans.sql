-- Clean up orphan packing items (no matching vacation)
DELETE FROM packing_items WHERE vacation_id NOT IN (SELECT id FROM vacations);

-- Clean up orphan booking tasks (no matching vacation)
DELETE FROM booking_tasks WHERE vacation_id NOT IN (SELECT id FROM vacations);

-- Clean up orphan packing item tags (no matching packing item)
DELETE FROM packing_item_tags WHERE packing_item_id NOT IN (SELECT id FROM packing_items);

-- Clean up orphan vacation tags (no matching vacation)
DELETE FROM vacation_tags WHERE vacation_id NOT IN (SELECT id FROM vacations);
