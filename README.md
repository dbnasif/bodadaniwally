# Misión Secreta — Dani & Wally

Mini web app de desafíos fotográficos para la boda (11/10/2026). Una sola aplicación:
el QR de cada tarjeta (A–E) solo cambia el parámetro `?grupo=` en la URL.

- `/` (o `/?grupo=A`) — pantalla de desafíos del invitado.
- `/ranking` — ranking general, accesible desde un botón fijo.
- `/admin` — panel privado para Dani & Wally (no está linkeado desde ningún lado público).

## Arquitectura (resumen)

- **Frontend:** Vite + React + TypeScript, sin router externo, sin PWA/service worker
  (decisión deliberada: un service worker mal cacheado es la forma más común de que
  una app se rompa "a mitad de la fiesta").
- **Backend:** Supabase (Postgres + Storage). No hay servidor propio.
  - Tabla `submissions`: una fila por foto. RLS permite `INSERT` público pero **no**
    `SELECT` público — nadie puede leer nombres/fotos con la clave pública del frontend.
  - Vista `ranking`: expone solo nombre + puntos + fecha, de lectura pública.
  - Bucket de Storage `photos`: público en lectura (URLs con UUID, no listables).
- **Admin:** una Netlify Function (`netlify/functions/admin-data.ts`) que usa la
  `service_role key` de Supabase **solo del lado del servidor** — esa clave nunca
  se manda al navegador. El acceso a `/admin` se protege con una contraseña simple
  guardada como variable de entorno en Netlify (`ADMIN_PASSWORD`).
- **Duplicados:** cada dispositivo genera un `guest_id` (UUID) guardado en
  `localStorage`. La base de datos tiene una restricción única
  `(guest_id, challenge_id)`: como máximo 1 punto por persona y desafío.

## 1. Servicios externos que necesitás crear

