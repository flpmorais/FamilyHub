-- Migration 017: Countries table + vacation covers bucket
--
-- 1. Create countries reference table (id = ISO 3166-1 alpha-3)
-- 2. Migrate vacations.country_code from alpha-2 to alpha-3
-- 3. Create vacation_covers storage bucket

-- ─── 1. Countries table ─────────────────────────────────────────────────────

CREATE TABLE countries (
  id   text PRIMARY KEY,  -- ISO 3166-1 alpha-3 (PRT, ESP, FRA...)
  iso2 text NOT NULL,     -- ISO 3166-1 alpha-2 (PT, ES, FR...) — used for flag emoji
  name text NOT NULL
);

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "countries_select_authenticated"
  ON countries FOR SELECT TO authenticated USING (true);

INSERT INTO countries (id, iso2, name) VALUES
  ('ZAF', 'ZA', 'África do Sul'),
  ('DEU', 'DE', 'Alemanha'),
  ('AGO', 'AO', 'Angola'),
  ('SAU', 'SA', 'Arábia Saudita'),
  ('ARG', 'AR', 'Argentina'),
  ('AUS', 'AU', 'Austrália'),
  ('AUT', 'AT', 'Áustria'),
  ('BEL', 'BE', 'Bélgica'),
  ('BRA', 'BR', 'Brasil'),
  ('BGR', 'BG', 'Bulgária'),
  ('CPV', 'CV', 'Cabo Verde'),
  ('CAN', 'CA', 'Canadá'),
  ('QAT', 'QA', 'Catar'),
  ('CZE', 'CZ', 'Chéquia'),
  ('CHL', 'CL', 'Chile'),
  ('CHN', 'CN', 'China'),
  ('CYP', 'CY', 'Chipre'),
  ('COL', 'CO', 'Colômbia'),
  ('KOR', 'KR', 'Coreia do Sul'),
  ('CRI', 'CR', 'Costa Rica'),
  ('HRV', 'HR', 'Croácia'),
  ('CUB', 'CU', 'Cuba'),
  ('DNK', 'DK', 'Dinamarca'),
  ('EGY', 'EG', 'Egito'),
  ('ARE', 'AE', 'Emirados Árabes'),
  ('SVK', 'SK', 'Eslováquia'),
  ('SVN', 'SI', 'Eslovénia'),
  ('ESP', 'ES', 'Espanha'),
  ('USA', 'US', 'Estados Unidos'),
  ('EST', 'EE', 'Estónia'),
  ('PHL', 'PH', 'Filipinas'),
  ('FIN', 'FI', 'Finlândia'),
  ('FRA', 'FR', 'França'),
  ('GRC', 'GR', 'Grécia'),
  ('HUN', 'HU', 'Hungria'),
  ('IND', 'IN', 'Índia'),
  ('IDN', 'ID', 'Indonésia'),
  ('IRL', 'IE', 'Irlanda'),
  ('ISL', 'IS', 'Islândia'),
  ('ISR', 'IL', 'Israel'),
  ('ITA', 'IT', 'Itália'),
  ('JAM', 'JM', 'Jamaica'),
  ('JPN', 'JP', 'Japão'),
  ('JOR', 'JO', 'Jordânia'),
  ('LVA', 'LV', 'Letónia'),
  ('LTU', 'LT', 'Lituânia'),
  ('LUX', 'LU', 'Luxemburgo'),
  ('MYS', 'MY', 'Malásia'),
  ('MLT', 'MT', 'Malta'),
  ('MAR', 'MA', 'Marrocos'),
  ('MEX', 'MX', 'México'),
  ('MOZ', 'MZ', 'Moçambique'),
  ('NOR', 'NO', 'Noruega'),
  ('NZL', 'NZ', 'Nova Zelândia'),
  ('NLD', 'NL', 'Países Baixos'),
  ('PAN', 'PA', 'Panamá'),
  ('PER', 'PE', 'Peru'),
  ('POL', 'PL', 'Polónia'),
  ('PRT', 'PT', 'Portugal'),
  ('KEN', 'KE', 'Quénia'),
  ('GBR', 'GB', 'Reino Unido'),
  ('DOM', 'DO', 'República Dominicana'),
  ('ROU', 'RO', 'Roménia'),
  ('RUS', 'RU', 'Rússia'),
  ('SGP', 'SG', 'Singapura'),
  ('SWE', 'SE', 'Suécia'),
  ('CHE', 'CH', 'Suíça'),
  ('THA', 'TH', 'Tailândia'),
  ('TZA', 'TZ', 'Tanzânia'),
  ('TUN', 'TN', 'Tunísia'),
  ('TUR', 'TR', 'Turquia'),
  ('UKR', 'UA', 'Ucrânia'),
  ('VNM', 'VN', 'Vietname');

-- ─── 2. Migrate vacations.country_code from alpha-2 to alpha-3 ──────────────

-- Map existing ISO2 values to ISO3
UPDATE vacations v
SET country_code = c.id
FROM countries c
WHERE c.iso2 = v.country_code;

-- Default any remaining (shouldn't happen, but safety)
UPDATE vacations SET country_code = 'PRT' WHERE length(country_code) = 2;

-- Add FK constraint
ALTER TABLE vacations
  ADD CONSTRAINT vacations_country_code_fk FOREIGN KEY (country_code) REFERENCES countries(id);

-- ─── 3. Vacation covers storage bucket ──────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vacation-covers',
  'vacation-covers',
  true,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "vacation_covers_family_access"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'vacation-covers'
    AND (storage.foldername(name))[1] = current_user_family_id()::text
  )
  WITH CHECK (
    bucket_id = 'vacation-covers'
    AND (storage.foldername(name))[1] = current_user_family_id()::text
  );
