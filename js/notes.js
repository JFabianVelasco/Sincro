// =========================================================
// SINCRO — notes.js
// Sección "Para ti": notas, recordatorios cortos, enlaces...
// que una persona deja para que la otra encuentre.
// =========================================================

import {
  paths, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, limit, serverTimestamp,
} from './firebase.js';
import { state, notifyStateChange } from './state.js';
import { cleanInput } from './utils.js';
import { logActivity } from './activity.js';

export const NOTE_TYPES = {
  note: { label: 'Nota', emoji: '📝' },
  reminder: { label: 'Recordatorio', emoji: '⏰' },
  story: { label: 'Algo que quiero contar', emoji: '💬' },
  message: { label: 'Mensaje corto', emoji: '✉️' },
  link: { label: 'Enlace', emoji: '🔗' },
};

const NOTES_LIMIT = 60;
let unsubscribe = null;

export function subscribeNotes(coupleId) {
  if (unsubscribe) unsubscribe();
  const q = query(paths.notes(coupleId), orderBy('createdAt', 'desc'), limit(NOTES_LIMIT));
  unsubscribe = onSnapshot(q, (snap) => {
    state.notes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    notifyStateChange('notes');
  }, () => notifyStateChange('notes-error'));
  return unsubscribe;
}

export function unsubscribeNotes() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}

export async function createNote(coupleId, { type, content, link }) {
  const clean = cleanInput(content, 500);
  if (!clean) throw new Error('El contenido no puede estar vacío.');
  const payload = {
    type,
    content: clean,
    author: state.deviceId,
    authorName: state.displayName,
    read: false,
    createdAt: serverTimestamp(),
  };
  if (type === 'link' && link) payload.link = cleanInput(link, 300);
  await addDoc(paths.notes(coupleId), payload);
  await logActivity(coupleId, {
    type: 'note',
    actorName: state.displayName,
    summary: `${state.displayName} dejó algo para ti`,
  });
}

export async function markNoteRead(coupleId, noteId) {
  const note = state.notes.find((n) => n.id === noteId);
  if (!note || note.read || note.author === state.deviceId) return;
  await updateDoc(paths.noteDoc(coupleId, noteId), {
    read: true,
    readAt: serverTimestamp(),
  });
  await logActivity(coupleId, {
    type: 'note-read',
    actorName: state.displayName,
    summary: `${state.displayName} vio tu nota`,
  });
}

export async function deleteNote(coupleId, noteId) {
  const note = state.notes.find((n) => n.id === noteId);
  if (!note || note.author !== state.deviceId) throw new Error('Solo puedes borrar tus propias notas.');
  await deleteDoc(paths.noteDoc(coupleId, noteId));
}

export function unreadCountForMe() {
  return state.notes.filter((n) => n.author !== state.deviceId && !n.read).length;
}
