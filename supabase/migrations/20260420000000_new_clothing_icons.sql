-- ============================================================
-- Add new clothing, accessories and miscellaneous icons
-- ============================================================

INSERT INTO icons (name, tags) VALUES
  -- Electronics & tech
  ('mouse',              'mouse,computer,peripheral,click,rato,computador,periférico,clicar'),
  ('keyboard',           'keyboard,typing,computer,input,teclado,digitar,computador,entrada'),
  ('battery',            'battery,power bank,charger,energy,bateria,carregador,energia,powerbank'),

  -- Clothing - upper body
  ('coat',               'coat,jacket,outerwear,winter,casaco,jaqueta,sobretudo,inverno'),
  ('dress',              'dress,clothing,woman,formal,vestido,roupa,mulher,formal'),
  ('skirt',              'skirt,clothing,woman,saia,roupa,mulher'),
  ('scarf',              'scarf,neck,winter,warm,cachecol,pescoço,inverno,quente'),
  ('hat',                'hat,winter,beanie,warm,cap,chapéu,inverno,gorro,quente'),
  ('glove',              'gloves,hand,winter,warm,luvas,mão,inverno,quente'),

  -- Clothing - lower body & undergarments
  ('sock',               'socks,feet,footwear,warm,meias,pés,calçado,quente'),
  ('briefs',             'underwear,panties,undergarment,cueca,calcinha,roupa interior'),

  -- Accessories & misc
  ('cube',               'cube,ice,ice cube,sugar,cubo,gelo,açúcar'),
  ('smoking',            'smoking,cigar,cigarette,tobacco,fumar,charuto,cigarro,tabaco'),
  ('towel',              'towel,bath,dry,beach,toalha,banho,secar,praia');
