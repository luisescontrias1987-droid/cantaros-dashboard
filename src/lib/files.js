// Lectura de archivos (CSV / Excel con SheetJS) e inventario derivado.
// Portado de vercel-app/index.html.
import { num } from './utils.js';

let xlsxPromise = null;
export function ensureXLSX() {
  if (typeof window !== 'undefined' && window.XLSX) return Promise.resolve(window.XLSX);
  if (xlsxPromise) return xlsxPromise;
  xlsxPromise = import('xlsx').then((m) => m.default || m);
  return xlsxPromise;
}

// Lee un archivo .csv, .xls o .xlsx y devuelve sus filas como arreglos
// (primera hoja del libro en el caso de Excel) + el nombre de esa hoja,
// para detectar la semana ("Semana 48") del nombre de la hoja o del archivo.
export async function readSpreadsheetWithMeta(file) {
  const name = String(file.name || '').toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await ensureXLSX();
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return { rows: XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }), sheetName: wb.SheetNames[0] };
  }
  return { rows: parseCSV(await file.text()), sheetName: null };
}

export function parseCSV(text) {
  // Parser CSV con comillas, comas dentro de comillas y saltos \r\n.
  const rows = [];
  let cur = [];
  let inQ = false;
  let field = '';
  const s = String(text).replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') {
      cur.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      cur.push(field);
      field = '';
      rows.push(cur);
      cur = [];
    } else field += c;
  }
  if (field !== '' || cur.length) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

export function findHeaderRow(rows, wanted) {
  // El CSV puede traer filas de título antes del encabezado: buscar la
  // primera fila que contenga la columna buscada.
  for (let i = 0; i < rows.length; i++) {
    const norm = rows[i].map((c) => String(c).trim().toLowerCase().replace(/\s+/g, '_'));
    if (norm.indexOf(wanted) !== -1) return i;
  }
  return -1;
}

export function headerIndex(header) {
  const map = {};
  header.forEach((h, i) => {
    map[String(h).trim().toLowerCase().replace(/\s+/g, '_')] = i;
  });
  return map;
}

export function pick(row, idx, names) {
  for (const n of names) {
    const i = idx[n];
    if (i != null && row[i] != null && String(row[i]).trim() !== '') return row[i];
  }
  return null;
}

export function invDerived(v) {
  const total = num(v.almacen) + num(v.display) + num(v.barra);
  const base = num(v.inicial) + num(v.compras) - num(v.venta);
  const diferencia = total - base;
  const perdido = Math.max(0, -diferencia);
  const sobrante = Math.max(0, diferencia);
  const costo = num(v.costo);
  return {
    total,
    diferencia,
    perdido,
    pedido: 0,
    sobrante,
    valor_total: total * costo,
    perdido_pesos: perdido * costo,
    sobrante_pesos: sobrante * costo,
    pct_perdido:
      num(v.inicial) + num(v.compras) > 0 ? perdido / (num(v.inicial) + num(v.compras)) : 0,
    pct_sobrante:
      num(v.inicial) + num(v.compras) > 0 ? sobrante / (num(v.inicial) + num(v.compras)) : 0,
  };
}
