-- Production seed: categories, tags, template_items, task_templates, vacation_templates
-- Family: 276bd790-5213-4f75-be38-103c1a6a79df
-- Profile mapping:
--   Filipe: 05dda680-f3b1-4446-99ca-b64c2cace606
--   Angela: ca176100-b436-4a7e-b375-aa3241b5adc4
--   Aurora: ffee1abc-7b26-4bd1-9294-58f471c21549
--   Isabel: 461085c4-ec3c-4b3c-a67c-c413d6121db6

-- ── Categories ──
INSERT INTO categories (id, name, family_id, active, sort_order, icon) VALUES
  ('9f685cea-2afc-48de-a333-749c29b00fba', 'Carteira', '276bd790-5213-4f75-be38-103c1a6a79df', true, 1, 'shopping'),
  ('23838d73-ed06-4ffe-a79d-ef43c3337272', 'Roupa', '276bd790-5213-4f75-be38-103c1a6a79df', true, 2, 'tshirt-crew'),
  ('41b86266-f5e9-4e9a-9647-053de6d73768', 'Necessaire', '276bd790-5213-4f75-be38-103c1a6a79df', true, 3, 'bandage'),
  ('24c6148f-f5b4-41ed-b091-c60e02de1910', 'Eletronica', '276bd790-5213-4f75-be38-103c1a6a79df', true, 4, 'power-plug'),
  ('4d6099b7-bc21-483e-b33f-40e9a8b2a049', 'Outros', '276bd790-5213-4f75-be38-103c1a6a79df', true, 5, 'book-open-variant'),
  ('c758d130-7151-488e-9706-1e33509fb30c', 'Praia', '276bd790-5213-4f75-be38-103c1a6a79df', true, 6, 'umbrella-beach'),
  ('643d7188-596a-4be9-aa47-a6e21da804d2', 'Crianças', '276bd790-5213-4f75-be38-103c1a6a79df', true, 7, 'teddy-bear')
ON CONFLICT (id) DO NOTHING;

-- ── Tags ──
INSERT INTO tags (id, name, family_id, color, active, sort_order, icon) VALUES
  ('a9444a66-0cf0-4b3c-8f0b-1fab86d373b9', 'UE', '276bd790-5213-4f75-be38-103c1a6a79df', '#3F51B5', true, 1, 'star-circle-outline'),
  ('227382f4-868f-436f-844b-1353ff650770', 'Não UE', '276bd790-5213-4f75-be38-103c1a6a79df', '#D32F2F', true, 2, 'earth'),
  ('ba09b69b-e8fa-41b4-b5f9-cc3373840318', 'Shengen', '276bd790-5213-4f75-be38-103c1a6a79df', '#3F51B5', true, 3, 'home'),
  ('c612cffa-b8fe-413b-a8f7-8f4c76d8e759', 'Não Shengen', '276bd790-5213-4f75-be38-103c1a6a79df', '#D32F2F', true, 4, 'passport'),
  ('f64693f4-f161-4b0e-9075-90fcc03338a6', 'Zona Euro', '276bd790-5213-4f75-be38-103c1a6a79df', '#3F51B5', true, 5, 'currency-eur'),
  ('a924053a-689f-4e6b-9e27-848137791ca1', 'Forex', '276bd790-5213-4f75-be38-103c1a6a79df', '#D32F2F', true, 6, 'currency-usd'),
  ('376d7631-ca2b-4ba6-9f8d-031648162147', 'Curta Duração', '276bd790-5213-4f75-be38-103c1a6a79df', '#E67E22', true, 7, 'watch'),
  ('55fbbd53-6dde-4b45-b90f-5331b9d1e1ee', 'Longa Duração', '276bd790-5213-4f75-be38-103c1a6a79df', '#00897B', true, 8, 'compass'),
  ('039fe6a7-94fb-4075-a37b-4a11e331a9d2', 'Trabalho', '276bd790-5213-4f75-be38-103c1a6a79df', '#795548', true, 9, 'briefcase'),
  ('e5ab85a7-beca-479d-9b07-9fb9bb0502cd', 'Férias', '276bd790-5213-4f75-be38-103c1a6a79df', '#388E3C', true, 10, 'palm-tree'),
  ('b7a105f3-b242-47d6-a74b-5c837d79ab72', 'Avião', '276bd790-5213-4f75-be38-103c1a6a79df', '#9C27B0', true, 11, 'airplane'),
  ('917f675a-68d1-48dd-ad4f-9993a52a73f3', 'Road trip', '276bd790-5213-4f75-be38-103c1a6a79df', '#607D8B', true, 12, 'car'),
  ('ea7ead68-f2e2-45dc-b005-af3e97b310f4', 'Rent-a-car', '276bd790-5213-4f75-be38-103c1a6a79df', '#888888', true, 13, 'car'),
  ('ed6620e0-040d-4d16-b49e-65cdaa2eabc8', 'Calor', '276bd790-5213-4f75-be38-103c1a6a79df', '#E67E22', true, 14, 'weather-sunny'),
  ('19c04128-8cf1-42cf-91e3-1ceb49dae35b', 'Frio', '276bd790-5213-4f75-be38-103c1a6a79df', '#03A9F4', true, 15, 'snowflake'),
  ('67d584db-d29e-4dd6-92a1-28d608e481ab', 'Crianças', '276bd790-5213-4f75-be38-103c1a6a79df', '#C2185B', true, 16, 'teddy-bear'),
  ('3f8cc40c-f28a-41e8-82b1-74d185f8c489', 'Praia', '276bd790-5213-4f75-be38-103c1a6a79df', '#4CAF50', true, 17, 'umbrella-beach')
