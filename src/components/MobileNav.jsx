// Barra inferior fija (móvil) con 5 íconos + hoja inferior "Más".
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  CalendarCheck,
  Boxes,
  MoreHorizontal,
  ChefHat,
  FileText,
  X,
} from 'lucide-react';

const MAIN = [
  { id: 'panel', label: 'Panel', icon: LayoutDashboard },
  { id: 'captura', label: 'Captura', icon: ClipboardList },
  { id: 'horarios', label: 'Horarios', icon: CalendarDays },
  { id: 'inventario', label: 'Inventario', icon: Boxes },
];

const MORE = [
  { id: 'cocina', label: 'Inventario cocina', icon: ChefHat },
  { id: 'documentos', label: 'Documentos', icon: FileText },
  { id: 'reservaciones', label: 'Reservaciones', icon: CalendarCheck },
];

export default function MobileNav({ view, onNavigate }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const inMore = MORE.some((m) => m.id === view);
  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 safe-bottom">
        <div className="mx-3 mb-3 glass-strong rounded-3xl flex items-stretch justify-around px-1 py-1.5 shadow-2xl">
          {MAIN.map((it) => {
            const Icon = it.icon;
            const active = view === it.id;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onNavigate(it.id)}
                aria-label={it.label}
                className={
                  'flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-[11px] font-bold min-h-[52px] min-w-[56px] justify-center transition ' +
                  (active ? 'text-cyan-600 dark:text-cyan-300 bg-cyan-500/10' : 'text-slate-500 dark:text-slate-400')
                }
              >
                <Icon size={21} />
                {it.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="Más opciones"
            className={
              'flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-[11px] font-bold min-h-[52px] min-w-[56px] justify-center transition ' +
              (inMore ? 'text-cyan-600 dark:text-cyan-300 bg-cyan-500/10' : 'text-slate-500 dark:text-slate-400')
            }
          >
            <MoreHorizontal size={21} />
            Más
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
            <motion.div
              className="glass-card absolute inset-x-0 bottom-0 rounded-t-3xl p-5 pb-8 safe-bottom"
              initial={{ y: 120 }}
              animate={{ y: 0 }}
              exit={{ y: 120 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Más</h3>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  aria-label="Cerrar"
                  className="rounded-full p-2 text-slate-500 dark:text-slate-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>
              <ul className="mt-3 space-y-1">
                {MORE.map((it) => {
                  const Icon = it.icon;
                  return (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setMoreOpen(false);
                          onNavigate(it.id);
                        }}
                        className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/10 min-h-[52px]"
                      >
                        <Icon size={20} className="text-cyan-600 dark:text-cyan-300" />
                        {it.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
