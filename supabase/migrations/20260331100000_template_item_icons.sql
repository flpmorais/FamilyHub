-- Add new icons needed for template items
INSERT INTO icons (name, tags) VALUES
  ('card-account-details',        'id,card,identity,document,cartão,identidade,cidadão'),
  ('cup-water',                   'cup,water,drink,copo,água,bebida'),
  ('radio',                       'radio,monitor,baby monitor,rádio,intercomunicador'),
  ('cellphone-charging',          'phone,charging,charger,telemóvel,carregar,carregador'),
  ('book-open-page-variant',      'ebook,reader,kobo,kindle,livro,leitor,ler'),
  ('bottle-tonic',                'bottle,tonic,shampoo,perfume,frasco,champô'),
  ('paper-roll',                  'paper,roll,wipes,tissue,toalhetes,rolo,papel'),
  ('pool',                        'pool,inflatable,piscina,insuflável'),
  ('fridge-outline',              'fridge,cooler,thermal,frigorifico,mala térmica,frio'),
  ('human-baby-changing-table',   'diaper,nappy,changing,fralda,muda,bebé')
ON CONFLICT (name) DO NOTHING;

-- ── Carteira ────────────────────────────────────────────────────────
UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'card-account-details')
WHERE title = 'Cartão de cidadão';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'credit-card')
WHERE title = 'Cartão de credito';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'card-account-details')
WHERE title = 'Cartão de Saúde Europeu';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'cash')
WHERE title = 'Dinheiros';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'passport')
WHERE title = 'Passaporte';

-- ── Crianças ────────────────────────────────────────────────────────
UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'baby-bottle')
WHERE title = 'Biberon';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'cup-water')
WHERE title = 'Copo de água';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'human-baby-changing-table')
WHERE title IN ('Fraldas', 'Fraldas dormir');

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'book-open-variant')
WHERE title = 'Livros para dormir';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'radio')
WHERE title = 'Radios';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'teddy-bear')
WHERE title = 'Ursinho de dormir';

-- ── Eletronica ──────────────────────────────────────────────────────
UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'cellphone-charging')
WHERE title = 'Carregador telemovel';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'gamepad-variant')
WHERE title = 'Deck';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'book-open-page-variant')
WHERE title = 'Kobo';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'battery-charging')
WHERE title IN ('Power Bank Grande', 'Power Bank Pequeno');

-- Carregador kobo + Deck - carregador keep power-plug (already correct)

-- ── Necessaire ──────────────────────────────────────────────────────
UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'pill')
WHERE title IN ('Bebegel', 'Bio Gaia', 'Eutirox', 'Vita Dê');

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'spray')
WHERE title = 'Desodorizante';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'toothbrush')
WHERE title IN ('Escova de dentes', 'Pasta de dentes', 'Pasta de dentes adulto');

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'lotion')
WHERE title IN ('Gel criança', 'Vaselina');

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'razor-double-edge')
WHERE title = 'Lâmina de barbear';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'bottle-tonic')
WHERE title IN ('Perfume', 'Shampoo');

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'white-balance-sunny')
WHERE title = 'Protetor Solar';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'hand-wash')
WHERE title = 'Sabonete';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'paper-roll')
WHERE title = 'Toalhetes';

-- Compressas keeps bandage (already correct)

-- ── Praia ───────────────────────────────────────────────────────────
UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'toy-brick')
WHERE title = 'Brinquedos';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'ice-cream')
WHERE title = 'Couvetes';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'swim')
WHERE title = 'Fatos de banho';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'human-baby-changing-table')
WHERE title = 'Fraldas de Água';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'fridge-outline')
WHERE title = 'Mala Térmica';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'pool')
WHERE title = 'Piscina';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'shoe-sneaker')
WHERE title = 'Sapatos de água';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'bed')
WHERE title = 'Toalha de praia';

-- Chapéu de sol keeps umbrella-beach (already correct)

-- ── Roupa ───────────────────────────────────────────────────────────
UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'scarf')
WHERE title IN ('Cachecois', 'Cachecol');

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'hanger')
WHERE title IN ('Casaco', 'Casacos polares', 'Vestidos');

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'hat-fedora')
WHERE title IN ('Chapéu', 'Gorros');

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'mitten')
WHERE title = 'Luvas';

UPDATE template_items SET icon_id = (SELECT id FROM icons WHERE name = 'shoe-sneaker')
WHERE title = 'Meias';

-- Calças, Calções/Saias, Camisas termicas, Collants/ciroilas, Cuecas, T-shirts/Camisas keep tshirt-crew (already correct)
