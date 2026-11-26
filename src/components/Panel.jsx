// Panel ejecutivo: KPIs, comparación, tendencia, venta por grupo,
// productos estrella, top por grupo, productos vendidos y alertas.
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Banknote, Receipt, TrendingUp, Package, Tag, CheckCircle2,
  AlertTriangle, Star, ArrowUpDown, Search,
} from 'lucide-react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { fmtMoney, fmtNum, fmtPct, num } from '../lib/utils.js';
import {
  periodAgg, periodLabel, periodLabelShort, periodSeries,
  prevPeriodAgg, prevPeriodLabel,
} from '../lib/period.js';
import { groupNetAgg, groupTopAgg, productAgg, sortRows } from '../lib/aggregates.js';
import KpiCard from './KpiCard.jsx';
import { EmptyState, SectionTitle } from './ui.jsx';

const DONUT_COLORS = ['#0891b2', '#2563eb', '#38bdf8', '#0ea5e9', '#22d3ee', '#14b8a6', '#6366f1', '#f59e0b', '#ef4444'];
const tooltipStyle = {
  backgroundColor: 'rgba(255,255,255,0.95)',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  fontSize: 12,
};

function deltaPct(cur, prev) {
  if (cur == null || prev == null || !prev) return null;
  return cur / prev - 1;
}

