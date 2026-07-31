// =========================================================
// SINCRO — state.js
// Estado en memoria de la aplicación + persistencia de la
// sesión local (localStorage). Nada de datos de pareja se
// guarda aquí de forma duradera: eso vive en Firestore.
// =========================================================

import { generateId } from './utils.js';

const LS_KEYS = {
  deviceId: 'sincro.deviceId',
  coupleId: 'sincro.coupleId',
  coupleSecret: 'sincro.coupleSecret',
  displayName: 'sincro.displayName',
  country: 'sincro.country',
  timezone: 'sincro.timezone',
  theme: 'sincro.theme',
  notifsEnabled: 'sincro.notifsEnabled',
};

export const COUNTRY_TZ = {
  CO: 'America/Bogota',
  ES: 'Europe/Madrid',
};

export const COUNTRY_FLAG = {
  CO: '🇨🇴',
  ES: '🇪🇸',
};

export const COUNTRY_LABEL = {
  CO: 'Colombia',
  ES: 'España',
};

/** Estado global compartido en memoria durante la sesión de la pestaña. */
export const state = {
  deviceId: null,
  coupleId: null,
  coupleSecret: null,
  displayName: null,
  country: null,
  timezone: null,
  theme: 'system',

  partnerDeviceId: null, // se detecta al observar members/
  members: {},           // deviceId -> {displayName, country, timezone}
  presence: {},           // deviceId -> presence doc
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

/** Suscribirse a cualquier cambio de estado relevante para re-renderizar. */
export function onStateChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyStateChange(reason) {
  for (const fn of listeners) fn(reason);
}

// ---------------------------------------------------------
// Sesión local
// ---------------------------------------------------------
export function loadLocalSession() {
  state.deviceId = localStorage.getItem(LS_KEYS.deviceId);
  state.coupleId = localStorage.getItem(LS_KEYS.coupleId);
  state.coupleSecret = localStorage.getItem(LS_KEYS.coupleSecret);
  state.displayName = localStorage.getItem(LS_KEYS.displayName);
  state.country = localStorage.getItem(LS_KEYS.country);
  state.timezone = localStorage.getItem(LS_KEYS.timezone);
  state.theme = localStorage.getItem(LS_KEYS.theme) || 'system';
  return hasCompleteSession();
}

export function hasCompleteSession() {
  return !!(state.deviceId && state.coupleId && state.displayName && state.country);
}

export function ensureDeviceId() {
  let id = localStorage.getItem(LS_KEYS.deviceId);
  if (!id) {
    id = generateId();
    localStorage.setItem(LS_KEYS.deviceId, id);
  }
  state.deviceId = id;
  return id;
}

export function saveProfileLocal({ displayName, country }) {
  state.displayName = displayName;
  state.country = country;
  state.timezone = COUNTRY_TZ[country];
  localStorage.setItem(LS_KEYS.displayName, displayName);
  localStorage.setItem(LS_KEYS.country, country);
  localStorage.setItem(LS_KEYS.timezone, state.timezone);
}

export function saveSpaceLocal({ coupleId, coupleSecret }) {
  state.coupleId = coupleId;
  state.coupleSecret = coupleSecret || '';
  localStorage.setItem(LS_KEYS.coupleId, coupleId);
  if (coupleSecret) localStorage.setItem(LS_KEYS.coupleSecret, coupleSecret);
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

/** Cierra sesión local: borra todo lo guardado en este dispositivo. */
export function clearLocalSession() {
  Object.values(LS_KEYS).forEach((k) => {
    if (k === LS_KEYS.theme) return; // conservar preferencia de tema
    localStorage.removeItem(k);
  });
  Object.assign(state, {
    deviceId: null, coupleId: null, coupleSecret: null,
    displayName: null, country: null, timezone: null,
    partnerDeviceId: null, members: {}, presence: {},
    notes: [], plans: [], lists: [], listItemsByList: {},
    checkins: [], activity: [], meeting: null, meetingTodos: [],
  });
}

/** Devuelve el deviceId de la otra persona, si ya se conoce. */
export function getPartnerDeviceId() {
  if (!state.deviceId) return null;
  const ids = Object.keys(state.members);
  return ids.find((id) => id !== state.deviceId) || null;
}

export function getMemberName(deviceId) {
  if (deviceId === state.deviceId) return state.displayName;
  return state.members[deviceId]?.displayName || 'Tu pareja';
}
