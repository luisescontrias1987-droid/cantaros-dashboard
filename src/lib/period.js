// Agregación por periodo Semana/Mes/Año. Portado de vercel-app/index.html.
// El panel agrega las semanas cargadas dentro del periodo; el inventario
// y la captura siguen siendo semanales.
import { MESES, mondayOf, num, toISODate, weekLabel, weekNum } from './utils.js';

export function periodRange(selectedWeek, period) {
  const p = selectedWeek.split('-').map(Number);
  if (period === 'mes') {
    const last = new Date(p[0], p[1], 0).getDate();
    const m = String(p[1]).padStart(2, '0');
    return { mode: 'range', gte: p[0] + '-' + m + '-01', lte: p[0] + '-' + m + '-' + String(last).padStart(2, '0') };
  }
  if (period === 'anio') return { mode: 'range', gte: p[0] + '-01-01', lte: p[0] + '-12-31' };
  return { mode: 'eq' };
}

export function periodLabel(selectedWeek, period) {
  const p = selectedWeek.split('-').map(Number);
  if (period === 'mes') return 'Mes de ' + MESES[p[1] - 1] + ' ' + p[0];
  if (period === 'anio') return 'Año ' + p[0];
  return weekLabel(selectedWeek);
}

export function periodLabelShort(period) {
  return period === 'semana' ? 'semana' : period === 'mes' ? 'mes' : 'año';
}

export function periodWeeks(weeks, selectedWeek, period) {
  if (period === 'semana') return weeks.filter((w) => w.week_start === selectedWeek);
  if (period === 'mes') {
    const ym = selectedWeek.slice(0, 7);
    return weeks.filter((w) => w.week_start.slice(0, 7) === ym);
  }
  const y = selectedWeek.slice(0, 4);
  return weeks.filter((w) => w.week_start.slice(0, 4) === y);
}

export function sumWeeks(rows, selectedWeek) {
  if (!rows.length) return null;
  const sum = (k) => rows.reduce((a, w) => a + num(w[k]), 0);
  const netaCub = sum('venta_neta_cubierta');
  const margen = sum('margen');
  return {
    week_start: selectedWeek,
    productos: sum('productos'),
    unidades: sum('unidades'),
    venta_con_iva: sum('venta_con_iva'),
    venta_neta: sum('venta_neta'),
    venta_neta_cubierta: netaCub,
    costo_teorico: sum('costo_teorico'),
    margen,
    margen_pct: netaCub ? margen / netaCub : 0,
  };
}

export function periodAgg(weeks, selectedWeek, period) {
  return sumWeeks(periodWeeks(weeks, selectedWeek, period), selectedWeek);
}

export function prevPeriodAgg(weeks, selectedWeek, period) {
  const p = selectedWeek.split('-').map(Number);
  const d = new Date(p[0], p[1] - 1, p[2]);
  if (period === 'semana') d.setDate(d.getDate() - 7);
  else if (period === 'mes') d.setMonth(d.getMonth() - 1);
  else d.setFullYear(d.getFullYear() - 1);
  const ref = toISODate(mondayOf(d));
  const rows = weeks.filter((w) => {
    if (period === 'semana') return w.week_start === ref;
    if (period === 'mes') return w.week_start.slice(0, 7) === ref.slice(0, 7);
    return w.week_start.slice(0, 4) === ref.slice(0, 4);
  });
  return rows.length ? sumWeeks(rows, selectedWeek) : null;
}

export function prevPeriodLabel(selectedWeek, period) {
  const p = selectedWeek.split('-').map(Number);
  const d = new Date(p[0], p[1] - 1, p[2]);
  if (period === 'semana') {
    d.setDate(d.getDate() - 7);
    return 'la ' + weekLabel(toISODate(mondayOf(d)));
  }
  if (period === 'mes') {
    d.setMonth(d.getMonth() - 1);
    return 'el mes de ' + MESES[d.getMonth()] + ' ' + d.getFullYear();
  }
  d.setFullYear(d.getFullYear() - 1);
  return 'el año ' + d.getFullYear();
}

// Serie de periodos reales para la tendencia y la evolución histórica,
// agrupada según el periodo elegido (semanas, meses o años).
export function periodSeries(weeks, period) {
  if (period === 'semana') {
    return weeks
      .slice()
      .sort((a, b) => String(a.week_start).localeCompare(String(b.week_start)))
      .map((w) => ({
        label: 'Sem ' + weekNum(w.week_start),
        venta_neta: num(w.venta_neta),
        margen: num(w.margen),
        margen_pct: num(w.margen_pct),
      }));
  }
  const key = period === 'mes' ? (w) => w.week_start.slice(0, 7) : (w) => w.week_start.slice(0, 4);
  const label =
    period === 'mes'
      ? (k) => {
          const p = k.split('-');
          return MESES[Number(p[1]) - 1] + ' ' + p[0];
        }
      : (k) => k;
  const agg = {};
  weeks.forEach((w) => {
    const k = key(w);
    if (!agg[k]) agg[k] = { label: label(k), venta_neta: 0, margen: 0, neta_cub: 0 };
    agg[k].venta_neta += num(w.venta_neta);
    agg[k].margen += num(w.margen);
    agg[k].neta_cub += num(w.venta_neta_cubierta);
  });
  return Object.keys(agg)
    .sort()
    .map((k) => ({
      label: agg[k].label,
      venta_neta: agg[k].venta_neta,
      margen: agg[k].margen,
      margen_pct: agg[k].neta_cub ? agg[k].margen / agg[k].neta_cub : 0,
    }));
}

export function pickInvWeek(invResumen, area, selectedWeek, fallback) {
  const rows = invResumen.filter((r) => r.area === area);
  if (!rows.length) return fallback;
  const weeks = rows.map((r) => r.week_start).sort().reverse();
  if (weeks.indexOf(selectedWeek) !== -1) return selectedWeek;
  return weeks[0];
}

export function invSummary(invResumen, area, invWeek, rows) {
  const row = invResumen.find((r) => r.area === area && r.week_start === invWeek);
  if (row) return row;
  return {
    week_start: invWeek,
    area,
    productos: rows.length,
    valor_total: rows.reduce((a, r) => a + num(r.valor_total), 0),
    perdido_pesos: rows.reduce((a, r) => a + num(r.perdido_pesos), 0),
    sobrante_pesos: rows.reduce((a, r) => a + num(r.sobrante_pesos), 0),
  };
}