ON CONFLICT (id) DO NOTHING;

-- ── Template Items (61 items) ──
INSERT INTO template_items (id, family_id, title, category_id, quantity, is_all_family, created_at, updated_at) VALUES
  ('8b0a8b6a-ff6a-4376-a215-96e8b0ca8628', '276bd790-5213-4f75-be38-103c1a6a79df', 'Bebegel', '41b86266-f5e9-4e9a-9647-053de6d73768', 1, false, now(), now()),
  ('53dfd120-c44b-48dd-a37f-00b5a9b3b97f', '276bd790-5213-4f75-be38-103c1a6a79df', 'Biberon', '643d7188-596a-4be9-aa47-a6e21da804d2', 1, false, now(), now()),
  ('2c1e719f-e9a3-4823-97b2-569138d088cc', '276bd790-5213-4f75-be38-103c1a6a79df', 'Bio Gaia', '41b86266-f5e9-4e9a-9647-053de6d73768', 1, false, now(), now()),
  ('e57742af-49b7-4ed6-8dd8-f24bfa84cd79', '276bd790-5213-4f75-be38-103c1a6a79df', 'Brinquedos', 'c758d130-7151-488e-9706-1e33509fb30c', 1, false, now(), now()),
  ('39c6f0f0-c50d-4dad-b8af-ee89158f9ef1', '276bd790-5213-4f75-be38-103c1a6a79df', 'Cachecois', '23838d73-ed06-4ffe-a79d-ef43c3337272', 1, false, now(), now()),
  ('e0399e50-4212-4e49-bd42-4eca7a167c7f', '276bd790-5213-4f75-be38-103c1a6a79df', 'Cachecol', '23838d73-ed06-4ffe-a79d-ef43c3337272', 1, false, now(), now()),
  ('1077e8ea-45b8-4d70-9f3a-8a7a9b76b59c', '276bd790-5213-4f75-be38-103c1a6a79df', 'Calças', '23838d73-ed06-4ffe-a79d-ef43c3337272', 1, false, now(), now()),
  ('ce4bb6b6-4b66-4fc3-a317-86b451aa108b', '276bd790-5213-4f75-be38-103c1a6a79df', 'Calções/Saias', '23838d73-ed06-4ffe-a79d-ef43c3337272', 1, false, now(), now()),
  ('3f2f2225-1270-4855-8bd3-5a9ee102aa03', '276bd790-5213-4f75-be38-103c1a6a79df', 'Camisas termicas', '23838d73-ed06-4ffe-a79d-ef43c3337272', 1, false, now(), now()),
  ('e73f985b-232a-4f5e-9dd8-505b03900868', '276bd790-5213-4f75-be38-103c1a6a79df', 'Carregador kobo', '24c6148f-f5b4-41ed-b091-c60e02de1910', 1, false, now(), now()),
  ('7282c48e-2a16-47fe-a986-0a84ffb088d0', '276bd790-5213-4f75-be38-103c1a6a79df', 'Carregador telemovel', '24c6148f-f5b4-41ed-b091-c60e02de1910', 1, false, now(), now()),
  ('25420f62-702e-4db8-80ef-2fa2e31a1249', '276bd790-5213-4f75-be38-103c1a6a79df', 'Cartão de cidadão', '9f685cea-2afc-48de-a333-749c29b00fba', 1, false, now(), now()),
  ('b8eb3562-bbd9-4783-bcd1-81eaa2025260', '276bd790-5213-4f75-be38-103c1a6a79df', 'Cartão de credito', '9f685cea-2afc-48de-a333-749c29b00fba', 1, false, now(), now()),
  ('08458399-7fea-4d61-96f6-a75c2dc88dfd', '276bd790-5213-4f75-be38-103c1a6a79df', 'Cartão de Saúde Europeu', '9f685cea-2afc-48de-a333-749c29b00fba', 1, false, now(), now()),
  ('19e931b6-5e2b-434d-8a7b-b55cc01ae078', '276bd790-5213-4f75-be38-103c1a6a79df', 'Casaco', '23838d73-ed06-4ffe-a79d-ef43c3337272', 1, false, now(), now()),
  ('1ea069ee-2502-4ad4-a9ca-eb4c4fc8d4c5', '276bd790-5213-4f75-be38-103c1a6a79df', 'Casacos polares', '23838d73-ed06-4ffe-a79d-ef43c3337272', 1, false, now(), now()),
  ('b56c0c7f-e9d7-4fab-811f-6684712c8055', '276bd790-5213-4f75-be38-103c1a6a79df', 'Chapéu', '23838d73-ed06-4ffe-a79d-ef43c3337272', 1, false, now(), now()),
  ('d9f4bc49-32f2-4a50-85b7-bcc4709db2de', '276bd790-5213-4f75-be38-103c1a6a79df', 'Chapéu de sol', 'c758d130-7151-488e-9706-1e33509fb30c', 1, true, now(), now()),
  ('f2e2e77d-67b7-43e1-8d90-c605b83fd75e', '276bd790-5213-4f75-be38-103c1a6a79df', 'Collants/ciroilas', '23838d73-ed06-4ffe-a79d-ef43c3337272', 1, false, now(), now()),
  ('6b80cdd1-1f8f-4c53-a213-632a017fece3', '276bd790-5213-4f75-be38-103c1a6a79df', 'Compressas', '41b86266-f5e9-4e9a-9647-053de6d73768', 1, false, now(), now()),
  ('47bb1cfd-b186-4c75-b120-4a3578c8ddad', '276bd790-5213-4f75-be38-103c1a6a79df', 'Copo de água', '643d7188-596a-4be9-aa47-a6e21da804d2', 1, false, now(), now()),
  ('8737a5a3-4376-447b-ad55-92b4d8609528', '276bd790-5213-4f75-be38-103c1a6a79df', 'Couvetes', 'c758d130-7151-488e-9706-1e33509fb30c', 4, true, now(), now()),
  ('09fe7f7f-1f89-42d1-a929-eb977d7ed521', '276bd790-5213-4f75-be38-103c1a6a79df', 'Cuecas', '23838d73-ed06-4ffe-a79d-ef43c3337272', 1, false, now(), now()),
  ('dc65f071-1b0c-4470-9ba7-31bf3c046c1f', '276bd790-5213-4f75-be38-103c1a6a79df', 'Deck', '24c6148f-f5b4-41ed-b091-c60e02de1910', 1, false, now(), now()),
  ('b167e7bc-e2db-4051-aa20-d3adb8c6e855', '276bd790-5213-4f75-be38-103c1a6a79df', 'Deck - carregador', '24c6148f-f5b4-41ed-b091-c60e02de1910', 1, false, now(), now()),
  ('1fff32a2-a2f0-4851-8a3f-15acfc105e70', '276bd790-5213-4f75-be38-103c1a6a79df', 'Desodorizante', '41b86266-f5e9-4e9a-9647-053de6d73768', 1, false, now(), now()),
  ('283824e3-a57c-41ae-b992-b42fe275b29d', '276bd790-5213-4f75-be38-103c1a6a79df', 'Dinheiros', '9f685cea-2afc-48de-a333-749c29b00fba', 1, true, now(), now()),
  ('f8541925-6459-4d29-ba5b-5011e57414e5', '276bd790-5213-4f75-be38-103c1a6a79df', 'Escova de dentes', '41b86266-f5e9-4e9a-9647-053de6d73768', 1, false, now(), now()),
  ('c02647b7-101c-409f-a49f-c87aff2145f3', '276bd790-5213-4f75-be38-103c1a6a79df', 'Eutirox', '41b86266-f5e9-4e9a-9647-053de6d73768', 1, false, now(), now()),
  ('a85046cf-4924-4e50-974b-cc3cfefe45fd', '276bd790-5213-4f75-be38-103c1a6a79df', 'Fatos de banho', 'c758d130-7151-488e-9706-1e33509fb30c', 1, false, now(), now()),
  ('f3a49ff4-d258-4cf6-8c5d-1aff697be86b', '276bd790-5213-4f75-be38-103c1a6a79df', 'Fraldas', '643d7188-596a-4be9-aa47-a6e21da804d2', 1, false, now(), now()),
  ('96e25e3a-e880-41d5-97eb-9b7e3886e077', '276bd790-5213-4f75-be38-103c1a6a79df', 'Fraldas de Água', 'c758d130-7151-488e-9706-1e33509fb30c', 1, false, now(), now()),
  ('83053904-eaa2-45b6-abe0-b194ae754c43', '276bd790-5213-4f75-be38-103c1a6a79df', 'Fraldas dormir', '643d7188-596a-4be9-aa47-a6e21da804d2', 1, false, now(), now()),
  ('13b020c7-3100-4ea7-b932-8d1ae58cfd3c', '276bd790-5213-4f75-be38-103c1a6a79df', 'Gel criança', '41b86266-f5e9-4e9a-9647-053de6d73768', 1, true, now(), now()),
  ('399846a4-4eff-45e3-b0a8-980bf03b81fe', '276bd790-5213-4f75-be38-103c1a6a79df', 'Gorros', '23838d73-ed06-4ffe-a79d-ef43c3337272', 1, false, now(), now()),
  ('09e2c09d-9137-4764-8ae2-2da6fda28e0d', '276bd790-5213-4f75-be38-103c1a6a79df', 'Kobo', '24c6148f-f5b4-41ed-b091-c60e02de1910', 1, false, now(), now()),
  ('552d2672-355d-4e63-b2d5-cf522a8f933b', '276bd790-5213-4f75-be38-103c1a6a79df', 'Lâmina de barbear', '41b86266-f5e9-4e9a-9647-053de6d73768', 1, false, now(), now()),
  ('ffffe31d-a84f-4142-abfc-bcd40726ef9c', '276bd790-5213-4f75-be38-103c1a6a79df', 'Livro', '4d6099b7-bc21-483e-b33f-40e9a8b2a049', 1, false, now(), now()),
  ('d5f3fdbf-f758-415e-b5a7-1bd7e019d158', '276bd790-5213-4f75-be38-103c1a6a79df', 'Livros para dormir', '643d7188-596a-4be9-aa47-a6e21da804d2', 1, false, now(), now()),
  ('00c76451-7c17-4ae7-9321-1e47c8965cfa', '276bd790-5213-4f75-be38-103c1a6a79df', 'Luvas', '23838d73-ed06-4ffe-a79d-ef43c3337272', 1, false, now(), now()),
  ('40376577-0323-4919-819f-43db83bdf772', '276bd790-5213-4f75-be38-103c1a6a79df', 'Mala Térmica', 'c758d130-7151-488e-9706-1e33509fb30c', 1, true, now(), now()),
  ('34799b15-ea8f-40e9-9420-ee1491499cec', '276bd790-5213-4f75-be38-103c1a6a79df', 'Meias', '23838d73-ed06-4ffe-a79d-ef43c3337272', 1, false, now(), now()),
  ('93d6c173-ea56-48fc-86e0-7fd58042a5cb', '276bd790-5213-4f75-be38-103c1a6a79df', 'Passaporte', '9f685cea-2afc-48de-a333-749c29b00fba', 1, false, now(), now()),
  ('2ae1df6a-1967-4587-8d12-71a354a584ee', '276bd790-5213-4f75-be38-103c1a6a79df', 'Pasta de dentes', '41b86266-f5e9-4e9a-9647-053de6d73768', 1, false, now(), now()),
  ('e2916598-678d-492e-ae18-5badd37a27e8', '276bd790-5213-4f75-be38-103c1a6a79df', 'Pasta de dentes adulto', '41b86266-f5e9-4e9a-9647-053de6d73768', 1, true, now(), now()),
  ('eed353c0-94e6-48be-b02e-597c7c503c1f', '276bd790-5213-4f75-be38-103c1a6a79df', 'Perfume', '41b86266-f5e9-4e9a-9647-053de6d73768', 1, false, now(), now()),
  ('18ad700e-3bdd-48ec-b481-43ba9b329ed3', '276bd790-5213-4f75-be38-103c1a6a79df', 'Piscina', 'c758d130-7151-488e-9706-1e33509fb30c', 1, true, now(), now()),
  ('789af9b4-d13f-43d4-9a26-1c04ec077eae', '276bd790-5213-4f75-be38-103c1a6a79df', 'Power Bank Grande', '24c6148f-f5b4-41ed-b091-c60e02de1910', 1, true, now(), now()),
  ('ffe9fb29-333e-4475-931d-a6c4878a370a', '276bd790-5213-4f75-be38-103c1a6a79df', 'Power Bank Pequeno', '24c6148f-f5b4-41ed-b091-c60e02de1910', 1, true, now(), now()),
  ('c8814c4e-a1f6-41e9-9d41-1301346cdac8', '276bd790-5213-4f75-be38-103c1a6a79df', 'Protetor Solar', '41b86266-f5e9-4e9a-9647-053de6d73768', 1, false, now(), now()),
  ('efef8c72-169f-40f3-b45f-86f14b5c6e9d', '276bd790-5213-4f75-be38-103c1a6a79df', 'Radios', '643d7188-596a-4be9-aa47-a6e21da804d2', 1, true, now(), now()),
  ('615fb5c3-90b0-4871-bb78-b48e24f32141', '276bd790-5213-4f75-be38-103c1a6a79df', 'Sabonete', '41b86266-f5e9-4e9a-9647-053de6d73768', 1, true, now(), now()),
  ('ea5597af-fd17-4dc9-b15f-5988936d8bee', '276bd790-5213-4f75-be38-103c1a6a79df', 'Sapatos de água', 'c758d130-7151-488e-9706-1e33509fb30c', 1, false, now(), now()),
  ('08bc1e49-6359-4b98-be27-edb0b294cd44', '276bd790-5213-4f75-be38-103c1a6a79df', 'Shampoo', '41b86266-f5e9-4e9a-9647-053de6d73768', 1, false, now(), now()),
  ('49679b6c-b3bb-4f65-8c13-d1e6057146f1', '276bd790-5213-4f75-be38-103c1a6a79df', 'T-shirts/Camisas', '23838d73-ed06-4ffe-a79d-ef43c3337272', 1, false, now(), now()),
  ('65ca6146-435c-4acd-b79b-f77d5eb9410d', '276bd790-5213-4f75-be38-103c1a6a79df', 'Toalha de praia', 'c758d130-7151-488e-9706-1e33509fb30c', 1, false, now(), now()),
  ('6a5549cd-dcd5-4365-a31b-bf7cf779f057', '276bd790-5213-4f75-be38-103c1a6a79df', 'Toalhetes', '41b86266-f5e9-4e9a-9647-053de6d73768', 1, true, now(), now()),
  ('0edde97a-d2aa-4331-83a0-70bfbc700899', '276bd790-5213-4f75-be38-103c1a6a79df', 'Ursinho de dormir', '643d7188-596a-4be9-aa47-a6e21da804d2', 1, false, now(), now()),
  ('8545adfc-465e-45c8-859a-7fa9cd0b5afe', '276bd790-5213-4f75-be38-103c1a6a79df', 'Vaselina', '41b86266-f5e9-4e9a-9647-053de6d73768', 1, true, now(), now()),
  ('9e559c13-5aae-4f45-8057-507c8aa7912d', '276bd790-5213-4f75-be38-103c1a6a79df', 'Vestidos', '23838d73-ed06-4ffe-a79d-ef43c3337272', 1, false, now(), now()),
  ('fdcae3d0-fbbf-4d88-91b5-4f810ac31ade', '276bd790-5213-4f75-be38-103c1a6a79df', 'Vita Dê', '41b86266-f5e9-4e9a-9647-053de6d73768', 1, false, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── Template Item Tags ──
INSERT INTO template_item_tags (template_item_id, tag_id) VALUES
  ('08458399-7fea-4d61-96f6-a75c2dc88dfd', 'a9444a66-0cf0-4b3c-8f0b-1fab86d373b9'),
  ('b56c0c7f-e9d7-4fab-811f-6684712c8055', 'ed6620e0-040d-4d16-b49e-65cdaa2eabc8'),
  ('399846a4-4eff-45e3-b0a8-980bf03b81fe', '19c04128-8cf1-42cf-91e3-1ceb49dae35b'),
  ('39c6f0f0-c50d-4dad-b8af-ee89158f9ef1', '19c04128-8cf1-42cf-91e3-1ceb49dae35b'),
  ('e0399e50-4212-4e49-bd42-4eca7a167c7f', '19c04128-8cf1-42cf-91e3-1ceb49dae35b'),
  ('93d6c173-ea56-48fc-86e0-7fd58042a5cb', 'c612cffa-b8fe-413b-a8f7-8f4c76d8e759'),
  ('f2e2e77d-67b7-43e1-8d90-c605b83fd75e', '19c04128-8cf1-42cf-91e3-1ceb49dae35b'),
  ('3f2f2225-1270-4855-8bd3-5a9ee102aa03', '19c04128-8cf1-42cf-91e3-1ceb49dae35b'),
  ('25420f62-702e-4db8-80ef-2fa2e31a1249', 'ba09b69b-e8fa-41b4-b5f9-cc3373840318'),
  ('789af9b4-d13f-43d4-9a26-1c04ec077eae', '55fbbd53-6dde-4b45-b90f-5331b9d1e1ee'),
  ('1ea069ee-2502-4ad4-a9ca-eb4c4fc8d4c5', '19c04128-8cf1-42cf-91e3-1ceb49dae35b'),
  ('00c76451-7c17-4ae7-9321-1e47c8965cfa', '19c04128-8cf1-42cf-91e3-1ceb49dae35b'),
  ('c8814c4e-a1f6-41e9-9d41-1301346cdac8', 'ed6620e0-040d-4d16-b49e-65cdaa2eabc8'),
  ('8545adfc-465e-45c8-859a-7fa9cd0b5afe', '19c04128-8cf1-42cf-91e3-1ceb49dae35b'),
  ('ce4bb6b6-4b66-4fc3-a317-86b451aa108b', 'ed6620e0-040d-4d16-b49e-65cdaa2eabc8'),
  ('13b020c7-3100-4ea7-b932-8d1ae58cfd3c', '67d584db-d29e-4dd6-92a1-28d608e481ab'),
  ('2ae1df6a-1967-4587-8d12-71a354a584ee', '67d584db-d29e-4dd6-92a1-28d608e481ab'),
  ('8b0a8b6a-ff6a-4376-a215-96e8b0ca8628', '67d584db-d29e-4dd6-92a1-28d608e481ab'),
  ('b167e7bc-e2db-4051-aa20-d3adb8c6e855', '55fbbd53-6dde-4b45-b90f-5331b9d1e1ee'),
  ('dc65f071-1b0c-4470-9ba7-31bf3c046c1f', '55fbbd53-6dde-4b45-b90f-5331b9d1e1ee'),
  ('e57742af-49b7-4ed6-8dd8-f24bfa84cd79', '3f8cc40c-f28a-41e8-82b1-74d185f8c489'),
  ('d9f4bc49-32f2-4a50-85b7-bcc4709db2de', '55fbbd53-6dde-4b45-b90f-5331b9d1e1ee'),
  ('d9f4bc49-32f2-4a50-85b7-bcc4709db2de', '3f8cc40c-f28a-41e8-82b1-74d185f8c489'),
  ('8737a5a3-4376-447b-ad55-92b4d8609528', '3f8cc40c-f28a-41e8-82b1-74d185f8c489'),
  ('a85046cf-4924-4e50-974b-cc3cfefe45fd', '3f8cc40c-f28a-41e8-82b1-74d185f8c489'),
  ('96e25e3a-e880-41d5-97eb-9b7e3886e077', '3f8cc40c-f28a-41e8-82b1-74d185f8c489'),
  ('40376577-0323-4919-819f-43db83bdf772', '3f8cc40c-f28a-41e8-82b1-74d185f8c489'),
  ('18ad700e-3bdd-48ec-b481-43ba9b329ed3', '55fbbd53-6dde-4b45-b90f-5331b9d1e1ee'),
  ('18ad700e-3bdd-48ec-b481-43ba9b329ed3', '3f8cc40c-f28a-41e8-82b1-74d185f8c489'),
  ('ea5597af-fd17-4dc9-b15f-5988936d8bee', '3f8cc40c-f28a-41e8-82b1-74d185f8c489'),
  ('65ca6146-435c-4acd-b79b-f77d5eb9410d', '3f8cc40c-f28a-41e8-82b1-74d185f8c489'),
  ('0edde97a-d2aa-4331-83a0-70bfbc700899', '67d584db-d29e-4dd6-92a1-28d608e481ab'),
  ('efef8c72-169f-40f3-b45f-86f14b5c6e9d', '67d584db-d29e-4dd6-92a1-28d608e481ab'),
  ('d5f3fdbf-f758-415e-b5a7-1bd7e019d158', '67d584db-d29e-4dd6-92a1-28d608e481ab'),
  ('47bb1cfd-b186-4c75-b120-4a3578c8ddad', '67d584db-d29e-4dd6-92a1-28d608e481ab'),
  ('53dfd120-c44b-48dd-a37f-00b5a9b3b97f', '67d584db-d29e-4dd6-92a1-28d608e481ab'),
  ('f3a49ff4-d258-4cf6-8c5d-1aff697be86b', '67d584db-d29e-4dd6-92a1-28d608e481ab'),
  ('83053904-eaa2-45b6-abe0-b194ae754c43', '67d584db-d29e-4dd6-92a1-28d608e481ab'),
  ('2c1e719f-e9a3-4823-97b2-569138d088cc', '67d584db-d29e-4dd6-92a1-28d608e481ab'),
  ('fdcae3d0-fbbf-4d88-91b5-4f810ac31ade', '67d584db-d29e-4dd6-92a1-28d608e481ab'),
  ('c02647b7-101c-409f-a49f-c87aff2145f3', '67d584db-d29e-4dd6-92a1-28d608e481ab'),
  ('6a5549cd-dcd5-4365-a31b-bf7cf779f057', '67d584db-d29e-4dd6-92a1-28d608e481ab'),
  ('6b80cdd1-1f8f-4c53-a213-632a017fece3', '67d584db-d29e-4dd6-92a1-28d608e481ab')
ON CONFLICT DO NOTHING;

-- ── Template Item Profiles (mapped to real profile IDs) ──
INSERT INTO template_item_profiles (id, template_item_id, profile_id) VALUES
  (gen_random_uuid(), 'b8eb3562-bbd9-4783-bcd1-81eaa2025260', 'ca176100-b436-4a7e-b375-aa3241b5adc4'),
  (gen_random_uuid(), 'b8eb3562-bbd9-4783-bcd1-81eaa2025260', '05dda680-f3b1-4446-99ca-b64c2cace606'),
  (gen_random_uuid(), '9e559c13-5aae-4f45-8057-507c8aa7912d', 'ca176100-b436-4a7e-b375-aa3241b5adc4'),
  (gen_random_uuid(), '9e559c13-5aae-4f45-8057-507c8aa7912d', 'ffee1abc-7b26-4bd1-9294-58f471c21549'),
  (gen_random_uuid(), '9e559c13-5aae-4f45-8057-507c8aa7912d', '461085c4-ec3c-4b3c-a67c-c413d6121db6'),
  (gen_random_uuid(), '552d2672-355d-4e63-b2d5-cf522a8f933b', '05dda680-f3b1-4446-99ca-b64c2cace606'),
  (gen_random_uuid(), '1fff32a2-a2f0-4851-8a3f-15acfc105e70', 'ca176100-b436-4a7e-b375-aa3241b5adc4'),
  (gen_random_uuid(), '1fff32a2-a2f0-4851-8a3f-15acfc105e70', '05dda680-f3b1-4446-99ca-b64c2cace606'),
  (gen_random_uuid(), 'eed353c0-94e6-48be-b02e-597c7c503c1f', 'ca176100-b436-4a7e-b375-aa3241b5adc4'),
  (gen_random_uuid(), 'eed353c0-94e6-48be-b02e-597c7c503c1f', '05dda680-f3b1-4446-99ca-b64c2cace606'),
  (gen_random_uuid(), '2ae1df6a-1967-4587-8d12-71a354a584ee', 'ffee1abc-7b26-4bd1-9294-58f471c21549'),
  (gen_random_uuid(), '2ae1df6a-1967-4587-8d12-71a354a584ee', '461085c4-ec3c-4b3c-a67c-c413d6121db6'),
  (gen_random_uuid(), '8b0a8b6a-ff6a-4376-a215-96e8b0ca8628', '461085c4-ec3c-4b3c-a67c-c413d6121db6'),
  (gen_random_uuid(), '08bc1e49-6359-4b98-be27-edb0b294cd44', '05dda680-f3b1-4446-99ca-b64c2cace606'),
  (gen_random_uuid(), '08bc1e49-6359-4b98-be27-edb0b294cd44', 'ca176100-b436-4a7e-b375-aa3241b5adc4'),
  (gen_random_uuid(), 'b167e7bc-e2db-4051-aa20-d3adb8c6e855', '05dda680-f3b1-4446-99ca-b64c2cace606'),
  (gen_random_uuid(), '09e2c09d-9137-4764-8ae2-2da6fda28e0d', '05dda680-f3b1-4446-99ca-b64c2cace606'),
  (gen_random_uuid(), 'dc65f071-1b0c-4470-9ba7-31bf3c046c1f', '05dda680-f3b1-4446-99ca-b64c2cace606'),
  (gen_random_uuid(), 'e73f985b-232a-4f5e-9dd8-505b03900868', '05dda680-f3b1-4446-99ca-b64c2cace606'),
  (gen_random_uuid(), 'e57742af-49b7-4ed6-8dd8-f24bfa84cd79', 'ffee1abc-7b26-4bd1-9294-58f471c21549'),
  (gen_random_uuid(), 'e57742af-49b7-4ed6-8dd8-f24bfa84cd79', '461085c4-ec3c-4b3c-a67c-c413d6121db6'),
  (gen_random_uuid(), '96e25e3a-e880-41d5-97eb-9b7e3886e077', '461085c4-ec3c-4b3c-a67c-c413d6121db6'),
  (gen_random_uuid(), '96e25e3a-e880-41d5-97eb-9b7e3886e077', 'ffee1abc-7b26-4bd1-9294-58f471c21549'),
  (gen_random_uuid(), 'ffffe31d-a84f-4142-abfc-bcd40726ef9c', 'ca176100-b436-4a7e-b375-aa3241b5adc4'),
  (gen_random_uuid(), '0edde97a-d2aa-4331-83a0-70bfbc700899', 'ffee1abc-7b26-4bd1-9294-58f471c21549'),
  (gen_random_uuid(), 'd5f3fdbf-f758-415e-b5a7-1bd7e019d158', 'ffee1abc-7b26-4bd1-9294-58f471c21549'),
  (gen_random_uuid(), '47bb1cfd-b186-4c75-b120-4a3578c8ddad', 'ffee1abc-7b26-4bd1-9294-58f471c21549'),
  (gen_random_uuid(), '53dfd120-c44b-48dd-a37f-00b5a9b3b97f', 'ffee1abc-7b26-4bd1-9294-58f471c21549'),
  (gen_random_uuid(), 'f3a49ff4-d258-4cf6-8c5d-1aff697be86b', '461085c4-ec3c-4b3c-a67c-c413d6121db6'),
  (gen_random_uuid(), '83053904-eaa2-45b6-abe0-b194ae754c43', 'ffee1abc-7b26-4bd1-9294-58f471c21549'),
  (gen_random_uuid(), '2c1e719f-e9a3-4823-97b2-569138d088cc', '461085c4-ec3c-4b3c-a67c-c413d6121db6'),
  (gen_random_uuid(), 'fdcae3d0-fbbf-4d88-91b5-4f810ac31ade', '461085c4-ec3c-4b3c-a67c-c413d6121db6'),
  (gen_random_uuid(), 'c02647b7-101c-409f-a49f-c87aff2145f3', 'ffee1abc-7b26-4bd1-9294-58f471c21549'),
  (gen_random_uuid(), '6b80cdd1-1f8f-4c53-a213-632a017fece3', '461085c4-ec3c-4b3c-a67c-c413d6121db6');

-- ── Task Templates ──
INSERT INTO task_templates (id, family_id, title, deadline_days, is_all_family, active, created_at, updated_at) VALUES
  ('54ee7e23-bcd9-45ef-bb10-ac4be047c13f', '276bd790-5213-4f75-be38-103c1a6a79df', 'Comprar Voos ida', 90, true, true, now(), now()),
  ('c4af2584-7667-4f83-8c5a-d8cd34e3e808', '276bd790-5213-4f75-be38-103c1a6a79df', 'Comprar Voos Volta', 90, true, true, now(), now()),
  ('12b23d34-4128-4d51-a65d-bcfbc87b6931', '276bd790-5213-4f75-be38-103c1a6a79df', 'Rent-a-car', 30, true, true, now(), now()),
  ('d33a1e5b-bada-4903-85a7-2a8a2b4b583e', '276bd790-5213-4f75-be38-103c1a6a79df', 'Reservar Alojamento', 60, true, true, now(), now()),
  ('1ee0061b-7a7a-4945-a56c-d9b3fabacd13', '276bd790-5213-4f75-be38-103c1a6a79df', 'Verificar validade carta de conducao', 60, false, true, now(), now()),
  ('e89af510-2a5f-4335-b312-98bf3e4a2705', '276bd790-5213-4f75-be38-103c1a6a79df', 'Verificar validade cartão de crédito', 60, false, true, now(), now()),
  ('b2b818c3-cd0e-4d23-b879-e4a982dbb256', '276bd790-5213-4f75-be38-103c1a6a79df', 'Verificar validade cartão de débito', 60, false, true, now(), now()),
  ('1d9a86a8-20e7-46dd-aea8-411d5a1f316c', '276bd790-5213-4f75-be38-103c1a6a79df', 'Verificar validade CC', 60, false, true, now(), now()),
  ('49980c6e-f24f-451e-8c9b-7be9467f5d74', '276bd790-5213-4f75-be38-103c1a6a79df', 'Verificar validade passaporte', 60, false, true, now(), now()),
  ('6f8dc3b5-4582-4d92-bd55-8a1b01abbd70', '276bd790-5213-4f75-be38-103c1a6a79df', 'Verificar validade seguro europeu', 60, false, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── Task Template Tags ──
INSERT INTO task_template_tags (id, task_template_id, tag_id) VALUES
  (gen_random_uuid(), '6f8dc3b5-4582-4d92-bd55-8a1b01abbd70', 'a9444a66-0cf0-4b3c-8f0b-1fab86d373b9'),
  (gen_random_uuid(), '12b23d34-4128-4d51-a65d-bcfbc87b6931', 'ea7ead68-f2e2-45dc-b005-af3e97b310f4'),
  (gen_random_uuid(), '1ee0061b-7a7a-4945-a56c-d9b3fabacd13', 'ea7ead68-f2e2-45dc-b005-af3e97b310f4'),
  (gen_random_uuid(), '49980c6e-f24f-451e-8c9b-7be9467f5d74', '227382f4-868f-436f-844b-1353ff650770'),
  (gen_random_uuid(), '54ee7e23-bcd9-45ef-bb10-ac4be047c13f', 'b7a105f3-b242-47d6-a74b-5c837d79ab72'),
  (gen_random_uuid(), 'c4af2584-7667-4f83-8c5a-d8cd34e3e808', 'b7a105f3-b242-47d6-a74b-5c837d79ab72'),
  (gen_random_uuid(), 'd33a1e5b-bada-4903-85a7-2a8a2b4b583e', 'e5ab85a7-beca-479d-9b07-9fb9bb0502cd'),
  (gen_random_uuid(), '1d9a86a8-20e7-46dd-aea8-411d5a1f316c', 'a9444a66-0cf0-4b3c-8f0b-1fab86d373b9'),
  (gen_random_uuid(), '1d9a86a8-20e7-46dd-aea8-411d5a1f316c', '227382f4-868f-436f-844b-1353ff650770'),
  (gen_random_uuid(), 'e89af510-2a5f-4335-b312-98bf3e4a2705', 'a9444a66-0cf0-4b3c-8f0b-1fab86d373b9'),
  (gen_random_uuid(), 'e89af510-2a5f-4335-b312-98bf3e4a2705', '227382f4-868f-436f-844b-1353ff650770'),
  (gen_random_uuid(), 'b2b818c3-cd0e-4d23-b879-e4a982dbb256', 'a9444a66-0cf0-4b3c-8f0b-1fab86d373b9'),
  (gen_random_uuid(), 'b2b818c3-cd0e-4d23-b879-e4a982dbb256', '227382f4-868f-436f-844b-1353ff650770')
ON CONFLICT DO NOTHING;

-- ── Task Template Profiles (mapped to real profile IDs) ──
INSERT INTO task_template_profiles (id, task_template_id, profile_id) VALUES
  (gen_random_uuid(), '1ee0061b-7a7a-4945-a56c-d9b3fabacd13', '05dda680-f3b1-4446-99ca-b64c2cace606'),
  (gen_random_uuid(), '1ee0061b-7a7a-4945-a56c-d9b3fabacd13', 'ca176100-b436-4a7e-b375-aa3241b5adc4'),
  (gen_random_uuid(), 'e89af510-2a5f-4335-b312-98bf3e4a2705', '05dda680-f3b1-4446-99ca-b64c2cace606'),
  (gen_random_uuid(), 'e89af510-2a5f-4335-b312-98bf3e4a2705', 'ca176100-b436-4a7e-b375-aa3241b5adc4'),
  (gen_random_uuid(), 'b2b818c3-cd0e-4d23-b879-e4a982dbb256', 'ca176100-b436-4a7e-b375-aa3241b5adc4'),
  (gen_random_uuid(), 'b2b818c3-cd0e-4d23-b879-e4a982dbb256', '05dda680-f3b1-4446-99ca-b64c2cace606')
ON CONFLICT DO NOTHING;

-- ── Vacation Templates ──
INSERT INTO vacation_templates (id, family_id, title, country_code, cover_image_url, created_at, updated_at) VALUES
  ('ef204892-a003-4549-a46b-16e169f29309', '276bd790-5213-4f75-be38-103c1a6a79df', 'Coimbra', 'PRT', NULL, now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO vacation_template_participants (id, vacation_template_id, profile_id) VALUES
  (gen_random_uuid(), 'ef204892-a003-4549-a46b-16e169f29309', '05dda680-f3b1-4446-99ca-b64c2cace606'),
  (gen_random_uuid(), 'ef204892-a003-4549-a46b-16e169f29309', 'ca176100-b436-4a7e-b375-aa3241b5adc4'),
  (gen_random_uuid(), 'ef204892-a003-4549-a46b-16e169f29309', 'ffee1abc-7b26-4bd1-9294-58f471c21549'),
  (gen_random_uuid(), 'ef204892-a003-4549-a46b-16e169f29309', '461085c4-ec3c-4b3c-a67c-c413d6121db6')
ON CONFLICT DO NOTHING;

INSERT INTO vacation_template_tags (id, vacation_template_id, tag_id) VALUES
  (gen_random_uuid(), 'ef204892-a003-4549-a46b-16e169f29309', '67d584db-d29e-4dd6-92a1-28d608e481ab'),
  (gen_random_uuid(), 'ef204892-a003-4549-a46b-16e169f29309', '917f675a-68d1-48dd-ad4f-9993a52a73f3'),
  (gen_random_uuid(), 'ef204892-a003-4549-a46b-16e169f29309', '376d7631-ca2b-4ba6-9f8d-031648162147')
ON CONFLICT DO NOTHING;