export default function Panel({ query, onNavigate }) {
  const d = useDashboard();
  const [prodSort, setProdSort] = useState({ key: 'neta', dir: -1 });
  const [groupSort, setGroupSort] = useState({ key: 'neta', dir: -1 });
  const [prodQuery, setProdQuery] = useState('');
  const q = (prodQuery || query || '').trim().toLowerCase();

  const agg = useMemo(() => periodAgg(d.weeks, d.selectedWeek, d.period), [d.weeks, d.selectedWeek, d.period]);
  const prev = useMemo(() => prevPeriodAgg(d.weeks, d.selectedWeek, d.period), [d.weeks, d.selectedWeek, d.period]);
  const series = useMemo(() => periodSeries(d.weeks, d.period), [d.weeks, d.period]);
  const rows = useMemo(() => productAgg(d.salesRows, d.productsByClave, d.salesDesc), [d.salesRows, d.productsByClave, d.salesDesc]);
  const groups = useMemo(() => groupNetAgg(d.salesRows, d.productsByClave), [d.salesRows, d.productsByClave]);
  const groupTop = useMemo(() => groupTopAgg(d.salesRows, d.productsByClave), [d.salesRows, d.productsByClave]);
  const barSum = useMemo(() => d.invSummaryFor('barra'), [d.invResumen, d.invWeekBarra, d.invBarra]);
  const cocSum = useMemo(() => d.invSummaryFor('cocina'), [d.invResumen, d.invWeekCocina, d.invCocina]);

  const filtered = useMemo(() => {
    let r = rows;
    if (q) r = r.filter((x) => x.nombre.toLowerCase().includes(q) || x.grupo.toLowerCase().includes(q));
    return sortRows(r, prodSort.key, prodSort.dir);
  }, [rows, q, prodSort]);
  const sortedGroups = useMemo(() => sortRows(groupTop, groupSort.key, groupSort.dir), [groupTop, groupSort]);

  const withCost = rows.filter((r) => r.costo != null).length;
  const priceAvg = agg && agg.unidades ? agg.venta_neta / agg.unidades : null;
  const stars = useMemo(() => rows.slice().sort((a, b) => b.neta - a.neta).slice(0, 5), [rows]);
  const alerts = useMemo(() => {
    const out = [];
    const loss = d.invBarra
      .filter((r) => num(r.perdido_pesos) > 0)
      .sort((a, b) => num(b.perdido_pesos) - num(a.perdido_pesos))
      .slice(0, 3);
    loss.forEach((r) => {
      out.push({ kind: 'perdido', text: r.producto + ' · faltante ' + fmtMoney(r.perdido_pesos) + ' (' + fmtNum(r.perdido) + ' uds)' });
    });
    const sob = d.invBarra
      .filter((r) => num(r.sobrante_pesos) > 0)
      .sort((a, b) => num(b.sobrante_pesos) - num(a.sobrante_pesos))
      .slice(0, 2);
    sob.forEach((r) => {
      out.push({ kind: 'sobrante', text: r.producto + ' · sobrante ' + fmtMoney(r.sobrante_pesos) + ' (' + fmtNum(r.sobrante) + ' uds) — posible error de captura' });
    });
    return out;
  }, [d.invBarra]);

  const donutData = groups.map(([name, value]) => ({ name, value }));
  const toggleSort = (setter, cur, key) =>
    setter(cur.key === key ? { key, dir: -cur.dir } : { key, dir: key === 'nombre' || key === 'grupo' ? 1 : -1 });

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-3xl px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-sm font-bold text-slate-900 dark:text-white">{periodLabel(d.selectedWeek, d.period)}</p>
        {agg ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {prev
              ? 'Contra ' + prevPeriodLabel(d.selectedWeek, d.period) + ': ' +
                (agg.venta_neta >= prev.venta_neta ? '+' : '') + fmtMoney(agg.venta_neta - prev.venta_neta) +
                ' (' + ((agg.venta_neta / prev.venta_neta - 1) * 100).toFixed(1).replace('.', ',') + ' %)'
              : 'Sin ' + periodLabelShort(d.period) + ' anterior para comparar — solo hay una semana cargada.'}
          </p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Sin ventas en este periodo.</p>
        )}
      </div>

      {agg ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 [&>*]:min-w-0">
          <KpiCard index={0} icon={Banknote} label="Venta neta" value={fmtMoney(agg.venta_neta)} sub={'con IVA ' + fmtMoney(agg.venta_con_iva)} delta={deltaPct(agg.venta_neta, prev && prev.venta_neta)} />
          <KpiCard index={1} icon={Receipt} label="Costo teórico" value={fmtMoney(agg.costo_teorico)} sub={fmtPct(agg.costo_teorico / (agg.venta_neta_cubierta || 1)) + ' de la venta cubierta'} delta={deltaPct(agg.costo_teorico, prev && prev.costo_teorico)} />
          <KpiCard index={2} icon={TrendingUp} label="Margen bruto" value={fmtMoney(agg.margen)} sub={fmtPct(agg.margen_pct) + ' de margen'} delta={deltaPct(agg.margen, prev && prev.margen)} />
          <KpiCard index={3} icon={Package} label="Unidades" value={fmtNum(agg.unidades)} sub={fmtNum(agg.productos) + ' productos vendidos'} delta={deltaPct(agg.unidades, prev && prev.unidades)} />
          <KpiCard index={4} icon={Tag} label="Precio prom. por unidad" value={priceAvg != null ? fmtMoney(priceAvg) : '—'} sub="Venta neta ÷ unidades (no es ticket promedio)" />
          <KpiCard index={5} icon={CheckCircle2} label="Productos con costo" value={withCost + ' / ' + rows.length} sub={rows.length - withCost > 0 ? (rows.length - withCost) + ' sin costo' : 'todos con costo'} />
        </div>
      ) : (
        <EmptyState title="Sin ventas en este periodo" subtitle="Sube el reporte POS de Soft Restaurant en Captura para ver las cifras." />
      )}

      <div className="grid gap-4 lg:grid-cols-5 [&>*]:min-w-0">
        <motion.div className="glass-card rounded-3xl p-4 sm:p-5 lg:col-span-3" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <SectionTitle title="Tendencia de ventas" subtitle="Venta neta y margen por periodo real cargado" />
          {series.length ? (
            <div className="mt-3 h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => '$' + (v >= 1000 ? Math.round(v / 1000) + 'k' : v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
                  <Bar dataKey="venta_neta" name="Venta neta" fill="#0891b2" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="margen" name="Margen" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Sin datos para graficar.</p>
          )}
        </motion.div>

        <motion.div className="glass-card rounded-3xl p-4 sm:p-5 lg:col-span-2" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16 }}>
          <SectionTitle title="Venta por grupo" subtitle="Venta neta del periodo" />
          {donutData.length ? (
            <div className="mt-1 h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2} strokeWidth={0}>
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={9} wrapperStyle={{ fontSize: 12 }} formatter={(v, e) => v + ' · ' + fmtMoney(e.payload.value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Sin ventas por grupo.</p>
          )}
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <SectionTitle title="Productos estrella" subtitle="Los 5 de mayor venta neta del periodo" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 [&>*]:min-w-0">
          {stars.map((s, i) => (
            <motion.div key={s.nombre} className="glass-card rounded-3xl p-4" whileHover={{ y: -5 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 + i * 0.05 }}>
              <div className="flex items-center gap-1.5 text-amber-500">
                <Star size={15} fill="currentColor" />
                <span className="text-xs font-bold">#{i + 1}</span>
              </div>
              <p className="mt-2 font-bold text-slate-900 dark:text-white leading-snug text-sm">{s.nombre}</p>
              <p className="mt-1 text-lg font-extrabold text-cyan-700 dark:text-cyan-300">{fmtMoney(s.neta)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{fmtNum(s.unidades)} uds · margen {s.margen != null ? fmtMoney(s.margen) : '—'}</p>
            </motion.div>
          ))}
          {!stars.length && <p className="text-sm text-slate-500 dark:text-slate-400">Sin ventas en el periodo.</p>}
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <div className="glass-card rounded-3xl p-4 sm:p-5">
          <SectionTitle title="Top por grupo" subtitle="Venta neta, unidades y margen por grupo" />
          <div className="mt-3 overflow-x-auto thin-scroll">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  {[
                    ['grupo', 'Grupo'],
                    ['neta', 'Venta neta'],
                    ['unidades', 'Uds.'],
                    ['margen', 'Margen $'],
                    ['pct', '% total'],
                  ].map(([k, label]) => (
                    <th key={k} className="pb-2 pr-2 font-bold">
                      <button type="button" onClick={() => toggleSort(setGroupSort, groupSort, k)} className="inline-flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200 min-h-[32px]">
                        {label} <ArrowUpDown size={12} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedGroups.map((g) => (
                  <tr key={g.grupo} className="border-t border-slate-200/60 dark:border-white/10">
                    <td className="py-2 pr-2 font-semibold text-slate-800 dark:text-slate-100">{g.grupo}</td>
                    <td className="py-2 pr-2">{fmtMoney(g.neta)}</td>
                    <td className="py-2 pr-2">{fmtNum(g.unidades)}</td>
                    <td className="py-2 pr-2">{g.margen != null ? fmtMoney(g.margen) : '—'}</td>
                    <td className="py-2">{(g.pct * 100).toFixed(1).replace('.', ',') + ' %'}</td>
                  </tr>
                ))}
                {!sortedGroups.length && (
                  <tr>
                    <td colSpan={5} className="py-3 text-slate-500 dark:text-slate-400">Sin ventas por grupo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-4 sm:p-5">
          <SectionTitle title="Alertas de inventario" subtitle="Faltantes y sobrantes de la semana de barra" />
          <ul className="mt-3 space-y-2">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <AlertTriangle size={16} className={'mt-0.5 shrink-0 ' + (a.kind === 'perdido' ? 'text-red-500' : 'text-amber-500')} />
                <span className="text-slate-700 dark:text-slate-200">{a.text}</span>
              </li>
            ))}
            {!alerts.length && <li className="text-sm text-slate-500 dark:text-slate-400">Sin faltantes ni sobrantes en la semana.</li>}
          </ul>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Valor total barra: <b className="text-slate-800 dark:text-slate-100">{fmtMoney(barSum.valor_total)}</b> · Perdido:{' '}
            <b className="text-red-600 dark:text-red-400">{fmtMoney(barSum.perdido_pesos)}</b> · Sobrante:{' '}
            <b className="text-amber-600 dark:text-amber-400">{fmtMoney(barSum.sobrante_pesos)}</b>
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Cocina: valor <b className="text-slate-800 dark:text-slate-100">{fmtMoney(cocSum.valor_total)}</b> · Perdido{' '}
            <b className="text-red-600 dark:text-red-400">{fmtMoney(cocSum.perdido_pesos)}</b> · Sobrante{' '}
            <b className="text-amber-600 dark:text-amber-400">{fmtMoney(cocSum.sobrante_pesos)}</b>
          </p>
          <button type="button" className="btn-secondary mt-3" onClick={() => onNavigate('inventario')}>
            Ver inventario de barra
          </button>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle title="Productos vendidos" subtitle="Lista completa del periodo, ordenable y con buscador" />
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="search" value={prodQuery} onChange={(e) => setProdQuery(e.target.value)} placeholder="Buscar producto…" className="input pl-9 w-56" aria-label="Buscar producto" />
          </div>
        </div>
        <div className="mt-3 hidden sm:block overflow-x-auto thin-scroll">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                {[
                  ['nombre', 'Producto'],
                  ['grupo', 'Grupo'],
                  ['unidades', 'Unidades'],
                  ['neta', 'Venta neta'],
                  ['costo', 'Costo'],
                  ['margen', 'Margen $'],
                  ['margenPct', 'Margen %'],
                ].map(([k, label]) => (
                  <th key={k} className="pb-2 pr-3 font-bold">
                    <button type="button" onClick={() => toggleSort(setProdSort, prodSort, k)} className="inline-flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200 min-h-[32px]">
                      {label} <ArrowUpDown size={12} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.nombre} className="border-t border-slate-200/60 dark:border-white/10">
                  <td className="py-2 pr-3 font-semibold text-slate-800 dark:text-slate-100">{r.nombre}</td>
                  <td className="py-2 pr-3 text-slate-500 dark:text-slate-400">{r.grupo}</td>
                  <td className="py-2 pr-3">{fmtNum(r.unidades)}</td>
                  <td className="py-2 pr-3">{fmtMoney(r.neta)}</td>
                  <td className="py-2 pr-3">{r.costo != null ? fmtMoney(r.costo) : '—'}</td>
                  <td className="py-2 pr-3">{r.margen != null ? fmtMoney(r.margen) : '—'}</td>
                  <td className="py-2">{r.margenPct != null ? fmtPct(r.margenPct) : '—'}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={7} className="py-3 text-slate-500 dark:text-slate-400">Sin productos en este periodo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 space-y-2 sm:hidden">
          {filtered.map((r) => (
            <div key={r.nombre} className="rounded-2xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-bold text-slate-900 dark:text-white text-sm">{r.nombre}</p>
                <p className="font-extrabold text-cyan-700 dark:text-cyan-300 text-sm whitespace-nowrap">{fmtMoney(r.neta)}</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {r.grupo} · {fmtNum(r.unidades)} uds · costo {r.costo != null ? fmtMoney(r.costo) : '—'} · margen{' '}
                {r.margen != null ? fmtMoney(r.margen) + ' (' + fmtPct(r.margenPct) + ')' : '—'}
              </p>
            </div>
          ))}
          {!filtered.length && <p className="text-sm text-slate-500 dark:text-slate-400">Sin productos en este periodo.</p>}
        </div>
      </div>

      <div className="glass-card rounded-3xl p-4 sm:p-5">
        <SectionTitle title="Evolución histórica" subtitle="Venta neta y margen por periodo real cargado" />
        {series.length ? (
          <>
            <div className="mt-3 h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => '$' + (v >= 1000 ? Math.round(v / 1000) + 'k' : v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
                  <Bar dataKey="venta_neta" name="Venta neta" fill="#0891b2" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="margen" name="Margen" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 overflow-x-auto thin-scroll">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-3 font-bold">Periodo</th>
                    <th className="pb-2 pr-3 font-bold">Venta neta</th>
                    <th className="pb-2 pr-3 font-bold">Margen</th>
                    <th className="pb-2 font-bold">Margen %</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((s) => (
                    <tr key={s.label} className="border-t border-slate-200/60 dark:border-white/10">
                      <td className="py-2 pr-3 font-semibold text-slate-800 dark:text-slate-100">{s.label}</td>
                      <td className="py-2 pr-3">{fmtMoney(s.venta_neta)}</td>
                      <td className="py-2 pr-3">{fmtMoney(s.margen)}</td>
                      <td className="py-2">{fmtPct(s.margen_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Sin periodos cargados.</p>
        )}
      </div>
    </div>
  );
}
