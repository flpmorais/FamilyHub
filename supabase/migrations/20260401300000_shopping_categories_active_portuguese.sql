-- Shopping categories: add active flag + rename to Portuguese

ALTER TABLE shopping_categories ADD COLUMN active boolean NOT NULL DEFAULT true;

-- Rename default English categories to Portuguese (for all families)
UPDATE shopping_categories SET name = 'Lacticínios' WHERE lower(name) = 'dairy';
UPDATE shopping_categories SET name = 'Carne' WHERE lower(name) = 'meat';
UPDATE shopping_categories SET name = 'Peixe' WHERE lower(name) = 'fish';
UPDATE shopping_categories SET name = 'Fruta' WHERE lower(name) = 'fruit';
UPDATE shopping_categories SET name = 'Legumes' WHERE lower(name) = 'vegetables';
UPDATE shopping_categories SET name = 'Padaria' WHERE lower(name) = 'bakery';
UPDATE shopping_categories SET name = 'Congelados' WHERE lower(name) = 'frozen';
UPDATE shopping_categories SET name = 'Despensa' WHERE lower(name) = 'pantry';
UPDATE shopping_categories SET name = 'Bebidas' WHERE lower(name) = 'beverages';
UPDATE shopping_categories SET name = 'Snacks' WHERE lower(name) = 'snacks';
UPDATE shopping_categories SET name = 'Especiarias e Condimentos' WHERE lower(name) = 'spices & condiments';
UPDATE shopping_categories SET name = 'Ovos' WHERE lower(name) = 'eggs';
UPDATE shopping_categories SET name = 'Limpeza' WHERE lower(name) = 'cleaning';
UPDATE shopping_categories SET name = 'Higiene' WHERE lower(name) = 'hygiene';
UPDATE shopping_categories SET name = 'Bebé' WHERE lower(name) = 'baby';
UPDATE shopping_categories SET name = 'Outros' WHERE lower(name) = 'other';
