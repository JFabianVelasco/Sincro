// =========================================================
// SINCRO — time.js
// Toda la lógica horaria: hora local por zona horaria (con
// soporte automático de horario de verano vía Intl), diferencia
// horaria, saludo y estimación de "buen momento para hablar".
// Reglas puras, sin IA.
// =========================================================

/** Devuelve el desfase de una zona horaria respecto a UTC, en minutos, para un instante dado. */
export function getOffsetMinutes(timeZone, date = new Date()) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = dtf.formatToParts(date).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const hour = parts.hour === '24' ? '00' : parts.hour;
  const asUTC = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(hour), Number(parts.minute), Number(parts.second)
  );
  return (asUTC - date.getTime()) / 60000;
}

/** Diferencia horaria (en horas) entre dos zonas, positiva o negativa, calculada en vivo. */
export function getHourDiff(tzA, tzB, date = new Date()) {
  const diffMin = getOffsetMinutes(tzA, date) - getOffsetMinutes(tzB, date);
  return diffMin / 60;
}

export function formatHourDiff(tzA, tzB, date = new Date()) {
  const diff = getHourDiff(tzA, tzB, date);
  const abs = Math.abs(diff);
  const rounded = Number.isInteger(abs) ? abs : Math.round(abs * 2) / 2;
  const unit = rounded === 1 ? 'hora' : 'horas';
  if (rounded === 0) return 'Misma hora';
  return `${rounded} ${unit} de diferencia`;
}

export function getLocalTimeParts(timeZone, date = new Date()) {
  const dtf = new Intl.DateTimeFormat('es-ES', {
    timeZone, hour12: false, hour: '2-digit', minute: '2-digit',
  });
  const parts = dtf.formatToParts(date).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  return { hour: Number(parts.hour), minute: parts.minute };
}

export function formatClock(timeZone, date = new Date()) {
  const { hour, minute } = getLocalTimeParts(timeZone, date);
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

export function formatDateLong(timeZone, date = new Date()) {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone, weekday: 'long', day: 'numeric', month: 'long',
  }).format(date);
}

/** Franja horaria (0-23) para una zona en un instante dado. */
function getHourOf(timeZone, date = new Date()) {
  return getLocalTimeParts(timeZone, date).hour;
}

/**
 * Saludo dependiente exclusivamente de reglas horarias (sin IA).
 * 5–11 → buenos días · 12–19 → buenas tardes · resto → buenas noches
 */
export function getGreeting(timeZone, date = new Date()) {
  const h = getHourOf(timeZone, date);
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * Estimación simple del estado probable de una persona según la hora,
 * usada solo quado no ha marcado presencia manual.
 */
export function guessActivityLabel(timeZone, date = new Date()) {
  const h = getHourOf(timeZone, date);
  if (h >= 0 && h < 7) return 'Probablemente durmiendo';
  if (h >= 7 && h < 9) return 'Probablemente despertando';
  if (h >= 9 && h < 13) return 'Probablemente trabajando';
  if (h >= 13 && h < 15) return 'Probablemente comiendo';
  if (h >= 15 && h < 19) return 'Probablemente trabajando';
  if (h >= 19 && h < 23) return 'Probablemente libre';
  return 'Probablemente durmiendo';
}

/** ¿Es buen momento para hablar? Ambas personas despiertas y fuera de horario nocturno. */
export function isGoodTimeToTalk(tzA, tzB, date = new Date()) {
  const hA = getHourOf(tzA, date);
  const hB = getHourOf(tzB, date);
  const awake = (h) => h >= 8 && h < 23;
  return awake(hA) && awake(hB);
}

export function talkWindowMessage(tzA, tzB, date = new Date()) {
  if (isGoodTimeToTalk(tzA, tzB, date)) {
    return { good: true, text: 'Buen momento para hablar' };
  }
  const hA = getHourOf(tzA, date);
  const hB = getHourOf(tzB, date);
  if (hA < 8 || hA >= 23) return { good: false, text: 'Colombia probablemente descansa ahora' };
  if (hB < 8 || hB >= 23) return { good: false, text: 'España probablemente descansa ahora' };
  return { good: false, text: 'No es el mejor momento para hablar' };
}

/** Construye un objeto Date a partir de fecha/hora locales tal y como las introduce el propio dispositivo. */
export function localDateTimeToDate(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const d = new Date(`${dateStr}T${timeStr}:00`);
  return isNaN(d.getTime()) ? null : d;
}

/** Formatea un instante (Date) en la hora local de una zona horaria, con fecha corta. */
export function formatInstantForZone(date, timeZone) {
  if (!date) return '—';
  const time = new Intl.DateTimeFormat('es-ES', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  const day = new Intl.DateTimeFormat('es-ES', { timeZone, day: 'numeric', month: 'short' }).format(date);
  return `${time} · ${day}`;
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / 86400000);
}
