// =========================================================
// SINCRO — app.js
// Punto de entrada: onboarding, enrutado, renderizado de
// pantallas y conexión de todos los módulos entre sí.
// =========================================================

import { qs, qsa, escapeHtml, relativeTime, toDateSafe, copyToClipboard, formatCodeForDisplay } from './utils.js';
import {
  state, onStateChange, notifyStateChange, loadLocalSession, ensureDeviceId,
  saveProfileLocal, clearLocalSession, COUNTRY_TZ, COUNTRY_FLAG, COUNTRY_LABEL,
  getPartnerDeviceId, getMemberName,
} from './state.js';
import {
  getGreeting, formatClock, formatHourDiff, talkWindowMessage, guessActivityLabel,
  formatInstantForZone, daysUntil,
} from './time.js';
import {
  applyTheme, initThemeWatcher, setTheme, createCoupleSpace, joinCoupleSpace,
  subscribeMembers, unsubscribeMembers, updateProfile,
  subscribeMeeting, unsubscribeMeeting, saveMeeting, addMeetingTodo, toggleMeetingTodo, deleteMeetingTodo,
} from './settings.js';
import {
  subscribePresence, unsubscribePresence, setStatus, markHere,
  isHereActive, bothHere, statusMeta, STATUS_OPTIONS,
} from './presence.js';
import { subscribeNotes, unsubscribeNotes, createNote, markNoteRead, deleteNote, unreadCountForMe, NOTE_TYPES } from './notes.js';
import { subscribePlans, unsubscribePlans, createPlan, togglePlanCompleted, deletePlan, getNextPlan, PLAN_TYPES } from './plans.js';
import {
  subscribeLists, unsubscribeLists, subscribeListItems, unsubscribeListItems,
  createList, addListItem, toggleListItem, deleteListItem, deleteList,
  isItemDoneByBoth, isItemDoneByMe, LIST_CATEGORIES,
} from './lists.js';
import { subscribeCheckins, unsubscribeCheckins, createCheckin, getLastCheckinFor, moodMeta, MOOD_OPTIONS } from './checkins.js';
import { subscribeActivity, unsubscribeActivity } from './activity.js';
import {
  showToast, notifSupported, notifPermission, requestNotifPermission, notifStatusText, notifyBrowser,
} from './notifications.js';
import { db, paths, onSnapshot } from './firebase.js';

// ---------------------------------------------------------
// Arranque
// ---------------------------------------------------------
ensureDeviceId();
const hasSession = loadLocalSession();
applyTheme(state.theme);
initThemeWatcher();

if (hasSession) {
  showApp();
} else {
  showOnboarding();
}

// ---------------------------------------------------------
// ONBOARDING
// ---------------------------------------------------------
let onboardingCountry = null;

function showOnboarding() {
  qs('#view-onboarding').hidden = false;
  qs('#view-app').hidden = true;
  wireOnboarding();
}

