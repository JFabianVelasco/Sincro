// =========================================================
// SINCRO — activity.js
// Línea de actividad reciente. Solo eventos relevantes,
// cantidad limitada, sin convertirse en un feed social.
// =========================================================

import { db, paths, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from './firebase.js';
import { state, notifyStateChange } from './state.js';

const ACTIVITY_LIMIT = 20;

export async function logActivity(coupleId, { type, actorName, summary }) {
  try {
    await addDoc(paths.activity(coupleId), {
      type,
      actorName,
      summary,
      createdAt: serverTimestamp(),
    });
  } catch (_) {
    // La actividad es informativa: si falla, no debe romper la acción principal.
  }
}

let unsubscribe = null;

export function subscribeActivity(coupleId) {
  if (unsubscribe) unsubscribe();
  const q = query(paths.activity(coupleId), orderBy('createdAt', 'desc'), limit(ACTIVITY_LIMIT));
  unsubscribe = onSnapshot(q, (snap) => {
    state.activity = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    notifyStateChange('activity');
  }, () => {
    notifyStateChange('activity-error');
  });
  return unsubscribe;
}

export function unsubscribeActivity() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}
