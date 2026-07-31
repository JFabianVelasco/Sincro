# Sincro

Un espacio digital privado para dos personas que viven en países distintos,
donde sea que estén. Sincro es una app web estática: HTML, CSS y JavaScript
modular, sin frameworks, con Firebase (Authentication + Firestore) como
backend.

No es una web romántica al uso: es una herramienta para saber la hora del
otro, ver su disponibilidad, dejarse notas, organizar planes y listas, hacer
check-ins y llevar la cuenta del próximo encuentro.

---

## 1. Qué activar en Firebase (léelo primero)

Como ahora Sincro usa cuentas reales, en la [Firebase Console](https://console.firebase.google.com) de tu proyecto tienes que activar dos cosas, además de Firestore:

### a) Authentication
1. **Build → Authentication → Get started**.
2. Pestaña **Sign-in method → Add new provider**:
   - **Google**: actívalo y elige un correo de soporte del proyecto. No hace falta configurar nada más para empezar a probar.
   - **Correo electrónico/contraseña**: actívalo (el interruptor "Email/Password").
3. Pestaña **Settings → Authorized domains**: añade el dominio donde vive tu app en Vercel (por ejemplo `sincro.vercel.app` o tu dominio propio) y, si pruebas en local, `localhost`. Sin este paso, el inicio de sesión con Google fallará con "auth/unauthorized-domain" en producción.

### b) Firestore Database
1. **Build → Firestore Database → Crear base de datos** (modo producción).
2. **Reglas**: pega el contenido íntegro de `firestore.rules` de este proyecto y publica.

Con eso, tu despliegue en Vercel ya puede autenticar personas y leer/escribir en Firestore. No necesitas activar Storage, Realtime Database ni Analytics: esta app no los usa.

---

## 2. Instalación

1. **Descarga el proyecto** manteniendo la estructura de `css/` y `js/`.
2. **Activa Firebase** como en la sección 1.
3. Si usas tu propio proyecto de Firebase (no el incluido), copia tu `firebaseConfig` en `js/firebase.js`.
4. **Sirve el proyecto por HTTPS** (Vercel ya lo hace). En local:

```bash
cd sincro
python3 -m http.server 8080
```

---

## 3. Qué cambió respecto a la primera versión

- **Inicio de sesión real**: Google o correo/contraseña, en vez de un identificador de dispositivo aleatorio. Esto también significa que si inicias sesión en otro dispositivo con la misma cuenta, entras directo a tu espacio sin volver a pedir el código.
- **Guardar perfil refresca al instante**: antes, al cambiar tu nombre en "Más", el saludo y la presencia tardaban hasta el siguiente refresco automático (cada 20 s) en actualizarse. Ahora `updateProfile` actualiza primero el estado local y repinta la pantalla inmediatamente, y el guardado en Firestore ocurre justo después.
- **Cualquier país, no solo Colombia/España**: el onboarding y los ajustes muestran un selector con un catálogo amplio de países (`js/countries.js`); la bandera se calcula automáticamente a partir del código de país, y los relojes de inicio muestran el país real de cada persona.
- **Género**: hombre, mujer o "prefiero no decirlo", como parte del perfil.
- **Invitación más "pro"**: además del código de 6 caracteres, ahora se genera un enlace de invitación (`tuapp.vercel.app/?join=X7K29P`). Si la otra persona lo abre, el paso de "unirme" ya viene con el código relleno.

---

## 4. Estructura del proyecto

```
sincro/
├── index.html            Estructura completa de todas las pantallas (SPA)
├── manifest.json          Metadatos para instalar Sincro como app (PWA-ready)
├── firestore.rules        Reglas de seguridad de Firestore (con Authentication)
├── README.md
├── css/
│   ├── style.css          Tokens de diseño (color, tipografía) + componentes
│   ├── animations.css      Keyframes y respeto a prefers-reduced-motion
│   └── responsive.css      Breakpoints mobile-first → desktop
└── js/
    ├── firebase.js         Inicialización de Firebase (Auth + Firestore) y rutas
    ├── auth.js               Google / correo-contraseña / perfil en users/{uid}
    ├── countries.js           Catálogo de países, zona horaria y bandera
    ├── state.js               Estado en memoria + caché local (localStorage)
    ├── time.js                Zonas horarias, saludo, diferencia horaria
    ├── utils.js                IDs, saneado de texto, formato, portapapeles
    ├── presence.js              Estados ("qué estás haciendo") y "Estoy aquí"
    ├── notes.js                  Sección "Para ti"
    ├── plans.js                   Planes con conversión de zona horaria
    ├── lists.js                    Listas compartidas y "hecho juntos"
    ├── checkins.js                  Check-ins de ánimo
    ├── activity.js                   Línea de actividad reciente
    ├── settings.js                    Perfil, tema, espacio, próximo encuentro
    ├── notifications.js                Toasts + notificaciones del navegador
    └── app.js                           Arranque, enrutado y renderizado
```

---

## 5. Despliegue en Vercel (y alternativas)

Ya lo tienes en Vercel: solo asegúrate de que el dominio que te dio Vercel
está en **Authentication → Settings → Authorized domains** (sección 1).
Al ser contenido 100% estático, también funciona igual en Firebase Hosting,
GitHub Pages o Netlify, sin build command.

---

## 6. Seguridad

Con Authentication activado, `firestore.rules` ya puede exigir
`request.auth.uid` en cada escritura: cada persona solo puede escribir su
propio documento de miembro, presencia o perfil, y solo puede leer o
escribir dentro de un espacio (`couples/{coupleId}`) si antes se unió a él
como miembro. Esto es una mejora real de seguridad frente a una app sin
autenticación.

El punto que sigue dependiendo de vosotros: el **código/enlace de
invitación** sigue siendo la puerta de entrada a un espacio — cualquier
persona autenticada que lo consiga puede unirse. Compártelo solo con tu
pareja, igual que compartirías la contraseña de una cuenta conjunta.

---

## 7. Notificaciones — qué funciona y qué no

Sincro puede pedir permiso para notificaciones del navegador mientras la
pestaña sigue abierta en algún dispositivo. Lo que no puede hacer un
frontend estático sin backend propio es enviar **push reales con la app
cerrada**: para eso haría falta un Service Worker + Firebase Cloud
Messaging + un disparador del lado servidor (por ejemplo, una Cloud
Function programada) que revise los recordatorios pendientes. No se ha
simulado ese comportamiento; los recordatorios se guardan junto al plan
para conectarlos a eso en el futuro si se desea.

---

## 8. Ideas para seguir mejorando

Algunas cosas que encajarían bien con lo que ya existe, por si quieres
seguir iterando:

- **Recordatorios reales**: Cloud Function programada + Firebase Cloud Messaging para avisos aunque la app esté cerrada.
- **Fotos compartidas puntuales**: activar Firebase Storage solo para adjuntar una imagen a una nota o a un plan (hoy no está activado a propósito).
- **Varios husos horarios de "próximo encuentro"**: mostrar la fecha también en la zona horaria de cada persona, igual que ya hacen los planes.
- **Modo invitado de solo lectura**: un enlace que muestre el próximo encuentro sin dar acceso de escritura, para compartir con amigos o familia.
- **Exportar recuerdos**: un botón para descargar notas y check-ins como PDF o texto, a modo de diario de la relación.

---

## 9. Qué NO incluye Sincro (a propósito)

Subida de fotos, chat en vivo, IA, feed público, perfiles públicos,
seguidores, "me gusta", comentarios, publicidad, gamificación, corazones
flotantes o frases románticas automáticas. Sincro está pensado para ser
útil primero y cercano de forma indirecta.
