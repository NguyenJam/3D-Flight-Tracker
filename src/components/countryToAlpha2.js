// ISO country code lookup for OpenSky country names
import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
countries.registerLocale(en);

// Map OpenSky country names to ISO 3166-1 alpha-2 codes
const COUNTRY_OVERRIDES = {
  'United States': 'US', 'United States of America': 'US', 'USA': 'US',
  'United Kingdom': 'GB', 'Great Britain': 'GB', 'England': 'GB',
  'South Korea': 'KR', 'Korea, Republic of': 'KR', 'Republic of Korea': 'KR',
  'North Korea': 'KP', 'Korea, Democratic People\'s Republic of': 'KP',
  'Czech Republic': 'CZ', 'Czechia': 'CZ',
  'Russia': 'RU', 'Russian Federation': 'RU',
  'Qatar': 'QA',
  'United Arab Emirates': 'AE', 'UAE': 'AE',
  'Vietnam': 'VN', 'Viet Nam': 'VN',
  'China': 'CN', 'Hong Kong': 'HK', 'Taiwan': 'TW', 'Macao': 'MO',
  'Japan': 'JP', 'Singapore': 'SG', 'Malaysia': 'MY', 'Indonesia': 'ID', 'Philippines': 'PH',
  'Thailand': 'TH', 'India': 'IN', 'Turkey': 'TR', 'Ethiopia': 'ET', 'South Africa': 'ZA',
  'France': 'FR', 'Germany': 'DE', 'Spain': 'ES', 'Italy': 'IT', 'Netherlands': 'NL',
  'Belgium': 'BE', 'Switzerland': 'CH', 'Austria': 'AT', 'Portugal': 'PT', 'Greece': 'GR',
  'Canada': 'CA', 'Mexico': 'MX', 'Brazil': 'BR', 'Argentina': 'AR', 'Chile': 'CL',
  'Colombia': 'CO', 'Peru': 'PE', 'Australia': 'AU', 'New Zealand': 'NZ',
  'Chile': 'CL', 'Bolivia': 'BO', 'Paraguay': 'PY', 'Uruguay': 'UY', 'Venezuela': 'VE',
  'Morocco': 'MA', 'Algeria': 'DZ', 'Tunisia': 'TN', 'Egypt': 'EG', 'Nigeria': 'NG',
  'Pakistan': 'PK', 'Bangladesh': 'BD', 'Sri Lanka': 'LK', 'Nepal': 'NP', 'Afghanistan': 'AF',
  'Saudi Arabia': 'SA', 'Israel': 'IL', 'Jordan': 'JO', 'Lebanon': 'LB', 'Iran': 'IR',
  'Iraq': 'IQ', 'Syria': 'SY', 'Kuwait': 'KW', 'Oman': 'OM', 'Yemen': 'YE', 'Bahrain': 'BH',
  'Qatar': 'QA', 'United Arab Emirates': 'AE', 'UAE': 'AE',
  'Poland': 'PL', 'Hungary': 'HU', 'Romania': 'RO', 'Slovakia': 'SK', 'Slovenia': 'SI',
  'Croatia': 'HR', 'Serbia': 'RS', 'Montenegro': 'ME', 'Bosnia and Herzegovina': 'BA',
  'North Macedonia': 'MK', 'Albania': 'AL', 'Bulgaria': 'BG', 'Estonia': 'EE', 'Latvia': 'LV', 'Lithuania': 'LT',
  'Denmark': 'DK', 'Sweden': 'SE', 'Norway': 'NO', 'Finland': 'FI', 'Iceland': 'IS',
  'Ireland': 'IE', 'Luxembourg': 'LU', 'Liechtenstein': 'LI', 'Monaco': 'MC', 'San Marino': 'SM', 'Andorra': 'AD',
  'Malta': 'MT', 'Cyprus': 'CY', 'Georgia': 'GE', 'Armenia': 'AM', 'Azerbaijan': 'AZ',
  'Kazakhstan': 'KZ', 'Uzbekistan': 'UZ', 'Turkmenistan': 'TM', 'Kyrgyzstan': 'KG', 'Tajikistan': 'TJ',
  'Mongolia': 'MN', 'Cambodia': 'KH', 'Laos': 'LA', 'Myanmar': 'MM', 'Brunei': 'BN',
  'Timor-Leste': 'TL', 'Papua New Guinea': 'PG', 'Fiji': 'FJ', 'Samoa': 'WS', 'Tonga': 'TO',
  'Solomon Islands': 'SB', 'Vanuatu': 'VU', 'Micronesia': 'FM', 'Palau': 'PW', 'Marshall Islands': 'MH',
  'Kiribati': 'KI', 'Nauru': 'NR', 'Tuvalu': 'TV',
};

export function countryToAlpha2(country) {
  if (!country || typeof country !== 'string') return undefined;
  const trimmed = country.trim();
  if (COUNTRY_OVERRIDES[trimmed]) return COUNTRY_OVERRIDES[trimmed];
  const code = countries.getAlpha2Code(trimmed, 'en');
  if (code) return code;
  // Try first two uppercase letters if they look like a code
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return undefined;
}