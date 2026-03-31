-- Fix icon names that don't exist in MaterialCommunityIcons
UPDATE icons SET name = 'shape' WHERE name = 'category';
UPDATE icons SET name = 'boxing-glove' WHERE name = 'mitten';
UPDATE icons SET name = 'necklace' WHERE name = 'scarf';
UPDATE icons SET name = 'seat-flat' WHERE name = 'sunbed';

-- Update tags to reflect new names
UPDATE icons SET tags = 'category,group,organize,categoria,grupo,organizar,shape' WHERE name = 'shape';
UPDATE icons SET tags = 'gloves,mitten,winter,cold,luvas,inverno,frio,boxing' WHERE name = 'boxing-glove';
UPDATE icons SET tags = 'scarf,winter,cold,neck,necklace,cachecol,inverno,pescoço,colar' WHERE name = 'necklace';
UPDATE icons SET tags = 'sunbed,lounge,pool,beach,espreguiçadeira,piscina,praia,seat' WHERE name = 'seat-flat';