function wireOnboarding() {
  const nameInput = qs('#input-name');
  const continueBtn = qs('#btn-continue-name');

  const validate = () => {
    continueBtn.disabled = !(nameInput.value.trim().length >= 1 && onboardingCountry);
  };

  qsa('.country-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      onboardingCountry = btn.dataset.country;
      qsa('.country-option').forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
      validate();
    });
  });
  nameInput.addEventListener('input', validate);

  continueBtn.addEventListener('click', () => {
    saveProfileLocal({ displayName: nameInput.value.trim(), country: onboardingCountry });
    qs('#onboarding-step-name').hidden = true;
    qs('#onboarding-step-space').hidden = false;
  });

  qs('#btn-back-name').addEventListener('click', () => {
    qs('#onboarding-step-space').hidden = true;
    qs('#onboarding-step-name').hidden = false;
  });

  qsa('.tab-switch__opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      qsa('.tab-switch__opt').forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-selected', String(b === btn));
      });
      const mode = btn.dataset.mode;
      qs('#mode-create').hidden = mode !== 'create';
      qs('#mode-join').hidden = mode !== 'join';
    });
  });

  qs('#btn-create-space').addEventListener('click', async () => {
    const btn = qs('#btn-create-space');
    btn.disabled = true;
    try {
      const code = await createCoupleSpace();
      qs('#code-display').textContent = formatCodeForDisplay(code);
      qs('#create-result').hidden = false;
      btn.hidden = true;
    } catch (err) {
      showToast('No se pudo crear el espacio. Inténtalo de nuevo.', 'error');
      btn.disabled = false;
    }
  });

  qs('#btn-copy-code').addEventListener('click', async () => {
    const ok = await copyToClipboard(qs('#code-display').textContent.trim());
    showToast(ok ? '✓ Código copiado' : 'No se pudo copiar', ok ? 'default' : 'error');
  });

  qs('#btn-enter-space').addEventListener('click', () => {
    showApp();
  });

  qs('#btn-join-space').addEventListener('click', async () => {
    const btn = qs('#btn-join-space');
    const code = qs('#input-code').value;
    btn.disabled = true;
    try {
      await joinCoupleSpace(code);
      showApp();
    } catch (err) {
      showToast(err.message || 'No se pudo unir al espacio.', 'error');
      btn.disabled = false;
    }
  });
}

// ---------------------------------------------------------
// APP
// ---------------------------------------------------------
function showApp() {
  qs('#view-onboarding').hidden = true;
  qs('#view-app').hidden = false;
  initApp();
}

let clockInterval = null;

function initApp() {
  const coupleId = state.coupleId;

  subscribeMembers(coupleId);
  subscribePresence(coupleId);
  subscribeNotes(coupleId);
  subscribePlans(coupleId);
  subscribeLists(coupleId);
  subscribeCheckins(coupleId);
  subscribeActivity(coupleId);
  subscribeMeeting(coupleId);
  watchConnection(coupleId);

  wireNav();
  wireQuickActions();
  wireHomeCard();
  wireMore();
  wireModalGlobal();
  wirePlansRoute();
  wireListsRoute();

  renderClocksAndGreeting();
  clockInterval = setInterval(renderClocksAndGreeting, 20000);

  onStateChange((reason) => renderAll(reason));
  renderAll('init');
}

function renderAll(reason) {
  if (['members', 'presence', 'init'].includes(reason)) renderPresence();
  if (['notes', 'init'].includes(reason)) renderNotesPreview();
  if (['plans', 'init', 'members'].includes(reason)) { renderNextPlan(); if (state.route === 'plans') renderPlansList(); }
  if (['lists', 'init'].includes(reason) && state.route === 'lists') renderListsGrid();
  if (['list-items'].includes(reason) && state.route === 'list-detail') renderListDetailItems();
  if (['activity', 'init'].includes(reason)) renderActivity();
  if (['meeting', 'meeting-todos', 'init'].includes(reason)) renderMeeting();
  if (reason === 'members' || reason === 'init') renderMoreProfile();
}

// ---------------------------------------------------------
// Conexión
// ---------------------------------------------------------
function watchConnection(coupleId) {
  const badge = qs('#connection-badge');
  const label = qs('#connection-label');
  let wasOffline = false;

  const setState = (s) => {
    state.connection = s;
    badge.dataset.state = s;
    label.textContent = s === 'online' ? 'Conectado' : s === 'offline' ? 'Sin conexión' : 'Conectando…';
    if (s === 'online' && wasOffline) {
      showToast('✓ Sincronizado');
      wasOffline = false;
    }
    if (s === 'offline') wasOffline = true;
  };

  setState('connecting');
  onSnapshot(paths.couple(coupleId), { includeMetadataChanges: true }, (snap) => {
    if (!navigator.onLine) { setState('offline'); return; }
    setState(snap.metadata.fromCache && snap.metadata.hasPendingWrites ? 'connecting' : 'online');
  }, () => setState('offline'));

  window.addEventListener('online', () => setState('online'));
  window.addEventListener('offline', () => setState('offline'));
}

