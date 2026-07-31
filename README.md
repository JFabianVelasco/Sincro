# Sincro

Un espacio digital privado para dos personas que viven en países diferentes
(🇨🇴 Colombia / 🇪🇸 España). Sincro es una app web estática: HTML, CSS y
JavaScript modular, sin frameworks, con Cloud Firestore como único backend.

No es una web romántica al uso: es una herramienta para saber la hora del
otro, ver su disponibilidad, dejarse notas, organizar planes y listas, hacer
check-ins y llevar la cuenta del próximo encuentro.

---

## 1. Instalación

1. **Descarga el proyecto** (todos los archivos de esta carpeta, manteniendo
   la estructura de subcarpetas `css/` y `js/`).
2. **Configura Firebase** (ver sección 2) y crea Cloud Firestore.
3. **Pega las reglas** de `firestore.rules` en tu proyecto (ver sección 2).
4. **Sirve el proyecto por HTTPS** (ver sección 4). No basta con abrir
   `index.html` con doble clic (`file://`): los módulos ES y algunas APIs
   del navegador (portapapeles, notificaciones) requieren un servidor real,
   aunque sea local.

Para probarlo en local rápidamente, con Python instalado:

```bash
cd sincro
python3 -m http.server 8080
```

y abre `http://localhost:8080`.

---

## 2. Firebase

Sincro usa el proyecto de Firebase indicado en `js/firebase.js`. Si quieres
usar tu propio proyecto:

