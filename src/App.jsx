// App principal: layout (fondo degradado + blobs), sidebar de escritorio,
// topbar, barra inferior móvil, saludo y cambio de vista con animación.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDashboard } from './store/DashboardContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import MobileNav from './components/MobileNav.jsx';
import Greeting from './components/Greeting.jsx';
import PinGate from './components/PinGate.jsx';
import Panel from './components/Panel.jsx';
import Captura from './components/Captura.jsx';
import Horarios from './components/Horarios.jsx';
import Reservaciones from './components/Reservaciones.jsx';
import Inventory from './components/Inventory.jsx';
import Documents from './components/Documents.jsx';

const VIEWS = ['panel', 'captura', 'horarios', 'inventario', 'cocina', 'documentos', 'reservaciones'];

export default function App() {
  const d = useDashboard();
  const [view, setView] = useState('panel');
  const [query, setQuery] = useState('');
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('cantaros-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('cantaros-pin-ok') === '1');
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('cantaros-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    if (!unlocked) return;
    let alive = true;
    d.boot().finally(() => {
      if (alive) setBooted(true);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  const navigate = useCallback((v) => {
    if (v === 'subir-pos') {
      // "Subir reporte POS" vive solo en el Panel: ir al Panel y bajar a la tarjeta.
      setView('panel');
      setTimeout(() => {
        const el = document.querySelector('#subir-pos-card');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return;
    }
    if (VIEWS.indexOf(v) !== -1) setView(v);
    window.scrollTo({ top: 0 });
  }, []);

  const counts = useMemo(
    () => ({
      barra: d.invBarra.length,
      cocina: d.invCocina.length,
      docs: d.docs.length,
      reservaciones: d.reservaciones.length,
    }),
    [d.invBarra.length, d.invCocina.length, d.docs.length, d.reservaciones.length],
  );

  const progress = useMemo(() => {
    if (!d.weeks.length) return null;
    const agg = d.weeks[0];
    return {
      title: 'Margen de la semana',
      subtitle: 'Semana ' + (agg.week_start || ''),
      pct: Number(agg.margen_pct) || 0,
      caption: 'Margen bruto ' + (Number(agg.margen_pct) * 100 || 0).toFixed(1).replace('.', ',') + ' %',
    };
  }, [d.weeks]);

  if (!unlocked) {
    return (
      <div className="app-bg min-h-screen">
        <PinGate onUnlock={() => setUnlocked(true)} />
      </div>
    );
  }

  return (
    <div className="app-bg min-h-screen">
      <div className="mx-auto flex max-w-[1440px] gap-5 p-3 sm:p-4">
        <Sidebar view={view} onNavigate={navigate} counts={counts} dark={dark} onToggleDark={() => setDark(!dark)} progress={progress} />
        <main className="flex-1 min-w-0 pb-28 lg:pb-8">
          <Topbar
            query={query}
            onQuery={setQuery}
            weekOptions={d.weeks}
            selectedWeek={d.selectedWeek}
            onWeekChange={(w) => d.changeWeek(w)}
            period={d.period}
            onPeriodChange={(p) => d.changePeriod(p)}
            dark={dark}
            onToggleDark={() => setDark(!dark)}
            live={d.live}
          />
          {!booted && (
            <div className="glass-card rounded-3xl mt-4 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
              {d.statusText}
            </div>
          )}
          {booted && d.configNeeded && (
            <div className="rounded-3xl mt-4 px-4 py-3 text-sm font-semibold bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
              Falta configurar Supabase en Vercel: define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
              (tipo Config, Production + Preview) y redepliega. Sin eso la app no puede leer los datos.
            </div>
          )}
          {booted && d.liveError && !d.configNeeded && (
            <div className="rounded-3xl mt-4 px-4 py-3 text-sm font-semibold bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
              No se pudieron leer los datos de Supabase ({String(d.liveError.message || d.liveError)}). Revisa la conexión e intenta de nuevo.
            </div>
          )}
          {booted && !d.liveError && (
            <div className="mt-4">
              <Greeting onNavigate={navigate} />
            </div>
          )}
          <div className="mt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {view === 'panel' && <Panel query={query} onNavigate={navigate} />}
                {view === 'captura' && <Captura />}
                {view === 'horarios' && <Horarios />}
                {view === 'inventario' && <Inventory area="barra" query={query} />}
                {view === 'cocina' && <Inventory area="cocina" query={query} />}
                {view === 'documentos' && <Documents query={query} />}
                {view === 'reservaciones' && <Reservaciones />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <MobileNav view={view} onNavigate={navigate} />
    </div>
  );
}
