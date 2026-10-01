# Cómo está hecha "UNO Office Edition" — tutorial paso a paso

> Guía para **replicar la app desde cero** entendiendo el *porqué* de cada decisión.
> Se ha reconstruido leyendo el repositorio real (`thegrimor/Leaderboard-uno`): su `CLAUDE.md`,
> el frontend (`src/`) y el backend (`server/`). Los fragmentos de código son los del proyecto
> (a veces recortados). Al final hay una sección sobre **probarla en el móvil** y otra sobre
> **convertirla en "app" instalable (PWA)**, que es lo que preguntabas.
>
> La parte de PWA usa como ejemplo funcionando el repo hermano `matrizhammer`, que sí lo tiene
> configurado (por eso este fichero vive aquí): UNO todavía **no** es una PWA completa. Ver §9.

---

## Índice

0. [Qué es la app y mapa mental](#0-qué-es-la-app-y-mapa-mental)
1. [Herramientas que necesitas](#1-herramientas-que-necesitas)
2. [Paso 1 — Crear el proyecto](#2-paso-1--crear-el-proyecto)
3. [Paso 2 — Configuración: Vite, TypeScript, Tailwind, ESLint](#3-paso-2--configuración)
4. [Paso 3 — El backend (Express + Postgres)](#4-paso-3--el-backend-express--postgres)
5. [Paso 4 — El frontend: la base (cliente API y store)](#5-paso-4--el-frontend-la-base)
6. [Paso 5 — Un módulo completo: `partidas`](#6-paso-5--un-módulo-completo-partidas)
7. [Paso 6 — Las otras vistas y el esqueleto de la app](#7-paso-6--las-otras-vistas-y-el-esqueleto)
8. [Paso 7 — Probarla en el móvil en local](#8-paso-7--probarla-en-el-móvil-en-local)
9. [Paso 8 — Convertirla en "app" (PWA)](#9-paso-8--convertirla-en-app-pwa)
10. [Paso 9 — Desplegarla](#10-paso-9--desplegarla)
11. [Plan de trabajo para replicarla tú](#11-plan-de-trabajo-para-replicarla-tú)
12. [Errores típicos](#12-errores-típicos)
13. [Glosario](#13-glosario)

---

## 0. Qué es la app y mapa mental

Un tablero compartido para un grupo de amigos que juegan al UNO:

- **Jugadores**: alta, renombrar, borrar.
- **Partidas**: quién jugó, quién ganó, cartas comidas por cada uno, fecha y notas.
- **Ranking**: ordenado por victorias, con % de victorias y un "récord de cartas comidas".
- **Sin login**: cualquiera que abra la app puede cargar datos (decisión consciente: es para un
  grupo pequeño de confianza).

### Las tres piezas

```
 Móvil / navegador                 Servidor                    Base de datos
┌───────────────────┐  HTTP/JSON  ┌────────────────────┐  SQL  ┌──────────────┐
│ React (frontend)  │ ──────────▶ │ Node + Express     │ ────▶ │ PostgreSQL   │
│ pantallas, estado │ ◀────────── │ valida y consulta  │ ◀──── │ (los datos)  │
└───────────────────┘             └────────────────────┘       └──────────────┘
   carpeta src/                      carpeta server/
```

**La idea clave**: el móvil no guarda nada importante. Todo vive en Postgres. Por eso todos los
amigos ven lo mismo. (Esto es lo contrario de `matrizhammer`, que no tiene servidor y guarda en
`localStorage` del propio móvil.)

### Por qué este stack

| Pieza | Para qué | Por qué esta y no otra |
|---|---|---|
| **React 19** | Pintar pantallas a partir de datos | Estándar, mucha documentación |
| **Vite** | Servidor de desarrollo + empaquetador | Arranca al instante; sustituyó a Create React App |
| **TypeScript** | JavaScript con tipos | Te avisa de errores antes de ejecutar |
| **Tailwind v4** | Estilos con clases (`rounded-xl px-4`) | Sin ficheros CSS por componente |
| **Redux Toolkit** | Estado global (listas cargadas del servidor) | Patrón uniforme: un *slice* por módulo |
| **Express** | API HTTP en Node | Mínimo y conocido |
| **`pg` (sin ORM)** | Hablar con Postgres con SQL a mano | Menos magia; el ranking es una query SQL clara |

---

## 1. Herramientas que necesitas

1. **Node.js 22** (incluye `npm`). Comprueba con `node -v`.
2. **Git** y una cuenta de GitHub.
3. Un editor: **VS Code**.
4. **PostgreSQL**. Dos opciones:
   - *Local*: instalar Postgres (o `docker run -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres`).
   - *En la nube* (lo que usa el proyecto en producción): **Railway** con su plugin de Postgres.
     Para practicar, un Postgres gratuito de Neon/Supabase vale igual: solo necesitas la URL.
5. Un móvil en la **misma wifi** que el PC (para el §8).

---

## 2. Paso 1 — Crear el proyecto

```bash
npm create vite@latest uno-office-edition -- --template react-ts
cd uno-office-edition
npm install
```

Dependencias del frontend (las que usa el proyecto):

```bash
npm install @reduxjs/toolkit react-redux
npm install -D tailwindcss @tailwindcss/vite
```

Estructura final que vamos a construir (esto es lo que hay en el repo):

```
uno-office-edition/
├─ index.html
├─ vite.config.ts
├─ package.json
├─ src/
│  ├─ main.tsx · App.tsx · index.css
│  ├─ core/
│  │   ├─ api/client.ts          ← fetch genérico + errores
│  │   └─ store/{store,hooks}.ts ← Redux
│  ├─ modules/                   ← una carpeta por "funcionalidad"
│  │   ├─ jugadores/  partidas/  leaderboard/
│  │   │   ├─ components/  services/  types/  index.ts
│  └─ shared/components/         ← piezas reutilizables (Modal, TabBar, ConfirmModal)
└─ server/                       ← backend, su propio package.json
   └─ src/{index.js, db.js, asyncHandler.js, routes/*.js}
```

### Por qué "módulos" (DDD-lite)

En vez de agrupar por tipo (`components/`, `reducers/`, `api/` con todo mezclado), se agrupa por
**tema**: todo lo de partidas está en `modules/partidas`. Reglas del proyecto:

- Cada módulo tiene un `index.ts` (su "puerta"). **Solo se importa desde esa puerta**, nunca de
  carpetas internas: `import { fetchPlayers } from '@/modules/jugadores'`.
- Así puedes cambiar el interior de un módulo sin romper al resto.
- `@/` es un alias de `src/` (ver §3) para no escribir `../../../`.

---

## 3. Paso 2 — Configuración

### 3.1 `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
```

- `plugins`: React (JSX) y Tailwind.
- `alias`: hace que `@/core/...` apunte a `src/core/...`. **Hay que declararlo también en
  `tsconfig.app.json`** (`"paths": { "@/*": ["src/*"] }`) o TypeScript no lo entenderá.
- **`proxy` (importante)**: en desarrollo el frontend corre en `:5173` y el backend en `:8787`.
  Si el navegador llamara directamente a otro puerto, saltaría **CORS** (el navegador bloquea
  peticiones entre orígenes distintos). Con el proxy, el frontend llama a `/api/...` (mismo
  origen) y *Vite* reenvía esa petición al backend. El navegador nunca se entera.

### 3.2 Tailwind v4 (`src/index.css`)

En la v4 no hay `tailwind.config.js`: se configura en el propio CSS.

```css
@import "tailwindcss";

@theme {
  --color-uno-red: #e8412c;
  --color-uno-yellow: #f5b722;
  --color-uno-green: #1f9e5c;
  --color-uno-blue: #1f6fd6;
  --color-surface: #0d0f14;     /* fondo */
  --color-surface-3: #191d27;   /* tarjetas */
  --color-ink: #f2f0ea;         /* texto */
  --color-ink-dim: #9aa0ad;     /* texto apagado */
  --color-rim: #262b38;         /* bordes */
  --font-display: 'Poppins', sans-serif;
}
```

Cada variable `--color-xxx` crea automáticamente clases: `bg-uno-blue`, `text-ink-dim`,
`border-rim`, etc. Así la paleta de las cartas del UNO queda en **un solo sitio**.

Las fuentes (Poppins/Inter) se cargan desde Google Fonts con un `<link>` en `index.html`.

### 3.3 `index.html` — lo que importa para el móvil

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#0d0f14" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="UNO Office Edition" />
```

- `viewport`: sin esto el móvil enseña la web "encogida" como si fuera un PC. `viewport-fit=cover`
  permite usar toda la pantalla (incluida la zona del notch).
- `theme-color`: color de la barra del navegador en el móvil.
- `apple-mobile-web-app-*`: hacen que en iPhone, al añadirla a la pantalla de inicio, se abra
  sin la barra de Safari. Detalle en §9.

### 3.4 TypeScript estricto

El proyecto usa `strict`, prohíbe `any` y activa `erasableSyntaxOnly` (no `enum`, no
parámetros-propiedad en clases). Consecuencia práctica: los tipos se escriben con `interface` y
uniones de strings (`'idle' | 'loading' | 'succeeded' | 'error'`) en lugar de enums.

### 3.5 Scripts (`package.json`)

```json
"scripts": {
  "dev": "vite",
  "movil": "vite --host",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "server": "npm run dev --prefix server",
  "server:install": "npm install --prefix server",
  "server:start": "npm start --prefix server"
}
```

`--prefix server` ejecuta el comando dentro de la carpeta `server/` sin hacer `cd`.
`movil` es `vite --host`: abre el servidor a toda tu red (§8).

---

## 4. Paso 3 — El backend (Express + Postgres)

Es un proyecto Node **aparte** dentro de `server/` con su `package.json`:

```bash
mkdir server && cd server
npm init -y
npm install express cors pg
```

`server/package.json` clave:

```json
{
  "type": "module",
  "scripts": {
    "start": "node --env-file-if-exists=.env src/index.js",
    "dev":   "node --env-file-if-exists=.env --watch src/index.js"
  }
}
```

- `"type": "module"` → puedes usar `import`/`export`.
- `--env-file-if-exists=.env` → Node carga las variables de `server/.env` sin instalar `dotenv`.
- `--watch` → reinicia el servidor al guardar un archivo.

### 4.1 Variables de entorno (`server/.env`, no se sube a git)

```
DATABASE_URL=postgres://usuario:password@localhost:5432/leaderboard_uno
CORS_ORIGIN=
PORT=8787
```

Se copia desde `server/.env.example` (ese sí está en git, como plantilla). `.gitignore` excluye
`.env` para no filtrar contraseñas.

### 4.2 `db.js` — la conexión y el esquema

Tres tablas:

```
players          matches            match_players  (tabla puente, N jugadores por partida)
─────────        ───────────        ─────────────────────────────────────────
id (PK)          id (PK)            match_id  → matches(id)  ON DELETE CASCADE
name             played_at          player_id → players(id)  ON DELETE CASCADE
created_at       notes              is_winner
                 created_at         cards_eaten
```

Por qué una **tabla puente**: una partida tiene 2..N jugadores y un jugador está en muchas
partidas (relación muchos-a-muchos). `match_players` guarda *quién jugó qué partida* y los datos
propios de esa participación (¿ganó?, ¿cuántas cartas se comió?).

Puntos de diseño que verás en el código y conviene entender:

1. **`CREATE TABLE IF NOT EXISTS` al arrancar** (`migrate()`): no hay herramienta de migraciones.
   El servidor crea las tablas si faltan. Sencillo para un proyecto pequeño.
2. **Evolucionar el esquema sin romper producción**: `cards_eaten` se añadió después con
   `ALTER TABLE match_players ADD COLUMN IF NOT EXISTS cards_eaten INTEGER`. No se recrea la tabla
   porque ya había datos reales.
3. **Una columna muerta, a propósito**: `score` ya no se usa pero no se hace `DROP`, para no
   perder datos históricos. (Regla práctica: borrar datos es irreversible, dejarlos no cuesta nada.)
4. **IDs `TEXT`** generados con `crypto.randomUUID()` en vez de `SERIAL`: más simple de crear y
   no se pueden adivinar secuencialmente.
5. **SSL**: Railway exige SSL con certificado autofirmado, así que se activa con
   `rejectUnauthorized: false`, salvo si la URL es `localhost`.
6. **`pool.on('error', ...)`**: si Postgres reinicia, una conexión *inactiva* emite un evento
   `error`; sin listener Node mataría todo el proceso. Con el listener solo lo registra.
7. **`export const ready = migrate()`**: una promesa que `index.js` espera (`await dbReady`)
   antes de aceptar peticiones, para que la primera petición nunca llegue antes de que existan
   las tablas.

El objeto `store` agrupa todas las consultas (`listPlayers`, `createMatch`, `leaderboard`...).
Las rutas **no escriben SQL**: llaman a `store.algo()`. Así el SQL está en un solo fichero.

#### Una transacción: crear una partida

```js
async createMatch(match) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('INSERT INTO matches ...')
    for (const player of match.players) {
      await client.query('INSERT INTO match_players ...')
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
```

Una partida son **varias filas** (1 en `matches` + N en `match_players`). Con `BEGIN/COMMIT`
o se guardan todas o ninguna: si falla la 3ª inserción, `ROLLBACK` deshace las anteriores y no
quedan partidas "a medias".

#### El ranking es una query, no una tabla

```sql
SELECT p.id, p.name,
  COUNT(mp.match_id)                              AS matches_played,
  COUNT(mp.match_id) FILTER (WHERE mp.is_winner)  AS wins,
  COALESCE(SUM(mp.cards_eaten), 0)                AS total_cards_eaten
FROM players p
LEFT JOIN match_players mp ON mp.player_id = p.id
GROUP BY p.id, p.name
ORDER BY wins DESC, matches_played DESC, lower(p.name) ASC
```

- `LEFT JOIN`: un jugador sin partidas sigue saliendo (con 0), en vez de desaparecer.
- `COUNT(...) FILTER (WHERE ...)`: cuenta solo las filas que cumplen la condición (victorias).
- El ranking se **recalcula en cada petición**. No hay que mantener una tabla de ranking
  sincronizada: con pocos datos es instantáneo y no puede desincronizarse.
- Postgres devuelve los `COUNT` como texto/bigint → el código hace `Number(...)`.
- Decisión de producto: se ordena por **victorias absolutas**, no por Elo; es más fácil de
  entender entre amigos. Si algún día quieres otra métrica, **solo cambias esta query**.

### 4.3 `asyncHandler.js`

```js
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
```

Express 4 **no captura** errores de funciones `async`: si `await store.x()` falla, la petición
se queda colgada. Este envoltorio reenvía el error a `next(err)`, que cae en el middleware de
errores. Todas las rutas se escriben como `asyncHandler(async (req, res) => {...})`.

### 4.4 Rutas (`routes/players.js`, `matches.js`, `leaderboard.js`)

API final:

| Método y ruta | Qué hace |
|---|---|
| `GET /api/players` | lista de jugadores |
| `POST /api/players` | crea (`{name}`); 409 si el nombre ya existe (sin distinguir mayúsculas) |
| `PATCH /api/players/:id` | renombra |
| `DELETE /api/players/:id` | borra (el `CASCADE` quita sus filas de `match_players`; las partidas de los demás se conservan) |
| `GET /api/matches` | historial |
| `POST /api/matches` | crea partida con jugadores, cartas comidas y ganador |
| `DELETE /api/matches/:id` | borra |
| `GET /api/leaderboard` | ranking + récord de cartas |
| `GET /api/health` | comprueba que Postgres responde (para el healthcheck de Railway) |

**La validación vive en el servidor**, aunque el formulario ya valide. Nunca te fíes del
frontend: cualquiera puede mandar un `POST` a mano. En `matches.js`, `validateMatchPlayers`
exige: ≥ 2 jugadores, sin repetidos, `cardsEaten` ≥ 0 si viene, y **exactamente un ganador**.
Devuelve `400` con `{ error: 'mensaje en español' }`, y el frontend enseña ese mensaje tal cual.

Códigos HTTP usados: `201` creado, `204` borrado sin cuerpo, `400` datos inválidos,
`404` no existe, `409` conflicto (nombre duplicado).

### 4.5 `index.js` — montar todo

Orden de lo que hace:

1. Lee `CORS_ORIGIN` (lista separada por comas; admite `*.netlify.app` para las previews).
2. `app.use(cors(...))` y `app.use(express.json({ limit: '1mb' }))` (sin esto `req.body` es `undefined`).
3. `/api/health` y las tres rutas.
4. **Si existe `dist/`** (el frontend compilado), lo sirve con `express.static` y devuelve
   `index.html` para cualquier ruta que no sea `/api/...`. Así un único servicio puede servir
   frontend y API. Si el frontend está desplegado aparte, ese bloque simplemente no se ejecuta.
5. Middleware de errores final → `500 { error: 'Error interno del servidor.' }`.
6. `await dbReady` y `app.listen(PORT, '0.0.0.0')`. `0.0.0.0` = escuchar en todas las
   interfaces (necesario en contenedores/Railway).

**Pruébalo antes de hacer el frontend**:

```bash
npm run server:install
# crea server/.env con tu DATABASE_URL
npm run server
curl http://localhost:8787/api/health          # {"status":"ok"}
curl -X POST localhost:8787/api/players -H 'Content-Type: application/json' -d '{"name":"Ana"}'
```

---

## 5. Paso 4 — El frontend: la base

### 5.1 `core/api/client.ts` — un único sitio para hablar con el servidor

```ts
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`

export class ApiError extends Error { status: number; /* ... */ }

export async function apiFetch<T>(path: string, options = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { method, headers: {...}, body: JSON.stringify(body) })
  if (res.status === 204) return undefined as T
  const payload = isJson ? await res.json() : undefined
  if (!res.ok) throw new ApiError(res.status, payload?.error ?? `Error ${res.status}`)
  return payload as T
}
```

Por qué existe:
- Pone `Content-Type: application/json` y hace `JSON.stringify` **una vez**, no en cada llamada.
- Convierte los errores HTTP en excepciones `ApiError` con el mensaje del servidor (el `fetch`
  nativo *no* lanza error con un 400/500; solo cuando no hay red).
- `<T>` es un **genérico**: `apiFetch<{ players: Player[] }>('/players')` devuelve tipado.
- `VITE_API_BASE_URL`: vacío en local/si el backend sirve el frontend (rutas relativas →
  proxy de Vite); con valor cuando el frontend está en otro dominio (§10). Las variables que
  empiezan por `VITE_` se **incrustan en el build**; las demás no existen en el navegador.

### 5.2 `core/store/store.ts` y `hooks.ts`

```ts
export const store = configureStore({
  reducer: { jugadores: jugadoresReducer, partidas: partidasReducer, leaderboard: leaderboardReducer },
})
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

```ts
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector = <T>(selector: (state: RootState) => T) => useSelector(selector)
```

Los hooks tipados evitan escribir los tipos en cada componente. `main.tsx` envuelve la app en
`<Provider store={store}>` para que cualquier componente pueda leer el estado.

---

## 6. Paso 5 — Un módulo completo: `partidas`

Los tres módulos siguen **el mismo patrón**. Si entiendes uno, entiendes los tres.
Cada módulo tiene 4 capas, de abajo arriba:

```
types/partidasTypes.ts      → las "formas" de los datos (interfaces)
services/partidasApi.ts     → funciones que llaman al backend (usa apiFetch)
services/partidasSlice.ts   → estado Redux + thunks (usa la api)
components/*.tsx            → pantallas (usan el slice con los hooks)
index.ts                    → lo que el resto de la app puede importar
```

### 6.1 Tipos

```ts
export interface MatchPlayerEntry { playerId: string; playerName: string; cardsEaten: number | null; isWinner: boolean }
export interface Match { id: string; playedAt: string; notes: string | null; createdAt: string; players: MatchPlayerEntry[] }
export interface PartidasState { items: Match[]; status: 'idle' | 'loading' | 'succeeded' | 'error'; error: string | null }
```

Fíjate en que `Match` coincide con lo que devuelve el JSON del servidor. Primero piensa el
modelo de datos; el resto se deduce de él.

### 6.2 API

```ts
export const partidasApi = {
  list:   () => apiFetch<{ matches: Match[] }>('/matches'),
  create: (input: NewMatchInput) => apiFetch<{ match: Match }>('/matches', { method: 'POST', body: input }),
  remove: (id: string) => apiFetch<void>(`/matches/${id}`, { method: 'DELETE' }),
}
```

### 6.3 Slice con thunks

Un **thunk** (`createAsyncThunk`) es una acción asíncrona: lanza la petición y Redux genera
automáticamente tres estados: `pending`, `fulfilled`, `rejected`. El slice reacciona a cada uno:

```ts
export const fetchMatches = createAsyncThunk('partidas/fetch', async () => {
  const { matches } = await partidasApi.list()
  return matches
})

builder
  .addCase(fetchMatches.pending,   s => { s.status = 'loading'; s.error = null })
  .addCase(fetchMatches.fulfilled, (s, a) => { s.status = 'succeeded'; s.items = a.payload })
  .addCase(fetchMatches.rejected,  s => { s.status = 'error'; s.error = 'No se pudo cargar...' })
```

- Dentro de los reducers de Redux Toolkit puedes "mutar" (`s.items = ...`, `s.items.push(...)`):
  por debajo usa **Immer** y produce un estado nuevo inmutable. Fuera del reducer, nunca mutes.
- `addMatch` usa `rejectWithValue(errorMessage(err))` para que el **mensaje del servidor**
  (`"La partida debe tener exactamente un ganador."`) llegue a `action.payload` y el formulario
  lo muestre.
- Tras crear una partida se hace `items.push(...)` y se reordena por fecha. La lista se actualiza
  **sin volver a pedirla**. (El ranking sí se refresca cada vez que entras en su pestaña.)

### 6.3.1 Patrón de los estados de carga

Cada vista decide qué mostrar con `status`:
`loading` y sin datos → "Cargando…" · `error` → caja roja con el mensaje · lista vacía →
mensaje "Todavía no hay…" · datos → la lista. Cuatro casos que conviene cubrir siempre.

### 6.4 La vista (`PartidasView`)

```tsx
const { items, status, error } = useAppSelector(state => state.partidas)

useEffect(() => {
  dispatch(fetchMatches())
  dispatch(fetchPlayers())     // la vista de partidas necesita también los jugadores (para el formulario)
}, [dispatch])
```

- `useEffect` al montar: pide los datos al abrir la pestaña.
- `fetchPlayers` se importa de `@/modules/jugadores` (la puerta del otro módulo).
- El **filtro por fechas** (Desde/Hasta) es *client-side*: se filtra con `useMemo` sobre los
  datos ya cargados, sin pedir nada al servidor. `useMemo` evita recalcular si no cambian
  `items` ni las fechas. Las fechas se comparan como texto `AAAA-MM-DD` (se ordenan bien así).

### 6.5 El formulario (`AddMatchModal`)

Estado local con `useState` (no Redux: es efímero, solo importa mientras el modal está abierto):

- `selected: Set<string>` → jugadores marcados.
- `cardsEaten: Record<string, string>` → cartas por jugador, **como texto** (es lo que da un
  `<input>`); se convierte a `Number` o `null` al enviar.
- `winnerId` → el ganador, con `<input type="radio">`. Si desmarcas al ganador, se limpia.
- Validación en cliente (≥ 2 jugadores, ganador marcado) para dar feedback inmediato, **más** la
  del servidor como red de seguridad.
- `await dispatch(addMatch(...))` devuelve el resultado; `addMatch.fulfilled.match(result)` es un
  *type guard* para saber si salió bien → cierra el modal; si no, enseña `result.payload`.
- La fecha se manda como `new Date(`${playedAt}T12:00:00`)` — a las 12:00 para que el cambio de
  zona horaria no mueva la partida al día anterior/siguiente.

### 6.6 `Modal` con portal

```tsx
export function Modal({ children }) { return createPortal(children, document.body) }
```

Un modal `fixed` dentro de `<main>` puede quedar atrapado por el *stacking context* de sus
padres (z-index). El portal lo pinta directamente en `document.body`, fuera de ese lío.

---

## 7. Paso 6 — Las otras vistas y el esqueleto

- **`jugadores`**: mismo patrón (slice + `AddPlayerForm` + `PlayerCard` con renombrar/borrar y
  `ConfirmModal` antes de borrar). `PlayerCard` muestra estadísticas leyéndolas del slice del
  *leaderboard* (`stats?: LeaderboardEntry`): no se duplica el cálculo, se reutiliza.
- **`leaderboard`**: solo lectura (`fetchLeaderboard`), `LeaderboardTable` y el banner del récord.
- **`TabBar`**: barra inferior fija con 3 pestañas. Lleva `pb-[env(safe-area-inset-bottom)]`
  para no quedar tapada por la barra de gestos del iPhone.

### `App.tsx`: navegación sin router

```tsx
const VIEWS: Record<TabId, React.ComponentType> = {
  leaderboard: LeaderboardView, partidas: PartidasView, jugadores: JugadoresView,
}
const [activeTab, setActiveTab] = useState<TabId>('leaderboard')
const ActiveView = VIEWS[activeTab]
// ...
<ActiveView />
<TabBar active={activeTab} onChange={setActiveTab} />
```

Con 3 pestañas fijas **no hace falta React Router**: un `useState` con el id activo basta
(`matrizhammer`, que tiene URLs por evento y ronda, sí lo usa). Contrapartida: no hay URL por
pestaña, el botón "atrás" del móvil no cambia de pestaña. Para esta app es aceptable.

`min-h-dvh` (en vez de `vh`) y `pb-24` en `<main>` evitan que la barra inferior tape contenido y
que la barra del navegador móvil rompa la altura.

---

## 8. Paso 7 — Probarla en el móvil en local

Objetivo: ver tu app en el móvil **sin desplegar nada**, mientras desarrollas.

1. Móvil y PC en la **misma wifi**.
2. Arranca el backend: `npm run server`.
3. Arranca el frontend **abierto a la red**: `npm run movil` (= `vite --host`).
   Vite imprimirá algo así:
   ```
   ➜  Local:   http://localhost:5173/
   ➜  Network: http://192.168.1.34:5173/
   ```
4. En el móvil abre la URL **Network** (`http://192.168.1.34:5173`).

Por qué funciona sin tocar el backend: el móvil llama a `/api/...` a **Vite** (192.168.1.34:5173)
y es *Vite, desde el PC,* quien lo reenvía a `localhost:8787` gracias al proxy. El móvil no
necesita conocer el puerto 8787.

Si no carga:
- **Firewall del PC** (Windows): permite Node.js en red privada o abre el puerto 5173.
- Comprueba que la IP es la de tu PC en esa wifi (`ipconfig` en Windows, `ifconfig`/`ip a` en
  Linux/Mac) y que la wifi no tiene "aislamiento de clientes" (típica de redes de invitados).
- Es **HTTP**, no HTTPS. Para ver la web va bien, pero **un service worker (PWA) no se
  registra** así (ver §9.5).
- Truco para depurar: con el móvil Android conectado por USB, `chrome://inspect` en Chrome del PC;
  en iPhone, Safari de Mac → Desarrollar.

También puedes probar el aspecto móvil sin móvil: F12 en Chrome → icono de dispositivo
(*Toggle device toolbar*).

---

## 9. Paso 8 — Convertirla en "app" (PWA)

### 9.1 Qué es una PWA (la respuesta corta a "¿cómo se hace una app que no sea una URL?")

Una **PWA** (*Progressive Web App*) es una web normal a la que le añades dos cosas:

1. Un **`manifest`**: un JSON que dice "me llamo X, mi icono es Y, ábreme a pantalla completa".
2. Un **service worker**: un script que el navegador ejecuta en segundo plano y que puede
   guardar los ficheros de la app en caché para que abra rápido y hasta sin conexión.

Con eso, el navegador ofrece **"Instalar app" / "Añadir a pantalla de inicio"**: aparece un icono
en el móvil, se abre **sin barra de direcciones** (modo `standalone`) y se comporta como una app,
pero sigue siendo tu misma web. No pasa por Play Store/App Store. Es gratis y sin cuentas de
desarrollador.

### 9.2 Estado actual de UNO vs `matrizhammer`

| | UNO Office Edition | matrizhammer |
|---|---|---|
| Meta tags `apple-mobile-web-app-*` | ✅ | ✅ |
| `manifest` con iconos | ❌ | ✅ |
| Service worker (offline) | ❌ | ✅ (`vite-plugin-pwa`) |
| Iconos PNG (192, 512, maskable, apple-touch) | ❌ (solo `favicon.svg`) | ✅ en `public/icons/` |

Es decir: en UNO, en **iPhone** "Añadir a pantalla de inicio" ya la abre a pantalla completa
(gracias a los meta tags) pero con un icono genérico; en **Android/Chrome** no ofrecerá instalar
como app completa hasta que exista el manifest. Abajo se explica cómo completarlo.

### 9.3 Cómo se configura (receta, usando `vite-plugin-pwa`)

**1) Instalar**

```bash
npm install -D vite-plugin-pwa
```

**2) Crear los iconos** y ponerlos en `public/icons/`:

| Fichero | Tamaño | Para qué |
|---|---|---|
| `icon-192.png` | 192×192 | icono estándar |
| `icon-512.png` | 512×512 | pantalla de carga/instalación |
| `icon-maskable-512.png` | 512×512 | Android recorta el icono (círculo, squircle…): deja el dibujo en el ~80 % central ("zona segura") |
| `apple-touch-icon.png` | 180×180 | iPhone (Safari ignora los iconos del manifest) |

Se pueden generar desde un SVG con herramientas como realfavicongenerator.net o PWA Asset Generator.

**3) Configurar `vite.config.ts`** (este bloque es el real de `matrizhammer`, adaptado a UNO):

```ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'UNO Office Edition',
        short_name: 'UNO',
        description: 'Registro de partidas de UNO y ranking.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#0d0f14',
        background_color: '#0d0f14',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png}'],
        // ⚠️ SOLO UNO (tiene backend): que el service worker NO intercepte la API
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  // ...
})
```

Qué hace cada campo del manifest:

- `name` / `short_name`: nombre completo y el corto bajo el icono.
- `display: 'standalone'`: sin barra del navegador (otras: `fullscreen`, `minimal-ui`, `browser`).
- `start_url` / `scope`: qué URL abre el icono y qué rutas pertenecen a la app.
- `theme_color`: color de la barra de estado; `background_color`: color de la pantalla de arranque.
- `id`: identidad estable de la app (para que cambiar `start_url` no la duplique).
- `icons` con `purpose: 'maskable'`: ver tabla de arriba.

**4) Registrar el service worker** en `src/main.tsx`:

```ts
import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })
```

Y en `tsconfig.app.json`, añadir a `types` el de PWA para que TypeScript conozca ese módulo
virtual: `"types": ["vite/client", "vite-plugin-pwa/client"]`.

**5) Construir y probar**: el service worker **solo se genera en el build**, no en `npm run dev`.

```bash
npm run build
npm run preview        # sirve dist/ en :4173
```

En Chrome: F12 → pestaña **Application** → *Manifest* (¿iconos OK?) y *Service Workers*
(¿activado?). Lighthouse → categoría PWA también te dice qué falta.

### 9.4 Cómo funciona por dentro (lo que preguntabas: "¿y cómo funciona eso?")

1. En `npm run build`, el plugin genera `manifest.webmanifest` y un `sw.js`. Este último
   contiene la **lista de todos tus ficheros con un hash** (*precache*, vía Workbox).
2. En la primera visita, el navegador instala el service worker y **descarga todos esos ficheros
   a una caché**.
3. En las siguientes aperturas, el SW responde desde la caché: la app abre al instante aunque no
   haya red.
4. **Actualizaciones** (`registerType: 'autoUpdate'`): cada vez que abres la app el navegador
   comprueba si `sw.js` cambió. Si hay versión nueva, la descarga, la activa y recarga. Como los
   nombres de fichero llevan hash, solo se bajan los que cambiaron.
5. `runtimeCaching` (en `matrizhammer`, para las fuentes de Google) define reglas para recursos
   *externos* al build, p. ej. `StaleWhileRevalidate`: sirve lo cacheado y lo refresca en
   segundo plano.

**Importante para UNO**: la caché guarda **la app (HTML/JS/CSS), no los datos**. Los datos vienen
de `/api/...` y esa petición no debe cachearse (por eso el `navigateFallbackDenylist`). Sin conexión,
la app *abrirá* pero mostrará los errores de "No se pudo cargar…" porque no llega al servidor.
`matrizhammer` no tiene ese problema porque sus datos están en `localStorage`, en el propio
dispositivo. Hacer que UNO funcione 100 % offline sería otro proyecto (cola de peticiones
pendientes, IndexedDB, sincronización).

### 9.5 Requisito: HTTPS

Los service workers **solo funcionan en HTTPS** (o `localhost`). Por eso:

- Por IP de tu wifi (`http://192.168.1.34:5173`) **no** se registra el SW → no puedes probar la
  PWA completa así. Para probar en el móvil usa la versión **desplegada** (Netlify da HTTPS
  automático), o un túnel (`cloudflared tunnel`, `ngrok`), o `chrome://inspect` con
  reenvío de puertos para que el móvil vea tu `localhost`.

### 9.6 Cómo se instala en el móvil

- **Android (Chrome)**: menú ⋮ → *Instalar aplicación* (o aparece un aviso automático). El icono
  sale en el cajón de apps.
- **iPhone (Safari)**: botón *Compartir* → *Añadir a pantalla de inicio*. Debe ser **Safari** (en
  iOS los demás navegadores usan el mismo motor pero no siempre muestran esta opción). Usa
  `apple-touch-icon.png` y los meta tags `apple-mobile-web-app-*` del `index.html`.
- Para el resto de tu grupo: les pasas la URL y que la instalen igual.

### 9.7 Si algún día quieres una app "de tienda"

| Opción | Qué es | Cuándo |
|---|---|---|
| **PWA** (lo anterior) | tu web instalable | primera opción: gratis, sin tiendas |
| **Capacitor** | envuelve tu web en una app nativa Android/iOS (`.apk`/`.ipa`) | si necesitas publicar en Play Store/App Store o APIs nativas (notificaciones push nativas, etc.). iOS exige cuenta Apple Developer (de pago) |
| **TWA** (Trusted Web Activity) | publica tu PWA en Play Store sin envoltorio extra | solo Android |

Para el uso de un grupo de amigos, la PWA es más que suficiente.

---

## 10. Paso 9 — Desplegarla

Dos formas válidas. UNO está preparada para ambas.

### Opción A — Un solo servicio (la más simple)

Un servicio en Railway que construye el frontend y arranca Express, que sirve `dist/` + la API
(el bloque `fs.existsSync(DIST_DIR)` de `index.js`). Mismo origen → no hace falta CORS ni
`VITE_API_BASE_URL`.

### Opción B — Frontend y backend separados (lo que documenta el repo)

- **Backend → Railway**: añade el plugin Postgres, y en las *Variables* del servicio:
  `DATABASE_URL` (referencia `${{Postgres.DATABASE_URL}}`) y `CORS_ORIGIN`
  (`https://tu-app.netlify.app,*.netlify.app`). En *Settings → Deploy* pon el Healthcheck Path
  en `/api/health`. Railway define `PORT` solo.
- **Frontend → Netlify**: build `npm run build`, publicar `dist`. Variable
  `VITE_API_BASE_URL=https://tu-backend.up.railway.app` (se incrusta en el build, ¡hay que
  re-desplegar si la cambias!).
- Si usas **React Router** (como `matrizhammer`) necesitas `public/_redirects` con
  `/*  /index.html  200`, o recargar una ruta profunda da 404. UNO no lo necesita (no tiene rutas).
- Netlify da **HTTPS gratis** → la PWA ya funciona.

Con esto, `CORS_ORIGIN` explica el porqué del código `originAllowed` en `index.js`: el navegador
bloquea al frontend de Netlify si Railway no le da permiso explícito.

---

## 11. Plan de trabajo para replicarla tú

Ve en este orden; cada paso se puede probar solo.

1. **Proyecto + Tailwind + una pantalla estática** con datos inventados (no pasa nada si aún no
   hay backend). Que se vea bien en el móvil (F12 modo dispositivo).
2. **Backend mínimo**: Express con `GET /api/health` y Postgres conectado. `curl` para probar.
3. **Jugadores de punta a punta**: tabla `players`, rutas, `jugadoresApi`, slice, vista. Es el
   módulo más simple; aquí aprendes el patrón completo.
4. **Partidas**: tablas `matches` y `match_players`, la transacción, el modal. Es lo más difícil.
5. **Ranking**: la query SQL y su vista.
6. **Pulido**: estados vacíos/de carga/error, confirmación de borrado, filtro por fechas.
7. **Probar en el móvil** (§8).
8. **Desplegar** (§10) y, después, **PWA** (§9).
9. Por último, *reglas de equipo*: lint (`npm run lint`), `npm run build` sin errores.

**Ejercicios para afianzar** (de fácil a difícil): mostrar "racha de victorias"; editar una
partida (`PATCH /api/matches/:id`); estadística "cartas comidas por partida" en el ranking; que la
PWA muestre un aviso "sin conexión"; añadir login simple (ver `cogitador-consulta`).

### Cómo trabajar con Claude Code en un proyecto como este

El fichero `CLAUDE.md` del repo es la "memoria" del proyecto: stack, estructura, decisiones y
reglas de comportamiento (p. ej. *no hacer commit sin que lo pidas*, *consultar antes de tocar otro
módulo*). Si replicas el proyecto, crea el tuyo desde el primer día y **actualízalo cuando
cambie algo importante**: es lo que permite retomar el trabajo meses después sin reexplicar todo.

---

## 12. Errores típicos

| Síntoma | Causa probable |
|---|---|
| El servidor no arranca: "DATABASE_URL no está definida" | falta `server/.env` |
| `ECONNREFUSED` en el frontend / 500 en `/api/...` | backend apagado, o proxy apunta a otro puerto |
| Error de CORS en producción | `CORS_ORIGIN` no incluye el dominio del frontend |
| En el móvil no carga la web | no usaste `npm run movil` (`--host`), o el firewall del PC |
| Funciona en el PC pero en el móvil las llamadas a la API fallan | `VITE_API_BASE_URL` apuntando a `localhost` (en el móvil `localhost` es *el propio móvil*) |
| Un cambio de `VITE_...` no se nota | las variables `VITE_` se incrustan en el **build**: reconstruir |
| `Cannot find module '@/...'` | alias en `vite.config.ts` pero no en `tsconfig.app.json` (o al revés) |
| La PWA no ofrece instalarse | falta manifest/iconos, o no estás en HTTPS |
| Después de desplegar sigues viendo la versión vieja | service worker cacheando; recarga forzada o cerrar y reabrir la app (con `autoUpdate` se actualiza solo en la siguiente carga) |
| Peticiones a la API devuelven el `index.html` | el service worker/redirect está capturando `/api`; revisa `navigateFallbackDenylist` |
| `req.body` es `undefined` | falta `express.json()` o no mandas `Content-Type: application/json` |
| Una petición `async` se queda colgada | falta `asyncHandler` |

---

## 13. Glosario

- **SPA**: *Single Page Application*; una sola página HTML que cambia su contenido con JavaScript.
- **Slice**: porción del estado de Redux con sus reducers (`jugadores`, `partidas`, `leaderboard`).
- **Thunk**: acción asíncrona de Redux (`createAsyncThunk`); emite `pending/fulfilled/rejected`.
- **Reducer**: función que, dado el estado y una acción, devuelve el estado nuevo.
- **Proxy (Vite)**: reenvía `/api` al backend en desarrollo para evitar CORS.
- **CORS**: mecanismo del navegador que bloquea peticiones entre dominios distintos salvo permiso.
- **Tabla puente**: tabla que une dos entidades en una relación muchos-a-muchos.
- **Transacción**: grupo de operaciones SQL que se aplican todas o ninguna.
- **PWA**: web instalable (manifest + service worker + HTTPS).
- **Service worker**: script en segundo plano del navegador; gestiona caché y modo offline.
- **Manifest**: JSON con nombre, iconos y modo de visualización de la app.
- **Maskable icon**: icono pensado para que Android lo recorte en distintas formas.
- **Precache (Workbox)**: descargar de antemano los ficheros de la app para uso offline.
- **Build**: `npm run build` → carpeta `dist/` con el código optimizado listo para desplegar.