// ---------------------------------------------------------
// Navegación
// ---------------------------------------------------------
function wireNav() {
  qsa('[data-route]').forEach((btn) => {
    btn.addEventListener('click', () => switchRoute(btn.dataset.route));
  });
  qs('#btn-back-lists').addEventListener('click', () => switchRoute('lists'));
}

function switchRoute(route) {
  state.route = route;
  qsa('.route').forEach((el) => { el.hidden = el.dataset.routePanel !== route; });
  qsa('[data-route]').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.route === route));
  qs('#main-content').scrollTop = 0;

  if (route === 'plans') renderPlansList();
  if (route === 'lists') renderListsGrid();
  if (route === 'more') renderMoreProfile();
}

// ---------------------------------------------------------
// HOME — reloj y saludo
// ---------------------------------------------------------
function renderClocksAndGreeting() {
  const myTz = state.timezone;
  const tzCO = COUNTRY_TZ.CO;
  const tzES = COUNTRY_TZ.ES;

  qs('#greeting-line').textContent = `${getGreeting(myTz)}, ${state.displayName}`;
  qs('#clock-a-time').textContent = formatClock(tzCO);
  qs('#clock-b-time').textContent = formatClock(tzES);
  qs('#clocks-diff').textContent = formatHourDiff(tzCO, tzES);

  const talk = talkWindowMessage(tzCO, tzES);
  const el = qs('#talk-window');
  el.textContent = talk.good ? `🟢 ${talk.text}` : talk.text;
  el.dataset.good = String(talk.good);
}

// ---------------------------------------------------------
// HOME — presencia
// ---------------------------------------------------------
function wireHomeCard() {
  qs('#btn-im-here').addEventListener('click', async () => {
    await markHere(state.coupleId, state.deviceId);
    showToast(`🟢 ${state.displayName} está aquí`);
  });
}

function renderPresence() {
  const list = qs('#presence-list');
  const ids = Object.keys(state.members);
  if (ids.length === 0) {
    list.innerHTML = '<p class="empty-hint">Esperando a que tu pareja se una al espacio.</p>';
    qs('#both-here-banner').hidden = true;
    return;
  }

  const rows = ids.map((id) => {
    const member = state.members[id];
    const presence = state.presence[id];
    const isMe = id === state.deviceId;
    const status = presence?.status;
    const meta = status ? statusMeta(status) : null;
    const label = meta ? meta.label : guessActivityLabel(member.timezone || COUNTRY_TZ[member.country]);
    const emoji = meta ? meta.emoji : '🕓';
    let untilText = '';
    const until = toDateSafe(presence?.until);
    if (until && until.getTime() > Date.now()) {
      untilText = ` · hasta las ${until.toTimeString().slice(0, 5)}`;
    }
    const here = isHereActive(presence);
    return `
      <div class="presence-row" data-device="${escapeHtml(id)}"${isMe ? ' role="button" tabindex="0"' : ''}>

        <span class="presence-row__emoji">${here ? '🟢' : emoji}</span>
        <div class="presence-row__body">
          <div class="presence-row__name">${escapeHtml(member.displayName)}${isMe ? ' (tú)' : ''}</div>
          <div class="presence-row__status">${escapeHtml(label)}${untilText}</div>
        </div>
        <div class="presence-row__meta">${presence?.updatedAt ? relativeTime(toDateSafe(presence.updatedAt)) : ''}</div>
      </div>`;
  }).join('');
  list.innerHTML = rows;

  qsa('.presence-row[data-device]').forEach((row) => {
    if (row.dataset.device === state.deviceId) {
      row.addEventListener('click', () => openStatusModal());
    }
  });

  const both = bothHere(state.presence, ids);
  qs('#both-here-banner').hidden = !both;
  if (both) qs('#both-here-banner').textContent = '✨ Ambos están aquí';
}

