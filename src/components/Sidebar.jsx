// Sidebar flotante de escritorio (glass), con secciones agrupadas.
import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  CalendarCheck,
  Boxes,
  ChefHat,
  FileText,
  Moon,
  Sun,
  TrendingUp,
} from 'lucide-react';

const GROUPS = [
  {
    label: 'Operación',
    items: [
      { id: 'panel', label: 'Panel', icon: LayoutDashboard },
      { id: 'captura', label: 'Captura', icon: ClipboardList },
      { id: 'horarios', label: 'Horarios', icon: CalendarDays },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { id: 'inventario', label: 'Barra', icon: Boxes, countKey: 'barra' },
      { id: 'cocina', label: 'Cocina', icon: ChefHat, countKey: 'cocina' },
    ],
  },
  {
    label: 'Empresa',
    items: [
      { id: 'documentos', label: 'Documentos', icon: FileText, countKey: 'docs' },
      { id: 'reservaciones', label: 'Reservaciones', icon: CalendarCheck, countKey: 'reservaciones' },
    ],
  },
];

export default function Sidebar({ view, onNavigate, counts, dark, onToggleDark, progress }) {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-4 h-[calc(100vh-2rem)] glass-strong rounded-3xl p-4 overflow-y-auto thin-scroll">
      <div className="flex items-center gap-3 px-2 pt-1 pb-4">
        <img src="/logo-cantaros.png" alt="Cántaros, Cazos y Cantares" className="h-11 w-11 rounded-2xl object-contain bg-white/70 p-1" />
        <div className="min-w-0">
          <p className="font-extrabold text-slate-900 dark:text-white leading-tight text-[15px]">Cántaros</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">Cazos y Cantares</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5">
        {GROUPS.map((g) => (
          <div key={g.label}>
            <p className="px-3 pb-2 text-[11px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
              {g.label}
            </p>
            <ul className="space-y-1">
              {g.items.map((it) => {
                const Icon = it.icon;
                const active = view === it.id || (it.id === 'inventario' && view === 'inventario');
                const count = it.countKey ? counts[it.countKey] : null;
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(it.id)}
                      className={
                        'w-full flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-semibold transition min-h-[44px] ' +
                        (active
                          ? 'bg-cyan-500/90 text-white shadow-lg shadow-cyan-500/30'
                          : 'text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10')
                      }
                    >
                      <Icon size={18} />
                      <span className="flex-1 text-left">{it.label}</span>
                      {count != null && count > 0 && (
                        <span
                          className={
                            'text-[11px] font-bold rounded-full px-2 py-0.5 ' +
                            (active ? 'bg-white/25 text-white' : 'bg-slate-900/5 text-slate-500 dark:bg-white/10 dark:text-slate-300')
                          }
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {progress && (
        <div className="mt-4 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-cyan-400 dark:text-cyan-600" />
            <p className="text-sm font-bold">{progress.title}</p>
          </div>
          <p className="text-xs opacity-75 mt-1">{progress.subtitle}</p>
          <div className="mt-3 h-2 rounded-full bg-white/20 dark:bg-slate-900/10 overflow-hidden">
            <div className="h-full rounded-full bg-cyan-400 dark:bg-cyan-600" style={{ width: Math.min(100, Math.max(0, progress.pct * 100)) + '%' }} />
          </div>
          <p className="text-xs mt-2 opacity-75">{progress.caption}</p>
        </div>
      )}

      <button
        type="button"
        onClick={onToggleDark}
        className="mt-4 flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10 min-h-[44px]"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
        {dark ? 'Modo claro' : 'Modo oscuro'}
      </button>
    </aside>
  );
}
