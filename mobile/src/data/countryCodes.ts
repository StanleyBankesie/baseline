export interface CountryCodeOption {
  name: string;
  dialCode: string;
  iso2: string;
}

export const COUNTRY_CODE_API_URL = "https://country-code.com/api/countries";

export const COUNTRY_CODE_FALLBACKS: CountryCodeOption[] = [
  { name: "Algeria", dialCode: "+213", iso2: "DZ" },
  { name: "Australia", dialCode: "+61", iso2: "AU" },
  { name: "Canada", dialCode: "+1", iso2: "CA" },
  { name: "China", dialCode: "+86", iso2: "CN" },
  { name: "Egypt", dialCode: "+20", iso2: "EG" },
  { name: "Ethiopia", dialCode: "+251", iso2: "ET" },
  { name: "France", dialCode: "+33", iso2: "FR" },
  { name: "Gambia", dialCode: "+220", iso2: "GM" },
  { name: "Germany", dialCode: "+49", iso2: "DE" },
  { name: "Ghana", dialCode: "+233", iso2: "GH" },
  { name: "India", dialCode: "+91", iso2: "IN" },
  { name: "Ireland", dialCode: "+353", iso2: "IE" },
  { name: "Italy", dialCode: "+39", iso2: "IT" },
  { name: "Ivory Coast", dialCode: "+225", iso2: "CI" },
  { name: "Kenya", dialCode: "+254", iso2: "KE" },
  { name: "Liberia", dialCode: "+231", iso2: "LR" },
  { name: "Morocco", dialCode: "+212", iso2: "MA" },
  { name: "Netherlands", dialCode: "+31", iso2: "NL" },
  { name: "Nigeria", dialCode: "+234", iso2: "NG" },
  { name: "Pakistan", dialCode: "+92", iso2: "PK" },
  { name: "Qatar", dialCode: "+974", iso2: "QA" },
  { name: "Saudi Arabia", dialCode: "+966", iso2: "SA" },
  { name: "Senegal", dialCode: "+221", iso2: "SN" },
  { name: "Sierra Leone", dialCode: "+232", iso2: "SL" },
  { name: "South Africa", dialCode: "+27", iso2: "ZA" },
  { name: "Spain", dialCode: "+34", iso2: "ES" },
  { name: "Tanzania", dialCode: "+255", iso2: "TZ" },
  { name: "Togo", dialCode: "+228", iso2: "TG" },
  { name: "Turkey", dialCode: "+90", iso2: "TR" },
  { name: "Uganda", dialCode: "+256", iso2: "UG" },
  { name: "United Arab Emirates", dialCode: "+971", iso2: "AE" },
  { name: "United Kingdom", dialCode: "+44", iso2: "GB" },
  { name: "United States", dialCode: "+1", iso2: "US" },
  { name: "Zambia", dialCode: "+260", iso2: "ZM" },
  { name: "Zimbabwe", dialCode: "+263", iso2: "ZW" },
];
