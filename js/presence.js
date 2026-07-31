// =========================================================
// SINCRO — presence.js
// Estado ("qué estás haciendo"), disponibilidad y el botón
// "Estoy aquí". Todo en tiempo real vía onSnapshot, sin polling.
// =========================================================

import { db, paths, onSnapshot, setDoc, serverTimestamp, Timestamp } from './firebase.js';
import { state, notifyStateChange } from './state.js';
import { toDateSafe } from './utils.js';
import { logActivity } from './activity.js';

export const STATUS_OPTIONS = [
  { value: 'available', emoji: '🟢', label: 'Disponible' },
  { value: 'working', emoji: '💻', label: 'Trabajando' },
  { value: 'studying', emoji: '📚', label: 'Estudiando' },
  { value: 'eating', emoji: '🍽️', label: 'Comiendo' },
  { value: 'out', emoji: '🏃', label: 'Fuera' },
  { value: 'gaming', emoji: '🎮', label: 'Jugando' },
  { value: 'sleeping', emoji: '😴', label: 'Durmiendo' },
  { value: 'dnd', emoji: '📵', label: 'No molestar' },
];

const HERE_TTL_MS = 15 * 60 * 1000; // "Estoy aquí" expira a los 15 minutos

export function statusMeta(value) {
  return STATUS_OPTIONS.find((s) => s.value === value) || STATUS_OPTIONS[0];
}

let unsubscribe = null;

export function subscribePresence(coupleId, onChange) {
  if (unsubscribe) unsubscribe();
  unsubscribe = onSnapshot(paths.presence(coupleId), (snap) => {
    const next = {};
    snap.forEach((docSnap) => { next[docSnap.id] = docSnap.data(); });
    state.presence = next;
    notifyStateChange('presence');
    onChange?.(next);
  }, () => {
    notifyStateChange('presence-error');
  });
  return unsubscribe;
}

export function unsubscribePresence() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}

export async function setStatus(coupleId, deviceId, { status, untilTime }) {
  const payload = {
    status,
    updatedAt: serverTimestamp(),
    displayName: state.displayName,
  };
  if (untilTime) {
    const [h, m] = untilTime.split(':').map(Number);
    const until = new Date();
    until.setHours(h, m, 0, 0);
    payload.until = Timestamp.fromDate(until);
  } else {
    payload.until = null;
  }
  await setDoc(paths.presenceDoc(coupleId, deviceId), payload, { merge: true });
  await logActivity(coupleId, {
    type: 'status',
    actorName: state.displayName,
    summary: `${state.displayName} cambió su estado a ${statusMeta(status).emoji} ${statusMeta(status).label}`,
  });
}

export async function markHere(coupleId, deviceId) {
  await setDoc(paths.presenceDoc(coupleId, deviceId), {
    here: true,
    hereAt: serverTimestamp(),
    displayName: state.displayName,
  }, { merge: true });
}

/** ¿Sigue "aquí" esta presencia, dado el TTL? */
export function isHereActive(presenceDoc) {
  if (!presenceDoc?.here) return false;
  const hereAt = toDateSafe(presenceDoc.hereAt);
  if (!hereAt) return false;
  return Date.now() - hereAt.getTime() < HERE_TTL_MS;
}

export function bothHere(presenceMap, deviceIds) {
  return deviceIds.length === 2 && deviceIds.every((id) => isHereActive(presenceMap[id]));
}
