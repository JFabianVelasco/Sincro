// =========================================================
// SINCRO — notifications.js
// Dos cosas distintas conviven aquí:
// 1) Toasts internos (siempre funcionan, son solo UI).
// 2) Notificaciones del navegador (Notification API), que
//    solo pueden dispararse mientras la pestaña está abierta.
//    Sincro es un frontend estático sin backend propio, así
//    que NO hay push real cuando la app está cerrada: eso
//    requeriría un servidor + Firebase Cloud Messaging con
//    Service Worker y claves VAPID. Lo explicamos en el README
//    y en la propia interfaz, sin simular nada que no podemos
//    cumplir.
// =========================================================

const TOAST_REGION_ID = 'toast-region';
const TOAST_MS = 3200;

export function showToast(message, kind = 'default') {
  const region = document.getElementById(TOAST_REGION_ID);
  if (!region) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.dataset.kind = kind;
  el.textContent = message;
  region.appendChild(el);

  setTimeout(() => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 220);
  }, TOAST_MS);
}

export function notifSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notifPermission() {
  return notifSupported() ? Notification.permission : 'unsupported';
}

export async function requestNotifPermission() {
  if (!notifSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch (_) {
    return 'denied';
  }
}

/**
 * Muestra una notificación del navegador si el permiso está concedido
 * y la pestaña no está en primer plano (para no ser redundantes con el toast).
 * Solo funciona mientras Sincro sigue abierta en algún lugar del navegador.
 */
export function notifyBrowser(title, body) {
  if (!notifSupported() || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;
  try {
    new Notification(title, { body, icon: undefined });
  } catch (_) { /* algunos navegadores móviles no soportan new Notification() directo */ }
}

export function notifStatusText() {
  switch (notifPermission()) {
    case 'granted': return 'Las notificaciones están activadas en este dispositivo mientras Sincro esté abierta.';
    case 'denied': return 'Bloqueaste las notificaciones. Actívalas desde los ajustes del navegador.';
    case 'unsupported': return 'Este navegador no admite notificaciones.';
    default: return 'Actívalas para recibir avisos mientras tengas Sincro abierta.';
  }
}
