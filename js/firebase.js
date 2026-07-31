// =========================================================
// SINCRO — firebase.js
// Inicialización de Firebase (solo Cloud Firestore) mediante
// el SDK modular vía CDN. Ningún otro módulo debe importar
// directamente desde el CDN: todos pasan por aquí.
// =========================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  enableIndexedDbPersistence,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile as updateAuthProfile,
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyC4PYwAIHda3PpHk8P2L8dg5VzIha6LKFg',
  authDomain: 'ainhoa-b83b3.firebaseapp.com',
  projectId: 'ainhoa-b83b3',
  storageBucket: 'ainhoa-b83b3.firebasestorage.app',
  messagingSenderId: '347177245032',
  appId: '1:347177245032:web:f8d749e9e8a7401e7f9edd',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// La persistencia offline es opcional y no debe romper la app si falla
// (por ejemplo, en pestañas múltiples o navegadores sin soporte).
try {
  enableIndexedDbPersistence(db).catch(() => {});
} catch (_) { /* no crítico */ }

export {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDoc, getDocs, onSnapshot, query, where, orderBy, limit,
  serverTimestamp, Timestamp,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail,
  updateAuthProfile, onAuthStateChanged, signOut,
};

// ---------------------------------------------------------
// Rutas de la colección para un espacio (couple) concreto.
// Mantener aquí todas las referencias evita rutas mágicas
// repartidas por el resto del código.
// ---------------------------------------------------------
export const paths = {
  user: (uid) => doc(db, 'users', uid),
  couple: (coupleId) => doc(db, 'couples', coupleId),
  members: (coupleId) => collection(db, 'couples', coupleId, 'members'),
  member: (coupleId, deviceId) => doc(db, 'couples', coupleId, 'members', deviceId),
  presence: (coupleId) => collection(db, 'couples', coupleId, 'presence'),
  presenceDoc: (coupleId, deviceId) => doc(db, 'couples', coupleId, 'presence', deviceId),
  notes: (coupleId) => collection(db, 'couples', coupleId, 'notes'),
  noteDoc: (coupleId, noteId) => doc(db, 'couples', coupleId, 'notes', noteId),
  plans: (coupleId) => collection(db, 'couples', coupleId, 'plans'),
  planDoc: (coupleId, planId) => doc(db, 'couples', coupleId, 'plans', planId),
  lists: (coupleId) => collection(db, 'couples', coupleId, 'lists'),
  listDoc: (coupleId, listId) => doc(db, 'couples', coupleId, 'lists', listId),
  listItems: (coupleId, listId) => collection(db, 'couples', coupleId, 'lists', listId, 'items'),
  listItemDoc: (coupleId, listId, itemId) => doc(db, 'couples', coupleId, 'lists', listId, 'items', itemId),
  checkins: (coupleId) => collection(db, 'couples', coupleId, 'checkins'),
  activity: (coupleId) => collection(db, 'couples', coupleId, 'activity'),
  meeting: (coupleId) => doc(db, 'couples', coupleId, 'meeting', 'next'),
  meetingTodos: (coupleId) => collection(db, 'couples', coupleId, 'meeting', 'next', 'todos'),
  meetingTodoDoc: (coupleId, todoId) => doc(db, 'couples', coupleId, 'meeting', 'next', 'todos', todoId),
};