1. Ve a [Firebase Console](https://console.firebase.google.com) → tu
   proyecto → **Build → Firestore Database → Crear base de datos**.
   - Elige el modo **producción** (no "modo de prueba"): las reglas de
     `firestore.rules` son las que protegen la app.
   - Elige la región más cercana a las dos personas (por ejemplo,
     `eur3 (europe-west)` o `us-east1`, según convenga).
2. Ve a **Firestore Database → Reglas** y pega el contenido íntegro de
   `firestore.rules`. Pulsa **Publicar**.
3. Ve a **Configuración del proyecto → General → Tus apps → Web** y copia
   el objeto `firebaseConfig`. Pégalo en `js/firebase.js`, sustituyendo el
   que ya está.
4. **No actives** Authentication, Storage, Realtime Database ni Analytics:
   Sincro no los usa y las reglas de este proyecto no los contemplan.

No se necesita ninguna clave de API secreta adicional: la `apiKey` de
Firebase para apps web es pública por diseño (identifica el proyecto, no
autoriza nada por sí sola). La protección real vive en las reglas de
Firestore, con las limitaciones explicadas en la sección 5.

---

## 3. Estructura del proyecto

```
sincro/
├── index.html            Estructura completa de todas las pantallas (SPA)
├── manifest.json          Metadatos para instalar Sincro como app (PWA-ready)
├── firestore.rules        Reglas de seguridad de Firestore
├── README.md
├── css/
│   ├── style.css          Tokens de diseño (color, tipografía) + componentes
│   ├── animations.css      Keyframes y respeto a prefers-reduced-motion
│   └── responsive.css      Breakpoints mobile-first → desktop
└── js/
    ├── firebase.js         Inicialización de Firebase y rutas de Firestore
    ├── state.js            Estado en memoria + sesión local (localStorage)
    ├── time.js             Zonas horarias, saludo, diferencia horaria
    ├── utils.js             IDs, saneado de texto, formato, portapapeles
    ├── presence.js          Estados ("qué estás haciendo") y "Estoy aquí"
    ├── notes.js              Sección "Para ti"
    ├── plans.js              Planes con conversión de zona horaria
    ├── lists.js               Listas compartidas y "hecho juntos"
    ├── checkins.js            Check-ins de ánimo
    ├── activity.js             Línea de actividad reciente
    ├── settings.js             Perfil, tema, espacio, próximo encuentro
    ├── notifications.js        Toasts + notificaciones del navegador
    └── app.js                   Arranque, enrutado y renderizado (conecta todo)
```

Cada archivo de `js/` tiene una responsabilidad clara: si vas a tocar los
planes, solo necesitas abrir `plans.js` (lógica) y las funciones de
renderizado correspondientes en `app.js`.

---

## 4. Despliegue

Sincro es 100% estática: cualquier hosting que sirva archivos por HTTPS
funciona.

### Firebase Hosting
```bash
npm install -g firebase-tools   # solo si no lo tienes
firebase login
firebase init hosting           # elige "usar un directorio existente" → sincro
firebase deploy
```

### GitHub Pages
1. Sube la carpeta `sincro/` a un repositorio de GitHub.
2. Ve a **Settings → Pages** y elige la rama y carpeta raíz.
3. GitHub te dará una URL `https://usuario.github.io/repo/`.

### Netlify
1. Arrastra la carpeta `sincro/` a [app.netlify.com/drop](https://app.netlify.com/drop),
   o conecta el repositorio.
2. No hace falta build command: es contenido estático.

**HTTPS es obligatorio** para: el Service Worker (si añades uno más
adelante), la API de notificaciones en algunos navegadores, y para que
`navigator.clipboard` funcione de forma fiable. Todos los hostings de
arriba lo dan por defecto.

---

## 5. Seguridad — léelo antes de compartir tu espacio

Sincro **no usa Firebase Authentication**. Es una decisión de diseño para
mantener la app simple y sin backend propio, pero tiene un límite real de
seguridad que debes conocer:

- El **código de pareja** (por ejemplo `X7K-29P`) funciona como una
  contraseña de acceso a vuestro espacio. Cualquiera que lo consiga puede
  leer y escribir en él.
- Las reglas de `firestore.rules` validan la **forma** de los datos
  (tipos, longitudes, campos esperados) pero **no pueden verificar quién
  eres**, porque Firestore no tiene ninguna identidad autenticada a la que
  aferrarse sin Authentication.
- Por eso: **no publiques el código en redes sociales, capturas de
  pantalla públicas ni repositorios abiertos**. Compártelo solo por un
  canal privado con tu pareja.

Esto **no es tan seguro como** un sistema con autenticación real. Si en el
futuro quieres ese nivel de protección, la vía correcta es añadir Firebase
Authentication (por ejemplo, autenticación anónima con un *custom claim*
por espacio) y reescribir `firestore.rules` para comprobar `request.auth`.

---

## 6. Notificaciones — qué funciona y qué no

Sincro puede pedir permiso para mostrar notificaciones del navegador
(`Notification API`) mientras la pestaña sigue abierta en algún dispositivo.
Eso **sí funciona** con el código incluido.

Lo que **no puede hacer** un frontend estático sin backend propio es enviar
notificaciones **push reales cuando la app está cerrada** (por ejemplo,
avisarte de un plan aunque no tengas Sincro abierta en ningún sitio). Eso
requiere:

- Un **Service Worker** registrado para recibir mensajes en segundo plano.
- **Firebase Cloud Messaging** (u otro servicio push) con claves VAPID.
- Algún disparador del lado servidor (una Cloud Function programada, por
  ejemplo) que revise los recordatorios pendientes y envíe el push, ya que
  nadie va a tener el navegador abierto en el momento exacto.

No se ha simulado ni fingido este comportamiento: los recordatorios se
guardan junto al plan (5 min, 15 min, 30 min, 1 h o 1 día antes) para que
en el futuro puedas conectarlos a Cloud Functions + FCM si quieres
notificaciones reales con la app cerrada.

---

## 7. Qué NO incluye Sincro (a propósito)

Autenticación de usuarios, subida de fotos, chat en vivo, IA, feed público,
perfiles públicos, seguidores, "me gusta", comentarios, publicidad,
gamificación, corazones flotantes o frases románticas automáticas. Sincro
está pensado para ser útil primero y cercano de forma indirecta.