function openStatusModal() {
  openModal('tpl-modal-status', (content) => {
    const grid = qs('#status-options', content);
    grid.innerHTML = STATUS_OPTIONS.map((s) => `
      <button type="button" class="status-opt" data-value="${s.value}" role="radio" aria-checked="false">
        <span>${s.emoji}</span><span>${escapeHtml(s.label)}</span>
      </button>`).join('');
    let selected = state.presence[state.deviceId]?.status || 'available';
    const refresh = () => qsa('.status-opt', grid).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.value === selected)));
    refresh();
    qsa('.status-opt', grid).forEach((btn) => btn.addEventListener('click', () => { selected = btn.dataset.value; refresh(); }));

    qs('#btn-save-status', content).addEventListener('click', async () => {
      try {
        await setStatus(state.coupleId, state.deviceId, { status: selected, untilTime: qs('#status-until', content).value });
        closeModal();
        showToast('✓ Estado actualizado');
      } catch (_) {
        showToast('⚠ No se pudo guardar', 'error');
      }
    });
  });
}

// ---------------------------------------------------------
// HOME — Para ti (preview)
// ---------------------------------------------------------
function renderNotesPreview() {
  const unread = unreadCountForMe();
  const badge = qs('#notes-unread-badge');
  badge.hidden = unread === 0;
  badge.textContent = String(unread);

  const body = qs('#notes-preview-body');
  const mine = state.notes.slice(0, 3);
  if (mine.length === 0) {
    body.innerHTML = '<p class="empty-hint">Nada nuevo por aquí todavía.</p>';
    return;
  }
  body.innerHTML = mine.map((n) => noteItemHtml(n)).join('');
  wireNoteItems(body);
}

