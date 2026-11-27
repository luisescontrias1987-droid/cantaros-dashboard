// Inventario de barra o cocina: resumen (valor, perdido, sobrante),
// filtros por chips y tabla completa; en móvil, lista de tarjetas
// expandible al tocar.
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowUpDown, Boxes, ChevronDown, PackageSearch, TrendingDown, TrendingUp } from 'lucide-react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { fmtMoney, fmtNum, num, weekLabel } from '../lib/utils.js';
import { invDerived } from '../lib/files.js';
import { Chip, EmptyState, SectionTitle } from './ui.jsx';
import KpiCard from './KpiCard.jsx';

function rowDerived(r) {
  if (r.total != null && r.valor_total != null) return r;
  const v = {
    inicial: r.inicial, compras: r.compras, almacen: r.almacen,
    display: r.display, barra: r.barra, venta: r.venta, costo: r.costo,
  };
  const d = invDerived(v);
  return { ...r, ...d };
}

export default function Inventory({ area, query }) {
  const d = useDashboard();
  const [filter, setFilter] = useState('todos');
  const [sort, setSort] = useState({ key: 'valor_total', dir: -1 });
  const [expanded, setExpanded] = useState(null);
  const [q, setQ] = useState('');

  const rowsRaw = area === 'barra' ? d.invBarra : d.invCocina;
  const invWeek = area === 'barra' ? d.invWeekBarra : d.invWeekCocina;
  const summary = d.invSummaryFor(area);

  const rows = useMemo(() => {
    let r = rowsRaw.map(rowDerived);
    const text = (q || query || '').trim().toLowerCase();
    if (text) r = r.filter((x) => String(x.producto).toLowerCase().includes(text) || String(x.seccion || '').toLowerCase().includes(text));
    if (filter === 'perdido') r = r.filter((x) => num(x.perdido) > 0);
    if (filter === 'sobrante') r = r.filter((x) => num(x.sobrante) > 0);
    return r.slice().sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string') return sort.dir * va.localeCompare(vb, 'es');
      return sort.dir * (va - vb);
    });
  }, [rowsRaw, q, query, filter, sort]);

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === 'producto' ? 1 : -1 }));

  const counts = useMemo(() => {
    const all = rowsRaw.map(rowDerived);
    return {
      todos: all.length,
      perdido: all.filter((x) => num(x.perdido) > 0).length,
      sobrante: all.filter((x) => num(x.sobrante) > 0).length,
    };
  }, [rowsRaw]);

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-3xl px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-sm font-bold text-slate-900 dark:text-white">
          Inventario de {area === 'barra' ? 'barra' : 'cocina'} · {weekLabel(invWeek)}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {fmtNum(summary.productos)} productos · se sube cada semana desde Captura (archivo .csv, .xls o .xlsx).
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 [&>*]:min-w-0">
        <KpiCard index={0} icon={Boxes} label="Valor total" value={fmtMoney(summary.valor_total)} sub={fmtNum(summary.productos) + ' productos'} />
        <KpiCard index={1} icon={TrendingDown} label="Perdido ($)" value={fmtMoney(summary.perdido_pesos)} sub="Faltante de la semana" />
        <KpiCard index={2} icon={TrendingUp} label="Sobrante ($)" value={fmtMoney(summary.sobrante_pesos)} sub="Sobrante de la semana — revisa capturas" />
        <KpiCard index={3} icon={PackageSearch} label="Con faltante" value={fmtNum(counts.perdido) + ' / ' + fmtNum(counts.todos)} sub={fmtNum(counts.sobrante) + ' con sobrante'} />
      </div>

      <div className="glass-card rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle title="Productos" subtitle="Toca una tarjeta para ver el detalle" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto…" className="input w-56" aria-label="Buscar producto" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip active={filter === 'todos'} onClick={() => setFilter('todos')}>Todos ({counts.todos})</Chip>
          <Chip active={filter === 'perdido'} onClick={() => setFilter('perdido')}>Con faltante ({counts.perdido})</Chip>
          <Chip active={filter === 'sobrante'} onClick={() => setFilter('sobrante')}>Con sobrante ({counts.sobrante})</Chip>
        </div>

        <div className="mt-3 hidden sm:block overflow-x-auto thin-scroll">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                {[
                  ['producto', 'Producto'],
                  ['seccion', 'Sección'],
                  ['total', 'Total'],
                  ['venta', 'Venta'],
                  ['diferencia', 'Diferencia'],
                  ['perdido', 'Perdido'],
                  ['sobrante', 'Sobrante'],
                  ['costo', 'Costo unit.'],
                  ['valor_total', 'Valor total'],
                  ['perdido_pesos', 'Perdido $'],
                  ['sobrante_pesos', 'Sobrante $'],
                ].map(([k, label]) => (
                  <th key={k} className="pb-2 pr-3 font-bold whitespace-nowrap">
                    <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200 min-h-[32px]">
                      {label} <ArrowUpDown size={12} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.producto} className="border-t border-slate-200/60 dark:border-white/10">
                  <td className="py-2 pr-3 font-semibold text-slate-800 dark:text-slate-100">{r.producto}</td>
                  <td className="py-2 pr-3 text-slate-500 dark:text-slate-400">{r.seccion || '—'}</td>
                  <td className="py-2 pr-3 text-slate-800 dark:text-slate-100">{fmtNum(r.total)}</td>
                  <td className="py-2 pr-3 text-slate-800 dark:text-slate-100">{fmtNum(r.venta)}</td>
                  <td className="py-2 pr-3 text-slate-800 dark:text-slate-100">{fmtNum(r.diferencia)}</td>
                  <td className="py-2 pr-3 font-semibold text-red-600 dark:text-red-400">{num(r.perdido) > 0 ? fmtNum(r.perdido) : '—'}</td>
                  <td className="py-2 pr-3 font-semibold text-amber-600 dark:text-amber-400">{num(r.sobrante) > 0 ? fmtNum(r.sobrante) : '—'}</td>
                  <td className="py-2 pr-3 text-slate-800 dark:text-slate-100">{num(r.costo) ? fmtMoney(r.costo) : '—'}</td>
                  <td className="py-2 pr-3 text-slate-800 dark:text-slate-100">{fmtMoney(r.valor_total)}</td>
                  <td className="py-2 pr-3 text-red-600 dark:text-red-400">{num(r.perdido_pesos) > 0 ? fmtMoney(r.perdido_pesos) : '—'}</td>
                  <td className="py-2 text-amber-600 dark:text-amber-400">{num(r.sobrante_pesos) > 0 ? fmtMoney(r.sobrante_pesos) : '—'}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={11} className="py-3 text-slate-500 dark:text-slate-400">Sin productos para este filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 space-y-2 sm:hidden">
          {rows.map((r) => {
            const open = expanded === r.producto;
            return (
              <div key={r.producto} className="rounded-2xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10">
                <button type="button" onClick={() => setExpanded(open ? null : r.producto)} className="w-full flex items-center gap-2 p-3 text-left min-h-[52px]" aria-expanded={open}>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-slate-900 dark:text-white text-sm truncate">{r.producto}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {r.seccion || 'Sin sección'} · total {fmtNum(r.total)} {r.unidad || ''}
                    </span>
                  </span>
                  <span className="font-extrabold text-cyan-700 dark:text-cyan-300 text-sm whitespace-nowrap">{fmtMoney(r.valor_total)}</span>
                  {num(r.perdido) > 0 && <AlertTriangle size={16} className="text-red-500 shrink-0" />}
                  <ChevronDown size={16} className={'text-slate-400 shrink-0 transition-transform ' + (open ? 'rotate-180' : '')} />
                </button>
                {open && (
                  <div className="px-3 pb-3 text-xs text-slate-600 dark:text-slate-300 grid grid-cols-2 gap-x-3 gap-y-1">
                    <span>Inicial: {fmtNum(r.inicial)}</span>
                    <span>Compras: {fmtNum(r.compras)}</span>
                    <span>Almacén: {fmtNum(r.almacen)}</span>
                    <span>Display: {fmtNum(r.display)}</span>
                    <span>Barra: {fmtNum(r.barra)}</span>
                    <span>Venta: {fmtNum(r.venta)}</span>
                    <span>Diferencia: {fmtNum(r.diferencia)}</span>
                    <span>Costo unit.: {num(r.costo) ? fmtMoney(r.costo) : '—'}</span>
                    <span className="text-red-600 dark:text-red-400">Perdido: {num(r.perdido) > 0 ? fmtNum(r.perdido) + ' · ' + fmtMoney(r.perdido_pesos) : '—'}</span>
                    <span className="text-amber-600 dark:text-amber-400">Sobrante: {num(r.sobrante) > 0 ? fmtNum(r.sobrante) + ' · ' + fmtMoney(r.sobrante_pesos) : '—'}</span>
                    <span>% Perdido: {r.pct_perdido != null ? (num(r.pct_perdido) * 100).toFixed(1).replace('.', ',') + ' %' : '—'}</span>
                    <span>Mínimo: {fmtNum(r.minimo)}</span>
                  </div>
                )}
              </div>
            );
          })}
          {!rows.length && <p className="text-sm text-slate-500 dark:text-slate-400">Sin productos para este filtro.</p>}
        </div>
      </div>

      {!rowsRaw.length && (
        <EmptyState
          title={'Sin inventario de ' + (area === 'barra' ? 'barra' : 'cocina') + ' en la ' + weekLabel(invWeek)}
          subtitle="Sube el archivo semanal desde Captura, o corre el SQL en Supabase."
        />
      )}
    </div>
  );
}
