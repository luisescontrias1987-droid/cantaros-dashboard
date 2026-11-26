# Despliegue en Vercel — Dashboard Cántaros (React)

> La app viva hoy es la versión de un solo archivo (`vercel-app/index.html`,
> desplegada como `cantaros-dashboard`). Esta versión React **no está
> desplegada**: este documento explica cómo ponerla en su lugar cuando Joms
> lo pida. No se toca nada de la app viva hasta ese momento.

## 1. Preparar el repositorio

El proyecto vive en `~/workspace/goals/restaurant-sales-dashboard/react-app/`.
Para desplegarlo hay que subirlo al repositorio de GitHub
[`cantaros-dashboard`](https://github.com/luisescontrias1987-droid/cantaros-dashboard)
(rama `main`; Vercel auto-despliega con cada push a `main`).

Hay dos opciones:

- **Opción A (recomendada): reemplazar el contenido del repo por este
  proyecto React.** El `index.html` actual y `api/config.js` quedan
  reemplazados por los de este proyecto (el `api/config.js` de aquí es una
  copia exacta del actual, así que la función serverless no cambia).
- **Opción B: desplegarlo como proyecto Vercel nuevo** (otro dominio) y
  dejar la app actual viva en paralelo para comparar. En ese caso se crea
  un proyecto nuevo en Vercel importando el mismo repo desde una rama o
  carpeta distinta, o un repo nuevo con este contenido.

> La cuenta de GitHub `luisescontrias1987-droid` **no acepta inicio de
> sesión con contraseña** (GitHub responde "This account does not support
> password sign-in"). La subida se hace entrando con Google y pasando el
> código de verificación de dispositivo en el chat, como en los despliegues
> anteriores.

## 2. Configuración del proyecto en Vercel

- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Install command:** `npm install` (por defecto)
- **Root directory:** la raíz del proyecto React (si se usa la Opción A,
  la raíz del repo).

## 3. Variables de entorno

En Vercel → proyecto → Settings → Environment Variables, crear estas dos
variables como tipo **Config** (Vercel rechaza el tipo Secret para las
`NEXT_PUBLIC_*`), marcadas para **Production + Preview**:

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://kqoyjcqtevoblnizgvzh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | la llave publicable de Supabase (empieza por `sb_publishable_`) |

> Nunca usar la llave secreta (`service_role`) aquí: la llave publicable
> es la única que va en la app. Son las mismas variables que ya usa la app
> viva hoy.

## 4. La función `api/config.js`

El proyecto incluye `api/config.js`: una función serverless de Vercel que
lee esas dos variables de entorno y devuelve `{ url, anonKey }` al
navegador. La app nunca guarda la llave en el código: al cargar, pide
`/api/config` y con eso habla a Supabase por PostgREST.

No hay que tocarla: es una copia exacta de la que ya está en producción.

## 5. Despliegue

1. Subir el proyecto al repo (ver paso 1).
2. Vercel detecta el push a `main` y construye automáticamente
   (`npm install` → `npm run build` → publica `dist/`).
3. Verificar en el dominio del proyecto:
   - Pide el **PIN 2026** al abrir.
   - Arriba debe decir **"En vivo · Supabase"** (sin banner rojo).
   - El panel debe mostrar la **Semana 45 · 2–8 nov 2026** con venta neta
     **$36,455.55**, margen **70.9% ($25,815.23)**, **439 unidades** y
     **58 productos**.
   - Probar en móvil (390px): sin scroll horizontal, barra inferior con
     5 íconos y KPIs en 2 columnas.

## 6. Volver atrás

Si algo falla, el despliegue anterior sigue disponible en Vercel →
Deployments → el deployment previo → **Promote to Production**. Y la app
de un solo archivo (`vercel-app/index.html`) sigue intacta en el equipo
local.

## 7. PWA

El proyecto incluye manifest (`public/manifest.webmanifest`, generado por
`vite-plugin-pwa`) e iconos 192/512. En el móvil, desde el navegador, se
puede elegir "Agregar a pantalla de inicio" para instalarlo como app.
El service worker cachea la app y usa NetworkFirst para las llamadas a
Supabase (siempre intenta la red primero).
