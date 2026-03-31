-- ============================================================
-- Icons reference table + icon_id on categories, template_items, packing_items
-- ============================================================

-- 1. Create icons table
CREATE TABLE icons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  tags text NOT NULL DEFAULT ''
);

ALTER TABLE icons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users can read icons"
  ON icons FOR SELECT
  USING (auth.role() = 'authenticated');

-- 2. Seed icons (~150) with search tags (English + Portuguese)
INSERT INTO icons (name, tags) VALUES
  -- Luggage & bags
  ('bag-suitcase',       'luggage,travel,suitcase,mala,viagem,bagagem,malas'),
  ('bag-personal',       'bag,personal,backpack,mochila,saco,pessoal'),
  ('bag-carry-on',       'carry-on,cabin,hand luggage,mão,cabine,bagagem de mão'),
  ('briefcase',          'briefcase,work,office,pasta,trabalho,escritório'),
  ('shopping',           'shopping,bag,store,compras,loja,saco'),
  ('purse',              'purse,handbag,bolsa,carteira,mala de mão'),
  ('basket',             'basket,cesto,cesta'),

  -- Clothing & accessories
  ('tshirt-crew',        'clothing,shirt,tshirt,roupa,camisola,camiseta,vestuário'),
  ('shoe-sneaker',       'shoes,sneaker,footwear,sapatos,ténis,calçado'),
  ('shoe-formal',        'shoes,formal,dress,sapatos,formais,vestir'),
  ('hat-fedora',         'hat,head,chapéu,cabeça'),
  ('sunglasses',         'sunglasses,glasses,eye,óculos,sol'),
  ('watch',              'watch,time,wrist,relógio,pulso,tempo'),
  ('hanger',             'hanger,closet,wardrobe,cabide,armário,roupeiro'),
  ('bow-tie',            'bowtie,tie,formal,laço,gravata,formal'),
  ('glasses',            'glasses,eyewear,reading,óculos,leitura'),
  ('mitten',             'gloves,mitten,winter,cold,luvas,inverno,frio'),
  ('scarf',              'scarf,winter,cold,neck,cachecol,inverno,pescoço'),

  -- Beach & outdoors
  ('umbrella-beach',     'beach,umbrella,sun,praia,guarda-sol,chapéu de sol'),
  ('swim',               'swim,swimming,pool,nadar,natação,piscina'),
  ('water',              'water,sea,ocean,água,mar,oceano'),
  ('surfing',            'surf,surfing,wave,board,prancha,onda'),
  ('sail-boat',          'boat,sail,sailing,barco,vela,navegar'),
  ('palm-tree',          'palm,tree,tropical,palmeira,tropical,árvore'),
  ('weather-sunny',      'sun,sunny,weather,hot,sol,quente,tempo'),
  ('snowflake',          'snow,cold,winter,ice,neve,frio,inverno,gelo'),
  ('image-filter-hdr',   'mountain,hiking,nature,montanha,natureza,serra'),
  ('tent',               'tent,camping,outdoor,tenda,campismo,acampar'),
  ('campfire',           'campfire,fire,camping,fogueira,fogo,campismo'),
  ('hiking',             'hiking,walk,trail,caminhada,trilho,passeio'),
  ('fish',               'fish,fishing,sea,peixe,pesca,mar'),
  ('binoculars',         'binoculars,view,bird watching,binóculos,observar,aves'),
  ('compass',            'compass,navigation,direction,bússola,navegação,direção'),
  ('pine-tree',          'tree,forest,nature,pine,árvore,floresta,pinheiro'),
  ('flower',             'flower,garden,nature,flor,jardim,natureza'),
  ('leaf',               'leaf,nature,plant,folha,natureza,planta'),
  ('weather-partly-cloudy', 'weather,cloud,cloudy,tempo,nuvem,nublado'),

  -- Hygiene & health
  ('lotion',             'lotion,cream,skincare,sunscreen,creme,protetor,hidratante'),
  ('toothbrush',         'toothbrush,dental,teeth,escova de dentes,dental,dentes'),
  ('spray',              'spray,deodorant,perfume,desodorizante,perfume'),
  ('medical-bag',        'medical,first aid,health,médico,primeiros socorros,saúde'),
  ('pill',               'pill,medicine,medication,comprimido,medicamento,remédio'),
  ('hospital-box',       'hospital,emergency,first aid,hospital,emergência,kit'),
  ('bandage',            'bandage,wound,injury,ligadura,penso,ferida'),
  ('thermometer',        'thermometer,temperature,fever,termómetro,temperatura,febre'),
  ('hand-wash',          'wash,soap,hygiene,hands,lavar,sabão,higiene,mãos'),
  ('razor-double-edge',  'razor,shave,shaving,lâmina,barbear,navalha'),
  ('hair-dryer',         'hair dryer,hair,blow dry,secador,cabelo'),

  -- Kids & family
  ('baby-bottle',        'baby,bottle,infant,feed,bebé,biberão,alimentar'),
  ('baby-carriage',      'baby,stroller,pram,bebé,carrinho,passeio'),
  ('teddy-bear',         'teddy,bear,toy,child,peluche,urso,brinquedo,criança'),
  ('human-child',        'child,kid,children,criança,miúdo,filhos'),
  ('toy-brick',          'toy,lego,play,blocks,brinquedo,blocos,jogar'),
  ('human-female-boy',   'family,mother,child,família,mãe,filho'),
  ('baby-face-outline',  'baby,infant,newborn,bebé,recém-nascido'),

  -- Electronics & tech
  ('camera',             'camera,photo,photography,câmara,foto,fotografia'),
  ('laptop',             'laptop,computer,work,portátil,computador,trabalho'),
  ('cellphone',          'phone,cellphone,mobile,smartphone,telemóvel,telefone'),
  ('tablet',             'tablet,ipad,screen,tablet,ecrã'),
  ('headphones',         'headphones,audio,music,listen,auscultadores,áudio,música,ouvir'),
  ('power-plug',         'plug,charger,power,electricity,ficha,carregador,eletricidade'),
  ('battery-charging',   'battery,charging,power,bateria,carregar,energia'),
  ('usb',                'usb,cable,connector,cabo,conector'),
  ('flashlight',         'flashlight,torch,light,lanterna,luz'),
  ('lightbulb',          'light,bulb,lamp,idea,luz,lâmpada,ideia'),
  ('monitor',            'monitor,screen,display,ecrã,monitor,televisão'),
  ('printer',            'printer,print,document,impressora,imprimir,documento'),
  ('sd',                 'sd card,memory,storage,cartão,memória,armazenamento'),
  ('speaker',            'speaker,audio,sound,coluna,áudio,som'),
  ('router-wireless',    'wifi,router,internet,wireless,rede,internet'),

  -- Entertainment
  ('gamepad-variant',    'game,gaming,controller,play,jogo,jogar,comando'),
  ('book-open-variant',  'book,read,reading,livro,ler,leitura'),
  ('music',              'music,song,audio,nota,música,canção'),
  ('cards-playing',      'cards,playing,game,cartas,baralho,jogo'),
  ('puzzle',             'puzzle,game,jigsaw,puzzle,jogo,enigma'),
  ('movie-open',         'movie,film,cinema,filme,cinema'),
  ('palette',            'art,paint,draw,color,arte,pintar,desenhar,cor'),
  ('notebook',           'notebook,journal,diary,caderno,diário'),
  ('dice-multiple',      'dice,game,board game,dados,jogo,jogo de tabuleiro'),

  -- Food & drink
  ('food-apple',         'food,fruit,apple,healthy,comida,fruta,maçã,saudável'),
  ('bottle-wine',        'wine,bottle,drink,alcohol,vinho,garrafa,bebida'),
  ('cup',                'cup,drink,water,tea,copo,bebida,água,chá'),
  ('coffee',             'coffee,hot,drink,café,quente,bebida'),
  ('silverware-fork-knife', 'cutlery,fork,knife,eat,restaurant,talheres,garfo,faca,comer'),
  ('food',               'food,meal,lunch,dinner,comida,refeição,almoço,jantar'),
  ('bottle-soda',        'soda,drink,bottle,refrigerante,bebida,garrafa'),
  ('candy',              'candy,sweet,sugar,snack,doce,guloseima,açúcar'),
  ('ice-cream',          'ice cream,dessert,sweet,gelado,sobremesa,doce'),
  ('glass-cocktail',     'cocktail,drink,bar,party,cocktail,bebida,festa'),

  -- Travel & transport
  ('passport',           'passport,id,travel,document,passaporte,documento,viagem'),
  ('airplane',           'airplane,flight,fly,travel,avião,voo,voar,viagem'),
  ('car',                'car,drive,vehicle,transport,carro,conduzir,veículo,transporte'),
  ('train',              'train,rail,transport,comboio,ferrovia,transporte'),
  ('bus',                'bus,transport,public,autocarro,transporte,público'),
  ('ferry',              'ferry,boat,ship,water,ferry,barco,navio'),
  ('map-marker',         'map,location,pin,gps,mapa,localização,ponto'),
  ('earth',              'earth,world,globe,travel,terra,mundo,globo'),
  ('flag',               'flag,country,nation,bandeira,país,nação'),
  ('star-circle-outline','star,favorite,rating,estrela,favorito'),
  ('taxi',               'taxi,cab,transport,táxi,transporte'),
  ('bike',               'bicycle,bike,cycle,sport,bicicleta,pedal,ciclismo,desporto'),
  ('walk',               'walk,walking,pedestrian,andar,caminhar,peão'),
  ('gas-station',        'gas,fuel,station,gasolina,combustível,posto'),
  ('highway',            'highway,road,drive,autoestrada,estrada'),
  ('parking',            'parking,car,park,estacionamento,carro'),

  -- Documents & money
  ('file-document',      'file,document,paper,ficheiro,documento,papel'),
  ('credit-card',        'credit card,payment,bank,cartão,pagamento,banco'),
  ('cash',               'cash,money,bills,dinheiro,notas,numerário'),
  ('currency-usd',       'dollar,currency,money,us,dólar,moeda,dinheiro'),
  ('currency-eur',       'euro,currency,money,europe,euro,moeda,europa'),
  ('key',                'key,lock,access,security,chave,fechadura,acesso,segurança'),
  ('lock',               'lock,security,safe,cadeado,segurança,cofre'),
  ('shield-check',       'shield,security,protection,insurance,escudo,segurança,proteção,seguro'),
  ('calendar',           'calendar,date,schedule,event,calendário,data,agenda,evento'),
  ('clipboard-text',     'clipboard,list,checklist,notes,lista,notas,apontamentos'),
  ('receipt',            'receipt,invoice,bill,recibo,fatura,conta'),
  ('ticket',             'ticket,pass,boarding,bilhete,passe,embarque'),

  -- Sports & fitness
  ('basketball',         'basketball,sport,ball,basquetebol,desporto,bola'),
  ('soccer',             'soccer,football,sport,ball,futebol,desporto,bola'),
  ('tennis',             'tennis,racket,sport,ténis,raquete,desporto'),
  ('dumbbell',           'dumbbell,gym,fitness,exercise,haltere,ginásio,fitness,exercício'),
  ('yoga',               'yoga,meditation,stretch,ioga,meditação,alongamento'),
  ('run',                'run,running,jog,exercise,correr,corrida,exercício'),
  ('golf',               'golf,sport,club,golfe,desporto,taco'),
  ('volleyball',         'volleyball,sport,beach,voleibol,desporto,praia'),

  -- Tools & misc
  ('tools',              'tools,repair,fix,build,ferramentas,reparar,arranjar'),
  ('wrench',             'wrench,repair,tool,chave inglesa,reparar,ferramenta'),
  ('content-cut',        'scissors,cut,cutting,tesoura,cortar'),
  ('gift',               'gift,present,birthday,surprise,presente,prenda,aniversário,surpresa'),
  ('star',               'star,favorite,bookmark,rate,estrela,favorito'),
  ('heart',              'heart,love,favorite,health,coração,amor,favorito,saúde'),
  ('home',               'home,house,residence,casa,moradia,residência'),
  ('bed',                'bed,sleep,bedroom,rest,cama,dormir,quarto,descanso'),
  ('shower',             'shower,bath,bathroom,wash,duche,banho,casa de banho,lavar'),
  ('washing-machine',    'laundry,washing,clean,clothes,lavandaria,lavar,roupa,limpo'),
  ('iron',               'iron,press,ironing,clothes,ferro,engomar,roupa'),
  ('fire-extinguisher',  'fire,safety,emergency,extintor,incêndio,segurança,emergência'),
  ('broom',              'broom,clean,sweep,vassoura,limpar,varrer'),
  ('alarm-light',        'alarm,alert,emergency,safety,alarme,alerta,emergência'),
  ('tag',                'tag,label,etiqueta,rótulo'),
  ('category',           'category,group,organize,categoria,grupo,organizar'),
  ('help',               'help,question,support,ajuda,pergunta,suporte'),
  ('information',        'info,information,details,about,informação,detalhes,sobre'),
  ('package-variant',    'package,box,parcel,delivery,pacote,caixa,encomenda'),
  ('safety-goggles',     'goggles,swim,eye protection,óculos,natação,proteção'),
  ('umbrella',           'umbrella,rain,weather,guarda-chuva,chuva,tempo'),
  ('white-balance-sunny','sunny,bright,day,sol,claro,dia'),
  ('sunbed',             'sunbed,lounge,pool,beach,espreguiçadeira,piscina,praia'),
  ('map',                'map,navigation,directions,mapa,navegação,direções'),
  ('notebook-outline',   'notebook,notes,write,caderno,notas,escrever'),
  ('pencil',             'pencil,write,draw,edit,lápis,escrever,desenhar,editar'),
  ('paperclip',          'paperclip,attach,office,clip,anexar,escritório');

