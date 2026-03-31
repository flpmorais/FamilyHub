-- Fix packing items in existing trips to match their template's icon
-- (items were cloned before templates had item-specific icons)
UPDATE packing_items pi
SET icon_id = ti.icon_id
FROM template_items ti
WHERE pi.title = ti.title
  AND pi.icon_id != ti.icon_id;
