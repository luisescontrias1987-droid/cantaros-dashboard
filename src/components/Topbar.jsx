// Barra superior glass: buscador, selector de semana, periodo y avatar.
import React from 'react';
import { Search, Moon, Sun, ChevronDown } from 'lucide-react';
import { weekLabel } from '../lib/utils.js';

export default function Topbar({
  query,
  onQuery,
  weekOptions,
  selectedWeek,
  onWeekChange,
  period,
  onPeriodChange,
  dark,
  onToggleDark,
  live,
}) {
  return (
    <header className="glass-card safe-top sticky top-3 z-30 flex items-center gap-2 sm:gap-3 rounded-3xl px-3 sm:px-4 py-2.5">
      <div className="relative flex-1 min-w-0 hidden sm:block">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Buscar producto, inventario o documento…"
          className="input pl-9"
          aria-label="Buscar"
        />
      </div>
      <div className="relative flex-1 sm:flex-none min-w-0">
        <select
          value={selectedWeek}
          onChange={(e) => onWeekChange(e.target.value)}
          className="input appearance-none pr-8 font-semibold text-slate-800 dark:text-slate-100 w-full sm:w-auto"
          aria-label="Semana"
        >
          {weekOptions.map((w) => (
            <option key={w.week_start} value={w.week_start}>
              {weekLabel(w.week_start)}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
      <div className="hidden md:flex rounded-full bg-slate-900/5 dark:bg-white/10 p-1 gap-1" role="group" aria-label="Periodo">
        {[
          { id: 'semana', label: 'Semana' },
          { id: 'mes', label: 'Mes' },
          { id: 'anio', label: 'Año' },
        ].map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPeriodChange(p.id)}
            className={
              'rounded-full px-3 py-1.5 text-xs font-bold transition min-h-[32px] ' +
              (period === p.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-300')
            }
          >
            {p.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onToggleDark}
        aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        className="rounded-full p-2.5 text-slate-600 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        {dark ? <Sun size={19} /> : <Moon size={19} />}
      </button>
      <div className="flex items-center gap-2 pl-1">
        <img src="/logo-cantaros.png" alt="Joms" className="h-10 w-10 rounded-full object-contain bg-white/80 p-0.5 ring-2 ring-cyan-400/60" />
        <span className="hidden xl:block">
          <span className="block text-sm font-bold text-slate-900 dark:text-white leading-tight">Joms</span>
          <span className={'block text-xs leading-tight ' + (live ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')}>
            {live ? 'En vivo · Supabase' : 'Sin conexión'}
          </span>
        </span>
      </div>
    </header>
  );
}