1. **Supabase** (gratis): [supabase.com](https://supabase.com) → crear cuenta → crear
   un proyecto nuevo (elegí una región cercana, ej. South America).
2. **Netlify**: ya tenés cuenta, solo necesitás un sitio nuevo apuntando a este repo
   (o el que uses para hostear la boda).

No hace falta ninguna otra cuenta. No hay login para los invitados.

## 2. Costos y límites (tier gratuito de Supabase)

- Storage: 1 GB gratis. Con compresión de imágenes en el cliente (~1-1.5MB por foto)
  y un máximo teórico de 300 fotos, quedás en ~450MB. Entra cómodo.
- Base de datos: 500MB gratis, muy por encima de lo que vas a usar (25 desafíos × 60
  personas son unas pocas miles de filas como mucho).
- **Importante:** los proyectos gratuitos de Supabase **se pausan después de 7 días
  sin actividad**. Como la boda es en octubre 2026, si configurás esto ahora y no lo
  volvés a abrir, se va a pausar. No se pierde nada, pero hay que entrar al dashboard
  y reactivarlo con un clic. Recomendación: probá la app una vez por mes, o reactivalo
  una semana antes de la boda y no lo toques hasta el evento.

## 3. Riesgos técnicos a tener en cuenta

- **Pausa por inactividad** (arriba). El riesgo más real de todo el proyecto.
- **HEIC de iPhone:** el navegador decodifica la foto en un `<canvas>` antes de
  subirla, así que se sube como JPEG comprimido. Si algún dispositivo muy viejo no
  soporta `createImageBitmap`, la app cae de nuevo a subir el archivo original (más
  lento, pero funciona).
- **Fotos no vinculadas si falla el insert después de subir la foto:** es un caso
  raro (subida OK, pero falla el registro en la base), y el código intenta borrar el
  archivo huérfano automáticamente. No afecta el conteo de puntos.
- **Cambiar de nombre o de celular:** técnicamente alguien podría hacerlo para sumar
  puntos de más. No se intentó bloquear porque el pedido explícito era priorizar
  simplicidad — es un juego de boda, no un sistema con seguridad bancaria.

## 4. Setup paso a paso (probarlo en tu celular antes de la boda)

### 4.1. Crear el proyecto en Supabase

1. En el dashboard de Supabase, creá un proyecto nuevo. Guardá la contraseña de la
   base (no la vas a necesitar para esto, pero por las dudas).
2. Andá a **SQL Editor** → **New query**, pegá todo el contenido de
   [`supabase/schema.sql`](./supabase/schema.sql) y ejecutalo (Run). Esto crea la
   tabla, la vista de ranking, el bucket de fotos y todas las políticas de seguridad.
3. Andá a **Project Settings → API**. Ahí vas a encontrar:
   - **Project URL** → esto es `SUPABASE_URL` / `VITE_SUPABASE_URL`.
   - **anon public key** → esto es `VITE_SUPABASE_ANON_KEY`. Es pública a propósito,
     no es secreta (la protección la da RLS, no esta clave).
   - **service_role key** → esto es `SUPABASE_SERVICE_ROLE_KEY`. **Esta sí es
     secreta**: nunca la pongas en un archivo `.env` que subís al repo, solo va en
     las variables de entorno de Netlify.

### 4.2. Configurar el proyecto localmente

```bash
npm install
cp .env.example .env.local
```

Editá `.env.local` y completá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los
valores del paso anterior. Las otras tres variables (`SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`) solo hacen falta si vas a probar
`/admin` localmente con `netlify dev` (ver 4.4); si no, ignoralas por ahora.

```bash
npm run dev
```

**Importante:** si no completaste `.env.local`, la app va a mostrar una pantalla en
blanco (la librería de Supabase corta la ejecución si faltan las credenciales). No es
un bug, es la señal de que falta ese paso.

Abrí `http://localhost:5173/?grupo=A` en el navegador para probar el grupo A. Para
probar desde tu celular en la misma red wifi, usá `npm run dev -- --host` y entrá a
la IP local que te muestre la terminal (ej. `http://192.168.x.x:5173/?grupo=A`).

### 4.3. Editar los 25 desafíos

Todo el contenido vive en un solo archivo: [`src/config/challenges.ts`](./src/config/challenges.ts).
Cada grupo (A–E) tiene un array de 5 objetos `{ title, description }`. Los podés
reemplazar por el texto definitivo cuando quieras; el `id` (A01, A02...) se genera
solo.

### 4.4. Agregar la ilustración de Papri (opcional)

Cuando tengas el PNG/SVG de Papri, guardalo como `public/papri.png`. La pantalla de
misiones ya tiene el espacio reservado arriba del título y lo va a mostrar
automáticamente — si el archivo no existe, ese espacio queda vacío sin errores.

### 4.5. Probar `/admin` localmente (opcional)

Para probar el panel de admin necesitás simular la Netlify Function. Instalá el CLI
de Netlify una sola vez (`npm install -g netlify-cli`), completá las tres variables
restantes en `.env.local`, y corré:

```bash
netlify dev
```

Esto levanta el frontend y las functions juntos. Entrá a `http://localhost:8888/admin`
y usá la contraseña que pusiste en `ADMIN_PASSWORD`.

## 5. Deploy en Netlify

1. Creá un sitio nuevo en Netlify apuntando a este repositorio/branch. El
   `netlify.toml` ya tiene configurado el build (`npm run build`), el publish
   directory (`dist`) y las functions (`netlify/functions`) — no hace falta tocar
   nada en la UI de build settings.
2. En **Site settings → Environment variables**, agregá las 5 variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL` (mismo valor que la de arriba)
   - `SUPABASE_SERVICE_ROLE_KEY` (la secreta, del paso 4.1)
   - `ADMIN_PASSWORD` (elegí algo simple que Dani & Wally puedan recordar)
3. Deploy. Netlify te da una URL tipo `https://tu-sitio.netlify.app`.

## 6. Generar los 5 códigos QR

Cada QR apunta a la misma URL del sitio, solo cambia `?grupo=`:

```
https://tu-sitio.netlify.app/?grupo=A
https://tu-sitio.netlify.app/?grupo=B
https://tu-sitio.netlify.app/?grupo=C
https://tu-sitio.netlify.app/?grupo=D
https://tu-sitio.netlify.app/?grupo=E
```

Generá cada QR con cualquier generador gratuito (ej. buscar "generador de QR" y
pegar cada URL) e imprimilos en las 5 tarjetas físicas.

## 7. Checklist de pruebas antes de la boda

Probalo con al menos dos celulares distintos (uno Android/Chrome, uno iPhone/Safari):

1. [ ] El QR/URL de grupo A muestra los 5 desafíos de A (y lo mismo B, C, D, E).
2. [ ] Al tocar "SUBIR FOTO" por primera vez, pide el nombre una sola vez.
3. [ ] Subís una foto al desafío 01 → queda guardada (revisá en `/admin`).
4. [ ] Ese desafío pasa a mostrar "✓ COMPLETADO" en ese celular.
5. [ ] El ranking muestra a esa persona con 1 punto.
6. [ ] Volver a intentar subir el mismo desafío 01 no suma un segundo punto
       (la tarjeta ya muestra completado, así que no debería ni dejarte reintentar;
       si igual lo forzás recargando, la base rechaza el duplicado).
7. [ ] Completar el desafío 02 sube el puntaje a 2.
8. [ ] Dos personas con nombres distintos, cada una sumando puntos por separado.
9. [ ] Personas de distintos grupos (A y B, por ejemplo) aparecen juntas en el mismo
       ranking.
10. [ ] Una foto grande de iPhone (HEIC) se sube sin error.
11. [ ] Cortá el wifi/datos a mitad de una subida: debe aparecer un mensaje claro y
        un botón "REINTENTAR" sin tener que elegir la foto de nuevo.
12. [ ] Tocar varias veces seguidas "ENVIAR MISIÓN" con conexión lenta no genera
        cargas duplicadas (el botón desaparece apenas empieza a subir).
13. [ ] `/admin` con la contraseña correcta muestra todas las cargas, permite
        filtrar por persona/grupo/desafío, y las fotos abren en tamaño completo al
        tocarlas.

## 8. Qué se dejó fuera a propósito

- **PWA / funcionamiento offline:** riesgo de cachear versiones viejas en medio del
  evento, mayor que el beneficio.
- **Login o cuentas de invitados:** pedido explícito de no tenerlo.
- **Bloqueo estricto de duplicados entre dispositivos:** no es técnicamente posible
  sin pedir registro, y no hacía falta para este caso de uso.
- **Selección de foto ganadora dentro de la app:** Dani & Wally pueden revisar todas
  las fotos en `/admin` y elegir manualmente; no se agregó lógica de premio.
