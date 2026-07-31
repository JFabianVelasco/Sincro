// =========================================================
// SINCRO — auth.js
// Identidad real con Firebase Authentication (Google y
// correo/contraseña). El uid de Firebase Auth pasa a ser el
// identificador de la persona en toda la app (antes era un
// deviceId aleatorio guardado solo en el dispositivo).
// =========================================================

import {
  auth, db, paths, getDoc, setDoc, serverTimestamp,
  GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, updateAuthProfile, onAuthStateChanged, signOut,
} from './firebase.js';

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signUpWithEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    try { await updateAuthProfile(cred.user, { displayName }); } catch (_) { /* no crítico */ }
  }
  return cred.user;
}

export async function signInWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function signOutUser() {
  await signOut(auth);
}

/** Lee el documento de perfil de la persona (users/{uid}), si existe. */
export async function fetchUserProfile(uid) {
  const snap = await getDoc(paths.user(uid));
  return snap.exists() ? snap.data() : null;
}

/** Crea o actualiza el documento de perfil de la persona. */
export async function saveUserProfile(uid, data) {
  await setDoc(paths.user(uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export function friendlyAuthError(err) {
  const code = err?.code || '';
  const map = {
    'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Prueba a iniciar sesión.',
    'auth/invalid-email': 'El correo no parece válido.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/wrong-password': 'La contraseña no es correcta.',
    'auth/user-not-found': 'No encontramos ninguna cuenta con ese correo.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar.',
    'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase Authentication todavía.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento y vuelve a intentarlo.',
  };
  return map[code] || 'No se pudo completar el inicio de sesión. Inténtalo de nuevo.';
}
