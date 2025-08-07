
export interface Country {
  code: string;
  name: string;
  flag: string;
  isGDPR: boolean;
}

export const GDPR_COUNTRIES = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'IS',
  'LI',
  'NO',
];

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', isGDPR: false },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', isGDPR: false },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', isGDPR: false },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', isGDPR: false },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', isGDPR: false },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', isGDPR: false },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', isGDPR: false },
  { code: 'CN', name: 'China', flag: '🇨🇳', isGDPR: false },
  { code: 'IN', name: 'India', flag: '🇮🇳', isGDPR: false },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', isGDPR: false },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', isGDPR: false },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', isGDPR: false },

  // GDPR Countries
  { code: 'AT', name: 'Austria', flag: '🇦🇹', isGDPR: true },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', isGDPR: true },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', isGDPR: true },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', isGDPR: true },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾', isGDPR: true },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', isGDPR: true },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', isGDPR: true },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', isGDPR: true },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', isGDPR: true },
  { code: 'FR', name: 'France', flag: '🇫🇷', isGDPR: true },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', isGDPR: true },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', isGDPR: true },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', isGDPR: true },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', isGDPR: true },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', isGDPR: true },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', isGDPR: true },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', isGDPR: true },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', isGDPR: true },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', isGDPR: true },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', isGDPR: true },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', isGDPR: true },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', isGDPR: true },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', isGDPR: true },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', isGDPR: true },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', isGDPR: true },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', isGDPR: true },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', isGDPR: true },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸', isGDPR: true },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', isGDPR: true },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', isGDPR: true },

  // Other countries
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', isGDPR: false },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', isGDPR: false },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', isGDPR: false },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', isGDPR: false },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', isGDPR: false },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', isGDPR: false },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', isGDPR: false },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', isGDPR: false },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', isGDPR: false },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', isGDPR: false },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', isGDPR: false },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', isGDPR: false },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', isGDPR: false },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', isGDPR: false },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', isGDPR: false },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', isGDPR: false },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', isGDPR: false },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', isGDPR: false },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', isGDPR: false },
].sort((a, b) => a.name.localeCompare(b.name));

export const getCountryByCode = (code: string): Country | undefined => {
  return COUNTRIES.find(country => country.code === code);
};

export const detectUserRegion = (): string => {
  // In a real app, this would use device locale or IP geolocation
  // For now, return US as default
  const locale = 'en-US'; // Would be: Localization.locale
  const regionCode = locale.split('-')[1] || 'US';
  return regionCode;
};