-- 3. Migrate categories.icon text → icon_id FK
-- First ensure every category icon value exists in the icons table
INSERT INTO icons (name, tags)
SELECT DISTINCT c.icon, ''
FROM categories c
WHERE NOT EXISTS (SELECT 1 FROM icons i WHERE i.name = c.icon)
  AND c.icon IS NOT NULL;

ALTER TABLE categories ADD COLUMN icon_id uuid REFERENCES icons(id) ON DELETE SET NULL;

UPDATE categories
SET icon_id = (SELECT id FROM icons WHERE icons.name = categories.icon);

ALTER TABLE categories ALTER COLUMN icon_id SET NOT NULL;
ALTER TABLE categories DROP COLUMN icon;

-- 4. Add icon_id to template_items (NOT NULL, from category icon)
ALTER TABLE template_items ADD COLUMN icon_id uuid REFERENCES icons(id) ON DELETE SET NULL;

UPDATE template_items
SET icon_id = (SELECT c.icon_id FROM categories c WHERE c.id = template_items.category_id);

ALTER TABLE template_items ALTER COLUMN icon_id SET NOT NULL;

-- 5. Add icon_id to packing_items (NOT NULL, from category icon or fallback)
ALTER TABLE packing_items ADD COLUMN icon_id uuid REFERENCES icons(id) ON DELETE SET NULL;

-- Items with a category: inherit category icon
UPDATE packing_items
SET icon_id = (SELECT c.icon_id FROM categories c WHERE c.id = packing_items.category_id)
WHERE category_id IS NOT NULL;

-- Items without a category: use 'package-variant' as fallback
UPDATE packing_items
SET icon_id = (SELECT id FROM icons WHERE name = 'package-variant')
WHERE icon_id IS NULL;

ALTER TABLE packing_items ALTER COLUMN icon_id SET NOT NULL;