function noteItemHtml(n) {
  const meta = NOTE_TYPES[n.type] || NOTE_TYPES.note;
  const isMine = n.author === state.deviceId;
  const unread = !isMine && !n.read;
  return `
    <div class="note-item ${unread ? 'is-unread' : ''}" data-note="${n.id}">
      <div class="note-item__meta">
        <span>${unread ? '<span class="note-item__unread-dot"></span>' : ''}${meta.emoji} ${escapeHtml(isMine ? 'Tú' : n.authorName || 'Tu pareja')}</span>
        <span>${n.createdAt ? relativeTime(toDateSafe(n.createdAt)) : ''}</span>
      </div>
      <div class="note-item__content">${escapeHtml(n.content)}${n.link ? `<br><a href="${escapeHtml(n.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(n.link)}</a>` : ''}</div>
    </div>`;
}

function wireNoteItems(root) {
  qsa('.note-item[data-note]', root).forEach((el) => {
    el.addEventListener('click', async () => {
      const id = el.dataset.note;
      try { await markNoteRead(state.coupleId, id); } catch (_) { /* silencioso */ }
    });
  });
}

// ---------------------------------------------------------
// HOME — próximo plan
// ---------------------------------------------------------
function renderNextPlan() {
  const card = qs('#next-plan-card');
  const next = getNextPlan();
  if (!next) { card.hidden = true; return; }
  card.hidden = false;
  const meta = PLAN_TYPES[next.type] || PLAN_TYPES.other;
  const myLine = formatInstantForZone(next.whenDate, state.timezone);
  const partnerId = getPartnerDeviceId();
  const partnerTz = partnerId ? state.members[partnerId]?.timezone : null;
  const partnerLine = partnerTz ? formatInstantForZone(next.whenDate, partnerTz) : null;

  qs('#next-plan-body').innerHTML = `
    <div class="next-plan-row">
      <span class="next-plan-emoji">${meta.emoji}</span>
      <div>
        <div class="next-plan-title">${escapeHtml(next.title)}</div>
        <div class="next-plan-times">${escapeHtml(myLine)}${partnerLine ? ` · ${escapeHtml(partnerLine)}` : ''}</div>
      </div>
    </div>`;
}

// ---------------------------------------------------------
// HOME — actividad
// ---------------------------------------------------------
function renderActivity() {
  const list = qs('#activity-list');
  if (state.activity.length === 0) {
    list.innerHTML = '<p class="empty-hint">Todavía no hay actividad.</p>';
    return;
  }
  list.innerHTML = state.activity.map((a) => `
    <div class="activity-row">
      <span class="activity-dot"></span>
      <div class="activity-body">
        <div class="activity-text">${escapeHtml(a.summary)}</div>
        <div class="activity-time">${a.createdAt ? relativeTime(toDateSafe(a.createdAt)) : ''}</div>
      </div>
    </div>`).join('');
}

// ---------------------------------------------------------
// HOME — próximo encuentro
// ---------------------------------------------------------
function renderMeeting() {
  const card = qs('#meeting-card');
  const m = state.meeting;
  if (!m || !m.date) { card.hidden = true; renderMeetingSettings(); return; }
  card.hidden = false;
  const days = daysUntil(m.date);
  const daysText = days === null ? '—' : days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : days > 1 ? `${days} días` : 'Ya pasó';

  const todosHtml = state.meetingTodos.map((t) => `
    <div class="list-item-row" data-todo="${t.id}">
      <button class="list-item-check ${t.done ? 'is-checked' : ''}" data-toggle-todo="${t.id}" aria-label="Marcar completado">${t.done ? '✓' : ''}</button>
      <span class="list-item-text ${t.done ? 'is-done' : ''}">${escapeHtml(t.text)}</span>
    </div>`).join('');

  qs('#meeting-body').innerHTML = `
    <div class="meeting-flag-row"><span>🇨🇴 Colombia</span><span>→</span><span>🇪🇸 España</span></div>
    <div class="meeting-days">${daysText}</div>
    <div class="meeting-days-label">Próximo encuentro</div>
    <div class="meeting-place">${escapeHtml(m.city || '')}${m.city && m.country ? ', ' : ''}${escapeHtml(m.country || '')}</div>
    ${m.description ? `<p class="muted-text" style="margin-top:8px;">${escapeHtml(m.description)}</p>` : ''}
    <h3 class="card-title" style="margin-top:16px;">Cuando estemos juntos</h3>
    <div class="list-items">${todosHtml || '<p class="empty-hint">Añade cosas que quieran hacer juntos.</p>'}</div>
    <form id="form-meeting-todo" class="inline-add-form" style="margin-top:10px;">
      <input id="input-meeting-todo" class="text-input" type="text" maxlength="100" placeholder="Ej. Ir a este lugar" />
      <button type="submit" class="btn btn-primary">＋</button>
    </form>`;

  qsa('[data-toggle-todo]').forEach((btn) => {
    btn.addEventListener('click', () => toggleMeetingTodo(state.coupleId, btn.dataset.toggleTodo));
  });
  const form = qs('#form-meeting-todo');
  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = qs('#input-meeting-todo');
    if (!input.value.trim()) return;
    await addMeetingTodo(state.coupleId, input.value);
    input.value = '';
  });

  renderMeetingSettings();
}

function renderMeetingSettings() {
  const el = qs('#meeting-settings-body');
  if (!el) return;
  const m = state.meeting;
  el.innerHTML = m && m.date
    ? `<p class="muted-text">${escapeHtml(m.city || 'Sin ciudad')}${m.city ? ', ' : ''}${escapeHtml(m.country || '')} · ${escapeHtml(m.date)}</p>`
    : '<p class="muted-text">Todavía no habéis fijado un próximo encuentro.</p>';
}

// ---------------------------------------------------------
// PLANES
// ---------------------------------------------------------
function wirePlansRoute() {
  qs('#btn-new-plan').addEventListener('click', () => openPlanModal());
}

function renderPlansList() {
  const list = qs('#plans-list');
  if (state.plans.length === 0) {
    list.innerHTML = '<p class="empty-hint">Todavía no habéis creado ningún plan. Crea el primero con el botón de arriba.</p>';
    return;
  }
  const partnerId = getPartnerDeviceId();
  const partnerTz = partnerId ? state.members[partnerId]?.timezone : null;

  const sorted = [...state.plans].sort((a, b) => toDateSafe(a.when) - toDateSafe(b.when));
  list.innerHTML = sorted.map((p) => {
    const meta = PLAN_TYPES[p.type] || PLAN_TYPES.other;
    const whenDate = toDateSafe(p.when);
    const myLine = formatInstantForZone(whenDate, state.timezone);
    const partnerLine = partnerTz ? formatInstantForZone(whenDate, partnerTz) : null;
    return `
      <div class="plan-card ${p.completed ? 'is-completed' : ''}" data-plan="${p.id}">
        <span class="plan-card__emoji">${meta.emoji}</span>
        <div class="plan-card__body">
          <div class="plan-card__title">${escapeHtml(p.title)}</div>
          ${p.description ? `<div class="plan-card__desc">${escapeHtml(p.description)}</div>` : ''}
          <div class="plan-card__times"><span>${escapeHtml(myLine)}</span>${partnerLine ? `<span>${escapeHtml(partnerLine)}</span>` : ''}</div>
        </div>
        <div class="plan-card__actions">
          <button class="icon-btn" data-toggle-plan="${p.id}" aria-label="Marcar completado">${p.completed ? '↺' : '✓'}</button>
          <button class="icon-btn" data-delete-plan="${p.id}" aria-label="Eliminar plan">✕</button>
        </div>
      </div>`;
  }).join('');

  qsa('[data-toggle-plan]').forEach((btn) => btn.addEventListener('click', () => togglePlanCompleted(state.coupleId, btn.dataset.togglePlan)));
  qsa('[data-delete-plan]').forEach((btn) => btn.addEventListener('click', async () => {
    await deletePlan(state.coupleId, btn.dataset.deletePlan);
    showToast('✓ Plan eliminado');
  }));
}

function openPlanModal() {
  openModal('tpl-modal-plan', (content) => {
    qs('#btn-save-plan', content).addEventListener('click', async () => {
      const btn = qs('#btn-save-plan', content);
      btn.disabled = true;
      try {
        await createPlan(state.coupleId, {
          title: qs('#plan-title', content).value,
          type: qs('#plan-type', content).value,
          description: qs('#plan-desc', content).value,
          dateStr: qs('#plan-date', content).value,
          timeStr: qs('#plan-time', content).value,
          reminderMinutes: qs('#plan-reminder', content).value,
        });
        closeModal();
        showToast('✓ Plan creado');
      } catch (err) {
        showToast(err.message || '⚠ No se pudo guardar', 'error');
        btn.disabled = false;
      }
    });
  });
}

// ---------------------------------------------------------
// LISTAS
// ---------------------------------------------------------
let currentListId = null;

function wireListsRoute() {
  qs('#btn-new-list').addEventListener('click', () => openListModal());
  qs('#form-list-item').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = qs('#input-list-item');
    if (!input.value.trim() || !currentListId) return;
    try {
      await addListItem(state.coupleId, currentListId, input.value);
      input.value = '';
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function renderListsGrid() {
  const grid = qs('#lists-grid');
  if (state.lists.length === 0) {
    grid.innerHTML = '<p class="empty-hint">Crea vuestra primera lista compartida.</p>';
    return;
  }
  grid.innerHTML = state.lists.map((l) => {
    const meta = LIST_CATEGORIES[l.category] || LIST_CATEGORIES.ideas;
    return `
      <button type="button" class="list-tile" data-list="${l.id}">
        <div class="list-tile__emoji">${meta.emoji}</div>
        <div class="list-tile__name">${escapeHtml(l.name)}</div>
        <div class="list-tile__count">${meta.label}</div>
      </button>`;
  }).join('');
  qsa('[data-list]', grid).forEach((btn) => btn.addEventListener('click', () => openListDetail(btn.dataset.list)));
}

function openListDetail(listId) {
  currentListId = listId;
  const list = state.lists.find((l) => l.id === listId);
  qs('#list-detail-title').textContent = list ? list.name : 'Lista';
  subscribeListItems(state.coupleId, listId);
  switchRoute('list-detail');
  renderListDetailItems();
}

function renderListDetailItems() {
  const container = qs('#list-detail-items');
  const items = state.listItemsByList[currentListId] || [];
  if (items.length === 0) {
    container.innerHTML = '<p class="empty-hint">Todavía no hay elementos en esta lista.</p>';
    return;
  }
  container.innerHTML = items.map((item) => {
    const both = isItemDoneByBoth(item);
    const mine = isItemDoneByMe(item);
    return `
      <div class="list-item-row">
        <button class="list-item-check ${both ? 'is-both' : mine ? 'is-checked' : ''}" data-toggle-item="${item.id}" aria-label="Marcar">${mine || both ? '✓' : ''}</button>
        <span class="list-item-text ${both ? 'is-done' : ''}">${escapeHtml(item.text)}</span>
        ${both ? '<span class="list-item-together">✓ Hecho juntos</span>' : ''}
        <button class="icon-btn" data-delete-item="${item.id}" aria-label="Eliminar">✕</button>
      </div>`;
  }).join('');

  qsa('[data-toggle-item]', container).forEach((btn) => btn.addEventListener('click', () => toggleListItem(state.coupleId, currentListId, btn.dataset.toggleItem)));
  qsa('[data-delete-item]', container).forEach((btn) => btn.addEventListener('click', () => deleteListItem(state.coupleId, currentListId, btn.dataset.deleteItem)));
}

function openListModal() {
  openModal('tpl-modal-list', (content) => {
    qs('#btn-save-list', content).addEventListener('click', async () => {
      try {
        const id = await createList(state.coupleId, {
          name: qs('#list-name', content).value,
          category: qs('#list-category', content).value,
        });
        closeModal();
        showToast('✓ Lista creada');
        switchRoute('lists');
        openListDetail(id);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

// ---------------------------------------------------------
// MÁS (configuración)
// ---------------------------------------------------------
function wireMore() {
  qsa('.segmented__opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.theme);
      qsa('.segmented__opt').forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
    });
  });

  qs('#btn-save-profile').addEventListener('click', async () => {
    try {
      await updateProfile(state.coupleId, {
        displayName: qs('#settings-name').value,
        country: qs('#settings-country').value,
      });
      showToast('✓ Guardado');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  qs('#btn-enable-notifs').addEventListener('click', async () => {
    const result = await requestNotifPermission();
    renderNotifStatus();
    if (result === 'granted') showToast('✓ Notificaciones activadas');
    else if (result === 'denied') showToast('No se activaron las notificaciones', 'error');
  });

  qs('#btn-settings-copy-code').addEventListener('click', async () => {
    const ok = await copyToClipboard(formatCodeForDisplay(state.coupleId));
    showToast(ok ? '✓ Código copiado' : 'No se pudo copiar', ok ? 'default' : 'error');
  });

  qs('#btn-edit-meeting').addEventListener('click', () => openMeetingModal());

  qs('#btn-logout').addEventListener('click', () => {
    if (!confirm('Esto borrará los datos guardados en este dispositivo. ¿Continuar?')) return;
    teardownSubscriptions();
    clearLocalSession();
    location.reload();
  });

  renderNotifStatus();
}

function renderNotifStatus() {
  qs('#notif-status-text').textContent = notifStatusText();
  qs('#btn-enable-notifs').hidden = notifPermission() !== 'default';
}

function renderMoreProfile() {
  if (!state.displayName) return;
  qs('#settings-name').value = state.displayName;
  qs('#settings-country').value = state.country;
  qs('#settings-code-display').textContent = formatCodeForDisplay(state.coupleId);
  qsa('.segmented__opt').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.theme === state.theme)));
}

function openMeetingModal() {
  openModal('tpl-modal-meeting', (content) => {
    const m = state.meeting;
    if (m) {
      qs('#meeting-date', content).value = m.date || '';
      qs('#meeting-city', content).value = m.city || '';
      qs('#meeting-country', content).value = m.country || '';
      qs('#meeting-desc', content).value = m.description || '';
    }
    qs('#btn-save-meeting', content).addEventListener('click', async () => {
      try {
        await saveMeeting(state.coupleId, {
          date: qs('#meeting-date', content).value,
          city: qs('#meeting-city', content).value,
          country: qs('#meeting-country', content).value,
          description: qs('#meeting-desc', content).value,
        });
        closeModal();
        showToast('✓ Guardado');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

// ---------------------------------------------------------
// ACCIONES RÁPIDAS
// ---------------------------------------------------------
function wireQuickActions() {
  qsa('.quick-action').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'open-note') openNoteModal();
      if (action === 'open-plan') openPlanModal();
      if (action === 'open-checkin') openCheckinModal();
      if (action === 'open-idea') openIdeaModal();
    });
  });
}

function openNoteModal() {
  openModal('tpl-modal-note', (content) => {
    const typeSelect = qs('#note-type', content);
    const linkWrap = qs('#note-link-wrap', content);
    typeSelect.addEventListener('change', () => { linkWrap.hidden = typeSelect.value !== 'link'; });

    qs('#btn-save-note', content).addEventListener('click', async () => {
      try {
        await createNote(state.coupleId, {
          type: typeSelect.value,
          content: qs('#note-content', content).value,
          link: qs('#note-link', content).value,
        });
        closeModal();
        showToast('✓ Nota enviada');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

function openIdeaModal() {
  openModal('tpl-modal-note', (content) => {
    qs('#note-type', content).value = 'story';
    qs('#modal-content .modal-title').textContent = 'Nueva idea';
    qs('#note-content', content).placeholder = 'Tengo una idea…';

    qs('#btn-save-note', content).addEventListener('click', async () => {
      try {
        await createNote(state.coupleId, { type: 'story', content: qs('#note-content', content).value });
        closeModal();
        showToast('✓ Idea guardada');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

function openCheckinModal() {
  openModal('tpl-modal-checkin', (content) => {
    const grid = qs('#mood-options', content);
    grid.innerHTML = MOOD_OPTIONS.map((m) => `
      <button type="button" class="status-opt" data-value="${m.value}" role="radio" aria-checked="false">
        <span>${m.emoji}</span><span>${escapeHtml(m.label)}</span>
      </button>`).join('');
    let selected = null;
    qsa('.status-opt', grid).forEach((btn) => btn.addEventListener('click', () => {
      selected = btn.dataset.value;
      qsa('.status-opt', grid).forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
    }));

    qs('#btn-save-checkin', content).addEventListener('click', async () => {
      if (!selected) { showToast('Elige cómo te sientes', 'error'); return; }
      try {
        await createCheckin(state.coupleId, { mood: selected, note: qs('#checkin-note', content).value });
        closeModal();
        showToast('✓ Check-in compartido');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

// ---------------------------------------------------------
// MODALES
// ---------------------------------------------------------
function wireModalGlobal() {
  qs('#modal-backdrop').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !qs('#modal-root').hidden) closeModal();
  });
}

function openModal(templateId, setupFn) {
  const root = qs('#modal-root');
  const content = qs('#modal-content');
  const tpl = document.getElementById(templateId);
  content.innerHTML = '';
  content.appendChild(tpl.content.cloneNode(true));
  root.hidden = false;
  document.body.style.overflow = 'hidden';
  setupFn(content);
  const firstInput = qs('input, select, textarea', content);
  if (firstInput) setTimeout(() => firstInput.focus(), 50);
}

function closeModal() {
  qs('#modal-root').hidden = true;
  qs('#modal-content').innerHTML = '';
  document.body.style.overflow = '';
}

// ---------------------------------------------------------
// Limpieza de listeners (usado al cerrar sesión local)
// ---------------------------------------------------------
function teardownSubscriptions() {
  unsubscribeMembers();
  unsubscribePresence();
  unsubscribeNotes();
  unsubscribePlans();
  unsubscribeLists();
  unsubscribeCheckins();
  unsubscribeActivity();
  unsubscribeMeeting();
  if (clockInterval) clearInterval(clockInterval);
}
