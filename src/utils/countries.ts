/** Converts a 2-letter ISO country code to its flag emoji. */
export function countryFlag(iso2: string): string {
  const upper = iso2.toUpperCase();
  const offset = 0x1f1e6 - 65;
  return String.fromCodePoint(upper.charCodeAt(0) + offset, upper.charCodeAt(1) + offset);
}

export interface Country {
  id: string; // ISO 3166-1 alpha-3 (PRT, ESP...)
  iso2: string; // ISO 3166-1 alpha-2 (PT, ES...) — used for flag emoji
  name: string;
}

/** Static fallback list sorted A-Z by Portuguese name. DB is the source of truth. */
export const COUNTRIES: Country[] = [
  { id: 'ZAF', iso2: 'ZA', name: 'África do Sul' },
  { id: 'DEU', iso2: 'DE', name: 'Alemanha' },
  { id: 'AGO', iso2: 'AO', name: 'Angola' },
  { id: 'SAU', iso2: 'SA', name: 'Arábia Saudita' },
  { id: 'ARG', iso2: 'AR', name: 'Argentina' },
  { id: 'AUS', iso2: 'AU', name: 'Austrália' },
  { id: 'AUT', iso2: 'AT', name: 'Áustria' },
  { id: 'BEL', iso2: 'BE', name: 'Bélgica' },
  { id: 'BRA', iso2: 'BR', name: 'Brasil' },
  { id: 'BGR', iso2: 'BG', name: 'Bulgária' },
  { id: 'CPV', iso2: 'CV', name: 'Cabo Verde' },
  { id: 'CAN', iso2: 'CA', name: 'Canadá' },
  { id: 'QAT', iso2: 'QA', name: 'Catar' },
  { id: 'CZE', iso2: 'CZ', name: 'Chéquia' },
  { id: 'CHL', iso2: 'CL', name: 'Chile' },
  { id: 'CHN', iso2: 'CN', name: 'China' },
  { id: 'CYP', iso2: 'CY', name: 'Chipre' },
  { id: 'COL', iso2: 'CO', name: 'Colômbia' },
  { id: 'KOR', iso2: 'KR', name: 'Coreia do Sul' },
  { id: 'CRI', iso2: 'CR', name: 'Costa Rica' },
  { id: 'HRV', iso2: 'HR', name: 'Croácia' },
  { id: 'CUB', iso2: 'CU', name: 'Cuba' },
  { id: 'DNK', iso2: 'DK', name: 'Dinamarca' },
  { id: 'EGY', iso2: 'EG', name: 'Egito' },
  { id: 'ARE', iso2: 'AE', name: 'Emirados Árabes' },
  { id: 'SVK', iso2: 'SK', name: 'Eslováquia' },
  { id: 'SVN', iso2: 'SI', name: 'Eslovénia' },
  { id: 'ESP', iso2: 'ES', name: 'Espanha' },
  { id: 'USA', iso2: 'US', name: 'Estados Unidos' },
  { id: 'EST', iso2: 'EE', name: 'Estónia' },
  { id: 'PHL', iso2: 'PH', name: 'Filipinas' },
  { id: 'FIN', iso2: 'FI', name: 'Finlândia' },
  { id: 'FRA', iso2: 'FR', name: 'França' },
  { id: 'GRC', iso2: 'GR', name: 'Grécia' },
  { id: 'HUN', iso2: 'HU', name: 'Hungria' },
  { id: 'IND', iso2: 'IN', name: 'Índia' },
  { id: 'IDN', iso2: 'ID', name: 'Indonésia' },
  { id: 'IRL', iso2: 'IE', name: 'Irlanda' },
  { id: 'ISL', iso2: 'IS', name: 'Islândia' },
  { id: 'ISR', iso2: 'IL', name: 'Israel' },
  { id: 'ITA', iso2: 'IT', name: 'Itália' },
  { id: 'JAM', iso2: 'JM', name: 'Jamaica' },
  { id: 'JPN', iso2: 'JP', name: 'Japão' },
  { id: 'JOR', iso2: 'JO', name: 'Jordânia' },
  { id: 'LVA', iso2: 'LV', name: 'Letónia' },
  { id: 'LTU', iso2: 'LT', name: 'Lituânia' },
  { id: 'LUX', iso2: 'LU', name: 'Luxemburgo' },
  { id: 'MYS', iso2: 'MY', name: 'Malásia' },
  { id: 'MLT', iso2: 'MT', name: 'Malta' },
  { id: 'MAR', iso2: 'MA', name: 'Marrocos' },
  { id: 'MEX', iso2: 'MX', name: 'México' },
  { id: 'MOZ', iso2: 'MZ', name: 'Moçambique' },
  { id: 'NOR', iso2: 'NO', name: 'Noruega' },
  { id: 'NZL', iso2: 'NZ', name: 'Nova Zelândia' },
  { id: 'NLD', iso2: 'NL', name: 'Países Baixos' },
  { id: 'PAN', iso2: 'PA', name: 'Panamá' },
  { id: 'PER', iso2: 'PE', name: 'Peru' },
  { id: 'POL', iso2: 'PL', name: 'Polónia' },
  { id: 'PRT', iso2: 'PT', name: 'Portugal' },
  { id: 'KEN', iso2: 'KE', name: 'Quénia' },
  { id: 'GBR', iso2: 'GB', name: 'Reino Unido' },
  { id: 'DOM', iso2: 'DO', name: 'República Dominicana' },
  { id: 'ROU', iso2: 'RO', name: 'Roménia' },
  { id: 'RUS', iso2: 'RU', name: 'Rússia' },
  { id: 'SGP', iso2: 'SG', name: 'Singapura' },
  { id: 'SWE', iso2: 'SE', name: 'Suécia' },
  { id: 'CHE', iso2: 'CH', name: 'Suíça' },
  { id: 'THA', iso2: 'TH', name: 'Tailândia' },
  { id: 'TZA', iso2: 'TZ', name: 'Tanzânia' },
  { id: 'TUN', iso2: 'TN', name: 'Tunísia' },
  { id: 'TUR', iso2: 'TR', name: 'Turquia' },
  { id: 'UKR', iso2: 'UA', name: 'Ucrânia' },
  { id: 'VNM', iso2: 'VN', name: 'Vietname' },
];

/** Find country by ISO3 id. */
export function findCountry(id: string): Country | undefined {
  return COUNTRIES.find((c) => c.id === id);
}

/** Get the ISO2 code for flag emoji from an ISO3 country id. */
export function countryIso2(id: string): string {
  return findCountry(id)?.iso2 ?? 'PT';
}
