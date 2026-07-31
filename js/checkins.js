// =========================================================
// SINCRO — checkins.js
// "¿Cómo estás?" — check-ins breves de ánimo, sin obligar
// a hacerlos a diario. Se muestra el último de cada persona.
// =========================================================

import { paths, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from './firebase.js';
import { state, notifyStateChange } from './state.js';
import { cleanInput } from './utils.js';
import { logActivity } from './activity.js';

export const MOOD_OPTIONS = [
  { value: 'good', emoji: '😊', label: 'Bien' },
  { value: 'ok', emoji: '😐', label: 'Normal' },
  { value: 'tired', emoji: '😴', label: 'Cansado/a' },
  { value: 'hard', emoji: '😵', label: 'Día difícil' },
  { value: 'great', emoji: '🔥', label: 'Día increíble' },
];

const CHECKINS_LIMIT = 30;
let unsubscribe = null;

export function moodMeta(value) {
  return MOOD_OPTIONS.find((m) => m.value === value) || MOOD_OPTIONS[1];
}

export function subscribeCheckins(coupleId) {
  if (unsubscribe) unsubscribe();
  const q = query(paths.checkins(coupleId), orderBy('createdAt', 'desc'), limit(CHECKINS_LIMIT));
  unsubscribe = onSnapshot(q, (snap) => {
    state.checkins = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    notifyStateChange('checkins');
  }, () => notifyStateChange('checkins-error'));
  return unsubscribe;
}

export function unsubscribeCheckins() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}

export async function createCheckin(coupleId, { mood, note }) {
  await addDoc(paths.checkins(coupleId), {
    deviceId: state.deviceId,
    name: state.displayName,
    mood,
    note: cleanInput(note || '', 200),
    createdAt: serverTimestamp(),
  });
  await logActivity(coupleId, {
    type: 'checkin',
    actorName: state.displayName,
    summary: `${state.displayName} compartió cómo está`,
  });
}

export function getLastCheckinFor(deviceId) {
  return state.checkins.find((c) => c.deviceId === deviceId) || null;
}
