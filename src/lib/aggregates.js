// Agregados de ventas por producto y por grupo. Portado de vercel-app/index.html.
import { num } from './utils.js';

// Agrega las ventas del periodo por producto (misma clave base agrupa
// los renglones POS que comparten costo, ej. las aguas frescas).
export function productAgg(salesRows, productsByClave, salesDesc) {
  const agg = {};
  salesRows.forEach((r) => {
    const key = r.product_clave || 'POS-' + r.pos_clave;
    const p = productsByClave[r.product_clave];
    const name = p ? p.nombre : salesDesc[String(r.pos_clave)] || 'Clave POS ' + (r.pos_clave || '—');
    const grupo = p && p.grupo ? p.grupo : 'Sin grupo';
    const neta = num(r.total) / 1.08;
    const costo = r.unit_cost == null ? null : num(r.qty) * num(r.unit_cost);
    const a = agg[key] || (agg[key] = { nombre: name, grupo, unidades: 0, neta: 0, costo: 0, hasCost: true });
    a.unidades += num(r.qty);
    a.neta += neta;
    if (costo == null) a.hasCost = false;
    else a.costo += costo;
  });
  return Object.keys(agg).map((k) => {
    const a = agg[k];
    const margen = a.hasCost ? a.neta - a.costo : null;
    return {
      nombre: a.nombre,
      grupo: a.grupo,
      unidades: a.unidades,
      neta: a.neta,
      costo: a.hasCost ? a.costo : null,
      margen,
      margenPct: margen == null || !a.neta ? null : margen / a.neta,
    };
  });
}

// Ordena filas por clave; los nulos siempre quedan al final.
export function sortRows(rows, key, dir) {
  return rows.slice().sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'string') return dir * va.localeCompare(vb, 'es');
    return dir * (va - vb);
  });
}

export function groupNetAgg(salesRows, productsByClave) {
  const agg = {};
  salesRows.forEach((r) => {
    const p = productsByClave[r.product_clave];
    const g = p && p.grupo ? p.grupo : 'Sin grupo';
    agg[g] = (agg[g] || 0) + num(r.total) / 1.08;
  });
  return Object.keys(agg)
    .map((k) => [k, agg[k]])
    .sort((a, b) => b[1] - a[1]);
}

export function groupTopAgg(salesRows, productsByClave) {
  const agg = {};
  salesRows.forEach((r) => {
    const p = productsByClave[r.product_clave];
    const g = p && p.grupo ? p.grupo : 'Sin grupo';
    const neta = num(r.total) / 1.08;
    const costo = r.unit_cost == null ? null : num(r.qty) * num(r.unit_cost);
    const a = agg[g] || (agg[g] = { grupo: g, neta: 0, unidades: 0, margen: 0, hasCost: true });
    a.neta += neta;
    a.unidades += num(r.qty);
    if (costo == null) a.hasCost = false;
    else a.margen += neta - costo;
  });
  const total = Object.keys(agg).reduce((s, k) => s + agg[k].neta, 0) || 1;
  return Object.keys(agg).map((k) => ({
    grupo: agg[k].grupo,
    neta: agg[k].neta,
    unidades: agg[k].unidades,
    margen: agg[k].hasCost ? agg[k].margen : null,
    pct: agg[k].neta / total,
  }));
}
