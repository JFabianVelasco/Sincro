// =========================================================
// SINCRO — settings.js
// Perfil, tema, gestión del espacio (crear/unirse), próximo
// encuentro y cierre de sesión local. Todo lo que vive en
// la pantalla "Más", más el bootstrap del espacio compartido.
// =========================================================

import {
  paths, setDoc, updateDoc, deleteDoc, addDoc, getDoc, onSnapshot,
  serverTimestamp,
} from './firebase.js';
import {
  state, notifyStateChange, getCountryTz, saveProfileLocal, saveSpaceLocal, saveTheme,
} from './state.js';
import { saveUserProfile } from './auth.js';
import { generateSpaceCode, normalizeCode, cleanInput } from './utils.js';
import { logActivity } from './activity.js';

// ---------------------------------------------------------
// Tema
// ---------------------------------------------------------
export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    root.setAttribute('data-theme', prefersLight ? 'light' : 'dark');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

export function initThemeWatcher() {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  mq.addEventListener('change', () => {
    if (state.theme === 'system') applyTheme('system');
  });
}

export function setTheme(theme) {
  saveTheme(theme);
  applyTheme(theme);
}

// ---------------------------------------------------------
// Creación / unión al espacio
// El uid de Firebase Authentication identifica a cada miembro,
// así que cualquier dispositivo donde la persona inicie sesión
// entra directamente a su espacio sin volver a pedir el código.
// ---------------------------------------------------------
export async function createCoupleSpace() {
  const code = generateSpaceCode();
  const coupleId = normalizeCode(code);

  await setDoc(paths.couple(coupleId), {
    createdAt: serverTimestamp(),
  });
  await setDoc(paths.member(coupleId, state.deviceId), {
    displayName: state.displayName,
    gender: state.gender || 'unspecified',
    country: state.country,
    timezone: state.timezone,
    joinedAt: serverTimestamp(),
  });

  saveSpaceLocal({ coupleId });
  await saveUserProfile(state.uid, { coupleId });
  return code;
}

export async function joinCoupleSpace(rawCode) {
  const coupleId = normalizeCode(rawCode);
  if (coupleId.length !== 6) throw new Error('El código debe tener 6 caracteres.');
  const coupleSnap = await getDoc(paths.couple(coupleId));
  if (!coupleSnap.exists()) throw new Error('No encontramos ningún espacio con ese código.');

  await setDoc(paths.member(coupleId, state.deviceId), {
    displayName: state.displayName,
    gender: state.gender || 'unspecified',
    country: state.country,
    timezone: state.timezone,
    joinedAt: serverTimestamp(),
  });

  saveSpaceLocal({ coupleId });
  await saveUserProfile(state.uid, { coupleId });
  return coupleId;
}

export function buildInviteLink(code) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('join', normalizeCode(code));
  return url.toString();
}

// ---------------------------------------------------------
// Miembros
// ---------------------------------------------------------
let unsubMembers = null;

export function subscribeMembers(coupleId) {
  if (unsubMembers) unsubMembers();
  unsubMembers = onSnapshot(paths.members(coupleId), (snap) => {
    const next = {};
    snap.forEach((d) => { next[d.id] = d.data(); });
    state.members = next;
    notifyStateChange('members');
  }, () => notifyStateChange('members-error'));
  return unsubMembers;
}

export function unsubscribeMembers() {
  if (unsubMembers) { unsubMembers(); unsubMembers = null; }
}

export async function updateProfile(coupleId, { displayName, gender, country }) {
  const cleanName = cleanInput(displayName, 24);
  if (!cleanName) throw new Error('El nombre no puede estar vacío.');
  const timezone = getCountryTz(country);

  // Actualiza primero el estado local y avisa a la UI de inmediato:
  // así "Guardar" refresca el saludo, la presencia, etc. sin esperar
  // al round-trip de Firestore.
  saveProfileLocal({ displayName: cleanName, gender, country });
  notifyStateChange('profile-local');

  await setDoc(paths.member(coupleId, state.deviceId), {
    displayName: cleanName,
    gender: gender || 'unspecified',
    country,
    timezone,
  }, { merge: true });
  await saveUserProfile(state.uid, { displayName: cleanName, gender, country });
}

// ---------------------------------------------------------
// Próximo encuentro
// ---------------------------------------------------------
let unsubMeeting = null;
let unsubMeetingTodos = null;

export function subscribeMeeting(coupleId) {
  if (unsubMeeting) unsubMeeting();
  unsubMeeting = onSnapshot(paths.meeting(coupleId), (snap) => {
    state.meeting = snap.exists() ? snap.data() : null;
    notifyStateChange('meeting');
  }, () => notifyStateChange('meeting-error'));

  if (unsubMeetingTodos) unsubMeetingTodos();
  unsubMeetingTodos = onSnapshot(paths.meetingTodos(coupleId), (snap) => {
    state.meetingTodos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    notifyStateChange('meeting-todos');
  }, () => notifyStateChange('meeting-todos-error'));
}

export function unsubscribeMeeting() {
  if (unsubMeeting) { unsubMeeting(); unsubMeeting = null; }
  if (unsubMeetingTodos) { unsubMeetingTodos(); unsubMeetingTodos = null; }
}

export async function saveMeeting(coupleId, { date, city, country, description }) {
  await setDoc(paths.meeting(coupleId), {
    date,
    city: cleanInput(city, 40),
    country: cleanInput(country, 40),
    description: cleanInput(description || '', 200),
    updatedAt: serverTimestamp(),
    updatedBy: state.displayName,
  }, { merge: true });
  await logActivity(coupleId, {
    type: 'meeting',
    actorName: state.displayName,
    summary: `${state.displayName} actualizó el próximo encuentro`,
  });
}

export async function addMeetingTodo(coupleId, text) {
  const clean = cleanInput(text, 100);
  if (!clean) return;
  await addDoc(paths.meetingTodos(coupleId), {
    text: clean,
    done: false,
    createdAt: serverTimestamp(),
  });
}

export async function toggleMeetingTodo(coupleId, todoId) {
  const todo = state.meetingTodos.find((t) => t.id === todoId);
  if (!todo) return;
  await updateDoc(paths.meetingTodoDoc(coupleId, todoId), { done: !todo.done });
}

export async function deleteMeetingTodo(coupleId, todoId) {
  await deleteDoc(paths.meetingTodoDoc(coupleId, todoId));
}
