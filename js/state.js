// =========================================================
// SINCRO — state.js
// Estado en memoria de la aplicación + caché local ligera de
// la sesión. La identidad real vive en Firebase Authentication:
// deviceId ahora ES el uid de la persona autenticada.
// =========================================================

import { getCountryTz, getCountryLabel, countryFlagEmoji } from './countries.js';

const LS_KEYS = {
  coupleId: 'sincro.coupleId',
  displayName: 'sincro.displayName',
  gender: 'sincro.gender',
  country: 'sincro.country',
  timezone: 'sincro.timezone',
  theme: 'sincro.theme',
  notifsEnabled: 'sincro.notifsEnabled',
};

export { getCountryTz, getCountryLabel, countryFlagEmoji };

export const GENDER_LABEL = {
  male: 'Hombre',
  female: 'Mujer',
  unspecified: 'Prefiero no decirlo',
};

/** Estado global compartido en memoria durante la sesión de la pestaña. */
export const state = {
  uid: null,             // uid de Firebase Authentication = identificador de la persona
  deviceId: null,         // alias de uid, se mantiene por compatibilidad con el resto de módulos
  authEmail: null,
  coupleId: null,
  displayName: null,
  gender: null,
  country: null,
  timezone: null,
  theme: 'system',

  members: {},           // uid -> {displayName, gender, country, timezone}
  presence: {},           // uid -> presence doc
  notes: [],
  plans: [],
  lists: [],
  listItemsByList: {},
  checkins: [],
  activity: [],
  meeting: null,
  meetingTodos: [],

  route: 'home',
  connection: 'connecting',
};

const listeners = new Set();

export function onStateChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyStateChange(reason) {
  for (const fn of listeners) fn(reason);
}

// ---------------------------------------------------------
// Identidad (Firebase Auth)
// ---------------------------------------------------------
export function setAuthIdentity(user) {
  state.uid = user.uid;
  state.deviceId = user.uid;
  state.authEmail = user.email || null;
}

export function clearAuthIdentity() {
  state.uid = null;
  state.deviceId = null;
  state.authEmail = null;
}

// ---------------------------------------------------------
// Caché local (solo para acelerar el primer render; la fuente
// de verdad del perfil vive en Firestore, en users/{uid}).
// ---------------------------------------------------------
export function loadLocalCache() {
  state.coupleId = localStorage.getItem(LS_KEYS.coupleId);
  state.displayName = localStorage.getItem(LS_KEYS.displayName);
  state.gender = localStorage.getItem(LS_KEYS.gender);
  state.country = localStorage.getItem(LS_KEYS.country);
  state.timezone = localStorage.getItem(LS_KEYS.timezone);
  state.theme = localStorage.getItem(LS_KEYS.theme) || 'system';
}

export function saveProfileLocal({ displayName, gender, country }) {
  state.displayName = displayName;
  state.gender = gender;
  state.country = country;
  state.timezone = getCountryTz(country);
  localStorage.setItem(LS_KEYS.displayName, displayName);
  localStorage.setItem(LS_KEYS.gender, gender || '');
  localStorage.setItem(LS_KEYS.country, country);
  localStorage.setItem(LS_KEYS.timezone, state.timezone);
}

export function saveSpaceLocal({ coupleId }) {
  state.coupleId = coupleId;
  localStorage.setItem(LS_KEYS.coupleId, coupleId);
}

export function saveTheme(theme) {
  state.theme = theme;
  localStorage.setItem(LS_KEYS.theme, theme);
}

export function getNotifsPref() {
  return localStorage.getItem(LS_KEYS.notifsEnabled) === 'true';
}
export function setNotifsPref(val) {
  localStorage.setItem(LS_KEYS.notifsEnabled, val ? 'true' : 'false');
}

export function hasCompleteProfile() {
  return !!(state.displayName && state.country);
}

/** Cierra sesión local: borra la caché guardada en este dispositivo (la cuenta sigue existiendo). */
export function clearLocalSession() {
  Object.values(LS_KEYS).forEach((k) => {
    if (k === LS_KEYS.theme) return; // conservar preferencia de tema
    localStorage.removeItem(k);
  });
  clearAuthIdentity();
  Object.assign(state, {
    coupleId: null, displayName: null, gender: null, country: null, timezone: null,
    members: {}, presence: {},
    notes: [], plans: [], lists: [], listItemsByList: {},
    checkins: [], activity: [], meeting: null, meetingTodos: [],
  });
}

/** Devuelve el uid de la otra persona, si ya se conoce. */
export function getPartnerDeviceId() {
  if (!state.deviceId) return null;
  const ids = Object.keys(state.members);
  return ids.find((id) => id !== state.deviceId) || null;
}

export function getMemberName(uid) {
  if (uid === state.deviceId) return state.displayName;
  return state.members[uid]?.displayName || 'Tu pareja';
}
