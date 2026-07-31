// =========================================================
// SINCRO — countries.js
// Catálogo de países para que Sincro funcione entre cualquier
// par de países del mundo, no solo Colombia/España.
// La bandera se calcula a partir del código ISO-3166 alpha-2
// (símbolos regionales Unicode), así que no hay que mantener
// una lista de emojis a mano.
// =========================================================

export function countryFlagEmoji(iso2) {
  if (!iso2 || iso2.length !== 2) return '🏳️';
  const codePoints = [...iso2.toUpperCase()].map((c) => 0x1F1E6 + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...codePoints);
}

// Un huso horario representativo por país (normalmente el de la
// capital o la zona más poblada). Para países con varios husos
// esto es una simplificación deliberada — sigue siendo mucho más
// flexible que fijar solo Colombia/España.
export const COUNTRIES = [
  { code: 'CO', name: 'Colombia', tz: 'America/Bogota' },
  { code: 'ES', name: 'España', tz: 'Europe/Madrid' },
  { code: 'MX', name: 'México', tz: 'America/Mexico_City' },
  { code: 'AR', name: 'Argentina', tz: 'America/Argentina/Buenos_Aires' },
  { code: 'CL', name: 'Chile', tz: 'America/Santiago' },
  { code: 'PE', name: 'Perú', tz: 'America/Lima' },
  { code: 'VE', name: 'Venezuela', tz: 'America/Caracas' },
  { code: 'EC', name: 'Ecuador', tz: 'America/Guayaquil' },
  { code: 'BO', name: 'Bolivia', tz: 'America/La_Paz' },
  { code: 'PY', name: 'Paraguay', tz: 'America/Asuncion' },
  { code: 'UY', name: 'Uruguay', tz: 'America/Montevideo' },
  { code: 'CR', name: 'Costa Rica', tz: 'America/Costa_Rica' },
  { code: 'PA', name: 'Panamá', tz: 'America/Panama' },
  { code: 'GT', name: 'Guatemala', tz: 'America/Guatemala' },
  { code: 'HN', name: 'Honduras', tz: 'America/Tegucigalpa' },
  { code: 'SV', name: 'El Salvador', tz: 'America/El_Salvador' },
  { code: 'NI', name: 'Nicaragua', tz: 'America/Managua' },
  { code: 'DO', name: 'República Dominicana', tz: 'America/Santo_Domingo' },
  { code: 'PR', name: 'Puerto Rico', tz: 'America/Puerto_Rico' },
  { code: 'CU', name: 'Cuba', tz: 'America/Havana' },
  { code: 'US', name: 'Estados Unidos', tz: 'America/New_York' },
  { code: 'CA', name: 'Canadá', tz: 'America/Toronto' },
  { code: 'BR', name: 'Brasil', tz: 'America/Sao_Paulo' },
  { code: 'GB', name: 'Reino Unido', tz: 'Europe/London' },
  { code: 'FR', name: 'Francia', tz: 'Europe/Paris' },
  { code: 'DE', name: 'Alemania', tz: 'Europe/Berlin' },
  { code: 'IT', name: 'Italia', tz: 'Europe/Rome' },
  { code: 'PT', name: 'Portugal', tz: 'Europe/Lisbon' },
  { code: 'NL', name: 'Países Bajos', tz: 'Europe/Amsterdam' },
  { code: 'BE', name: 'Bélgica', tz: 'Europe/Brussels' },
  { code: 'CH', name: 'Suiza', tz: 'Europe/Zurich' },
  { code: 'IE', name: 'Irlanda', tz: 'Europe/Dublin' },
  { code: 'SE', name: 'Suecia', tz: 'Europe/Stockholm' },
  { code: 'PL', name: 'Polonia', tz: 'Europe/Warsaw' },
  { code: 'GR', name: 'Grecia', tz: 'Europe/Athens' },
  { code: 'TR', name: 'Turquía', tz: 'Europe/Istanbul' },
  { code: 'MA', name: 'Marruecos', tz: 'Africa/Casablanca' },
  { code: 'ZA', name: 'Sudáfrica', tz: 'Africa/Johannesburg' },
  { code: 'EG', name: 'Egipto', tz: 'Africa/Cairo' },
  { code: 'NG', name: 'Nigeria', tz: 'Africa/Lagos' },
  { code: 'AE', name: 'Emiratos Árabes Unidos', tz: 'Asia/Dubai' },
  { code: 'IN', name: 'India', tz: 'Asia/Kolkata' },
  { code: 'CN', name: 'China', tz: 'Asia/Shanghai' },
  { code: 'JP', name: 'Japón', tz: 'Asia/Tokyo' },
  { code: 'KR', name: 'Corea del Sur', tz: 'Asia/Seoul' },
  { code: 'PH', name: 'Filipinas', tz: 'Asia/Manila' },
  { code: 'TH', name: 'Tailandia', tz: 'Asia/Bangkok' },
  { code: 'VN', name: 'Vietnam', tz: 'Asia/Ho_Chi_Minh' },
  { code: 'ID', name: 'Indonesia', tz: 'Asia/Jakarta' },
  { code: 'AU', name: 'Australia', tz: 'Australia/Sydney' },
  { code: 'NZ', name: 'Nueva Zelanda', tz: 'Pacific/Auckland' },
].sort((a, b) => a.name.localeCompare(b.name, 'es'));

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCountry(code) {
  return BY_CODE.get(code) || null;
}

export function getCountryTz(code) {
  return getCountry(code)?.tz || 'UTC';
}

export function getCountryLabel(code) {
  return getCountry(code)?.name || code || '—';
}
