// =========================================================
// SINCRO — plans.js
// Planes compartidos. La hora se guarda como un instante
// absoluto (Timestamp), calculado en el dispositivo de quien
// crea el plan a partir de su fecha/hora local — por eso la
// conversión a la zona horaria de la otra persona es siempre
// correcta, incluida la diferencia por horario de verano.
// =========================================================

import {
  paths, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, serverTimestamp, Timestamp,
} from './firebase.js';
import { state, notifyStateChange } from './state.js';
import { cleanInput, toDateSafe } from './utils.js';
import { localDateTimeToDate } from './time.js';
import { logActivity } from './activity.js';

export const PLAN_TYPES = {
  call: { label: 'Llamada', emoji: '📞' },
  movie: { label: 'Película', emoji: '🎬' },
  show: { label: 'Serie', emoji: '📺' },
  game: { label: 'Juego', emoji: '🎮' },
  food: { label: 'Comida', emoji: '🍽️' },
  work: { label: 'Trabajo/estudio', emoji: '🧑\u200d💻' },
  trip: { label: 'Viaje', emoji: '✈️' },
  other: { label: 'Otro', emoji: '✨' },
};

let unsubscribe = null;

export function subscribePlans(coupleId) {
  if (unsubscribe) unsubscribe();
  const q = query(paths.plans(coupleId), orderBy('when', 'asc'));
  unsubscribe = onSnapshot(q, (snap) => {
    state.plans = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    notifyStateChange('plans');
  }, () => notifyStateChange('plans-error'));
  return unsubscribe;
}

export function unsubscribePlans() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}

export async function createPlan(coupleId, { title, type, description, dateStr, timeStr, reminderMinutes }) {
  const cleanTitle = cleanInput(title, 60);
  if (!cleanTitle) throw new Error('El plan necesita un título.');
  const whenDate = localDateTimeToDate(dateStr, timeStr);
  if (!whenDate) throw new Error('Elige una fecha y hora válidas.');

  await addDoc(paths.plans(coupleId), {
    title: cleanTitle,
    type,
    description: cleanInput(description || '', 240),
    when: Timestamp.fromDate(whenDate),
    creatorDeviceId: state.deviceId,
    creatorName: state.displayName,
    creatorTimezone: state.timezone,
    reminderMinutes: reminderMinutes ? Number(reminderMinutes) : null,
    completed: false,
    createdAt: serverTimestamp(),
  });

  await logActivity(coupleId, {
    type: 'plan',
    actorName: state.displayName,
    summary: `${state.displayName} creó un plan: ${cleanTitle}`,
  });
}

export async function togglePlanCompleted(coupleId, planId) {
  const plan = state.plans.find((p) => p.id === planId);
  if (!plan) return;
  await updateDoc(paths.planDoc(coupleId, planId), { completed: !plan.completed });
}

export async function deletePlan(coupleId, planId) {
  await deleteDoc(paths.planDoc(coupleId, planId));
}

export function getUpcomingPlans() {
  const now = Date.now();
  return state.plans
    .filter((p) => !p.completed)
    .map((p) => ({ ...p, whenDate: toDateSafe(p.when) }))
    .filter((p) => p.whenDate && p.whenDate.getTime() >= now - 60 * 60 * 1000)
    .sort((a, b) => a.whenDate - b.whenDate);
}

export function getNextPlan() {
  return getUpcomingPlans()[0] || null;
}
