// =========================================================
// SINCRO — lists.js
// Listas compartidas (ver, probar, lugares, jugar, ideas,
// cuando estemos juntos) con elementos que ambos pueden marcar.
// =========================================================

import {
  paths, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, serverTimestamp,
} from './firebase.js';
import { state, notifyStateChange } from './state.js';
import { cleanInput } from './utils.js';
import { logActivity } from './activity.js';

export const LIST_CATEGORIES = {
  watch: { label: 'Ver', emoji: '🎬' },
  try: { label: 'Probar', emoji: '🍜' },
  places: { label: 'Lugares', emoji: '🌎' },
  play: { label: 'Jugar', emoji: '🎮' },
  ideas: { label: 'Ideas', emoji: '💡' },
  together: { label: 'Cuando estemos juntos', emoji: '✈️' },
};

let unsubLists = null;
const itemUnsubs = new Map();

export function subscribeLists(coupleId) {
  if (unsubLists) unsubLists();
  const q = query(paths.lists(coupleId), orderBy('createdAt', 'desc'));
  unsubLists = onSnapshot(q, (snap) => {
    state.lists = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    notifyStateChange('lists');
  }, () => notifyStateChange('lists-error'));
  return unsubLists;
}

export function unsubscribeLists() {
  if (unsubLists) { unsubLists(); unsubLists = null; }
  itemUnsubs.forEach((fn) => fn());
  itemUnsubs.clear();
}

export function subscribeListItems(coupleId, listId) {
  if (itemUnsubs.has(listId)) return itemUnsubs.get(listId);
  const q = query(paths.listItems(coupleId, listId), orderBy('createdAt', 'asc'));
  const unsub = onSnapshot(q, (snap) => {
    state.listItemsByList[listId] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    notifyStateChange('list-items');
  }, () => notifyStateChange('list-items-error'));
  itemUnsubs.set(listId, unsub);
  return unsub;
}

export function unsubscribeListItems(listId) {
  const unsub = itemUnsubs.get(listId);
  if (unsub) { unsub(); itemUnsubs.delete(listId); }
}

export async function createList(coupleId, { name, category }) {
  const cleanName = cleanInput(name, 40);
  if (!cleanName) throw new Error('La lista necesita un nombre.');
  const ref = await addDoc(paths.lists(coupleId), {
    name: cleanName,
    category,
    createdBy: state.deviceId,
    createdByName: state.displayName,
    createdAt: serverTimestamp(),
  });
  await logActivity(coupleId, {
    type: 'list',
    actorName: state.displayName,
    summary: `${state.displayName} creó la lista "${cleanName}"`,
  });
  return ref.id;
}

export async function addListItem(coupleId, listId, text) {
  const clean = cleanInput(text, 120);
  if (!clean) throw new Error('Escribe algo para añadir.');
  await addDoc(paths.listItems(coupleId, listId), {
    text: clean,
    completedBy: {},
    createdAt: serverTimestamp(),
    createdBy: state.deviceId,
  });
}

export async function toggleListItem(coupleId, listId, itemId) {
  const items = state.listItemsByList[listId] || [];
  const item = items.find((i) => i.id === itemId);
  if (!item) return;
  const completedBy = { ...(item.completedBy || {}) };
  const wasDone = !!completedBy[state.deviceId];
  if (wasDone) {
    delete completedBy[state.deviceId];
  } else {
    completedBy[state.deviceId] = true;
  }
  await updateDoc(paths.listItemDoc(coupleId, listId, itemId), { completedBy });

  const partnerIds = Object.keys(state.members).filter((id) => id !== state.deviceId);
  const bothNow = !wasDone && partnerIds.length > 0 && partnerIds.every((id) => completedBy[id]);
  if (bothNow) {
    await logActivity(coupleId, {
      type: 'list-item-together',
      actorName: state.displayName,
      summary: `"${item.text}" — hecho juntos`,
    });
  }
}

export async function deleteListItem(coupleId, listId, itemId) {
  await deleteDoc(paths.listItemDoc(coupleId, listId, itemId));
}

export async function deleteList(coupleId, listId) {
  await deleteDoc(paths.listDoc(coupleId, listId));
}

export function isItemDoneByBoth(item) {
  const ids = Object.keys(state.members);
  if (ids.length < 2) return false;
  return ids.every((id) => item.completedBy?.[id]);
}

export function isItemDoneByMe(item) {
  return !!item.completedBy?.[state.deviceId];
}
