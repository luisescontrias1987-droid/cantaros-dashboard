# Cántaros · Dashboard de Ventas (React)

Rediseño visual del dashboard de **Cántaros, Cazos y Cantares** (Ciudad Juárez)
con React + Vite + Tailwind + framer-motion + lucide-react + Recharts, como
PWA instalable. Es **solo la capa visual**: toda la funcionalidad y las
conexiones a Supabase son las mismas que la app actual
(`../vercel-app/index.html`, que sigue siendo la versión viva en producción).

## Qué hace

- **Panel ejecutivo**: venta neta, costo teórico, margen bruto, unidades,
  precio promedio por unidad (no es ticket promedio) y productos con costo;
  comparación con el periodo anterior (solo con semanas reales cargadas);
  tendencia en barras; venta por grupo en dona; productos estrella; top por
  grupo; lista completa de productos vendidos (ordenable, con buscador);
  alertas de inventario; evolución histórica.
- **Captura semanal**: venta por mesero (solo total + semana, lista de
  meseros activos desde Horarios), con tarjetas por mesero, mini gráfica de
  las últimas 8 semanas y orden mayor/menor; subida del reporte POS de Soft
  Restaurant (.csv/.xls/.xlsx, detecta "Semana 48" del nombre de hoja o
  archivo); subida de inventarios; lista de semanas de ventas cargadas con
  eliminación (con PIN 2026).
- **Horarios**: tabla semanal por área, selector de turnos en formato 12h
  (entrada/salida AM/PM, Cierre, OFF, F), editar/eliminar personal con
  Deshacer (10 s), reservaciones (día, hora, personas, tipo, título, notas,
  anticipo) con exportar a PDF, y exportación del horario a imagen (PNG),
  Excel y PDF.
- **Inventario de barra y cocina**: valor total, perdido y sobrante en pesos,
  filtros por chips y tabla completa; en móvil, lista de tarjetas expandible.
- **Documentos**: subida a Supabase Storage (bucket `documentos`), ver,
  descargar y eliminar con PIN 2026.
- **Semanas ISO**: todo se nombra por número de semana del año
  (Semana 45 = 2–8 nov 2026, Semana 48 = 23–29 nov 2026) y el periodo se
  puede ver por Semana, Mes o Año.
- **Móvil primero**: diseñado para 390px, sin scroll horizontal, barra
  inferior fija con 5 íconos, hoja "Más", KPIs en 2 columnas, gráficas a
  ~220px, celdas táctiles de mínimo 44px e inputs a 16px (sin zoom de iOS).
- **Modo claro y oscuro**: automático según el sistema, con interruptor manual.

## Seguridad (PIN 2026)

Al abrir la app se pide el **PIN 2026** antes de mostrar los datos (la
sesión se guarda en `sessionStorage`). El mismo PIN confirma el borrado de
semanas de ventas y de documentos.

> **El PIN vive en el código del cliente y es solo una guarda contra
> borrados o miradas por accidente — no es seguridad real.** Cualquiera con
> el enlace puede abrir el código y verlo. El siguiente paso, si se quiere
> acceso por persona, es Supabase Auth con cuentas por socio/empleado y
> políticas RLS por rol; el PIN se puede quitar entonces.

## Datos

- Los datos viven en Supabase (tablas `products`, `weekly_sales`,
  `ventas_semanales`, `inventory_weekly`, `inventory_cocina`,
  `inventario_semanal_resumen`, `staff`, `horarios`, `eventos`, `documents`,
  `ventas_mesero`, `ventas_pos_import` y bucket `documentos`).
- La app **no guarda ninguna llave**: al cargar pide `/api/config`, una
  función serverless de Vercel que devuelve la URL y la llave publicable
  desde las variables de entorno.
- No hay cifras inventadas: con una sola semana cargada, la comparación
  dice que no hay periodo anterior.
- Los costos de los 58 productos del reporte POS viven en
  `src/lib/posMap.js` (el mismo mapa que la app actual, con el multiplicador
  de promo ya incluido en `unit_cost`).

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
npm run preview  # sirve dist/ para probar
```

## Despliegue

Ver [DEPLOY.md](./DEPLOY.md).

## Estructura

```
api/config.js                 Función serverless de Vercel (URL + llave anon)
index.html                    Entry de Vite (viewport móvil, PWA, Inter)
public/
  logo-cantaros.png           Logo del restaurante
  icons/icon-192.png          Icono PWA 192
  icons/icon-512.png          Icono PWA 512 (también maskable)
src/
  main.jsx                    Entrada React (StrictMode + provider)
  App.jsx                     Layout, navegación y puerta PIN
  index.css                   Tailwind v4 + glass-card + fondo degradado
  lib/
    utils.js                  Formato y semanas ISO 8601
    supabase.js               Cliente PostgREST + Storage (sin llave fija)
    posMap.js                 Mapa POS → clave base + costo unitario
    files.js                  Lectura CSV/Excel y cálculo de inventario
    canvas.js                 Imagen del horario (canvas)
    print.js                  Ventanas imprimibles (PDF del horario y de
                              reservaciones)
    period.js                 Agregación Semana/Mes/Año
    aggregates.js             Agregados por producto y por grupo
  store/
    DashboardContext.jsx      Estado y acciones de datos
  components/
    ui.jsx                    Modales (PIN/confirmación), chips, títulos
    Sidebar.jsx               Sidebar flotante de escritorio
    Topbar.jsx                Barra superior (buscar, semana, periodo)
    MobileNav.jsx             Barra inferior móvil + hoja "Más"
    Greeting.jsx              Saludo "Buenas tardes, Joms" + acciones
    KpiCard.jsx               Tarjeta KPI con badge de variación
    PinGate.jsx               Puerta con PIN 2026
    Panel.jsx                 Panel ejecutivo
    Captura.jsx               Venta por mesero + subidas + eliminar semana
    Horarios.jsx              Horarios, turnos 12h, reservaciones, exportar
    Inventory.jsx             Inventario de barra / cocina
    Documents.jsx             Documentos (Storage)
```

## Pendientes conocidos (heredados de la app actual)

- Correr el SQL v3 (`Supabase-Cantaros-v3-Horarios-Ventas.sql`) en Supabase
  y exponer `ventas_mesero` en la Data API para que funcionen las
  reservaciones y las ventas por mesero.
- La Semana 48 tiene las mismas cifras que la Semana 45 (el mismo reporte
  se subió dos veces); se puede borrar con el botón Eliminar en Captura.
- Costo del Clamato para cerveza, confirmación de $215/L contra factura y
  precios de refrescos en el POS (ver DATOS-REALES-preview-dashboard.md).
