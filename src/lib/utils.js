// Utilidades portadas de vercel-app/index.html (sin cambios de lógica).
export const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const AREAS = ['COCINA', 'BARRA', 'AYUDANTE', 'MESEROS', 'HOSTESS', 'CAJA'];

export function fmtMoney(n) {
  if (n == null || n === '' || isNaN(Number(n))) return '—';
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function fmtNum(n) {
  if (n == null || n === '' || isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('es-MX');
}
export function fmtPct(n) {
  if (n == null || isNaN(Number(n))) return '—';
  return (Number(n) * 100).toFixed(1).replace('.', ',') + ' %';
}
export function fmtWeek(d) {
  if (!d) return '—';
  const p = String(d).split('-');
  if (p.length !== 3) return String(d);
  return Number(p[2]) + ' ' + MESES[Number(p[1]) - 1] + ' ' + p[0];
}
export function num(v, def) {
  const n = parseFloat(v);
  return isNaN(n) ? (def == null ? 0 : def) : n;
}

/* ---------------- semana ISO 8601 ---------------- */
// La semana empieza en lunes; la semana 1 es la que contiene el primer
// jueves del año. 2026-11-02 = Semana 45; 2026-11-23 = Semana 48;
// 2026 tiene 53 semanas ISO; 2025-12-29 = Semana 01 de 2026.
export function isoWeekOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // 0 = lunes
  x.setDate(x.getDate() - day + 3); // jueves de esa semana
  const isoYear = x.getFullYear();
  const jan4 = new Date(isoYear, 0, 4);
  const jan4day = (jan4.getDay() + 6) % 7;
  const week1Mon = new Date(jan4);
  week1Mon.setDate(jan4.getDate() - jan4day);
  return [isoYear, Math.round((x - week1Mon) / 604800000) + 1];
}
export function weekNum(iso) {
  if (!iso) return null;
  const p = String(iso).split('-').map(Number);
  return isoWeekOf(new Date(p[0], p[1] - 1, p[2]))[1];
}
export function weekYear(iso) {
  if (!iso) return null;
  const p = String(iso).split('-').map(Number);
  return isoWeekOf(new Date(p[0], p[1] - 1, p[2]))[0];
}
export function mondayOfISOWeek(y, n) {
  const jan4 = new Date(y, 0, 4);
  const jan4day = (jan4.getDay() + 6) % 7;
  const m = new Date(jan4);
  m.setDate(jan4.getDate() - jan4day + (n - 1) * 7);
  return toISODate(m);
}
export function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}
export function toISODate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export function weekDays(iso) {
  const p = String(iso).split('-').map(Number);
  const base = new Date(p[0], p[1] - 1, p[2]);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(d);
  }
  return out;
}
export function weekRangeShort(iso) {
  const days = weekDays(iso);
  if (!days.length) return fmtWeek(iso);
  const a = days[0];
  const b = days[6];
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
    return a.getDate() + '–' + b.getDate() + ' ' + MESES[a.getMonth()] + ' ' + a.getFullYear();
  if (a.getFullYear() === b.getFullYear())
    return a.getDate() + ' ' + MESES[a.getMonth()] + ' – ' + b.getDate() + ' ' + MESES[b.getMonth()] + ' ' + a.getFullYear();
  return a.getDate() + ' ' + MESES[a.getMonth()] + ' ' + a.getFullYear() + ' – ' + b.getDate() + ' ' + MESES[b.getMonth()] + ' ' + b.getFullYear();
}
export function weekLabel(iso) {
  if (!iso) return '—';
  return 'Semana ' + weekNum(iso) + ' · ' + weekRangeShort(iso);
}
export function parseWeekRef(text, refISO) {
  if (!text) return null;
  const s = String(text);
  let m = s.match(/semana\s*[-_ ]?\s*(\d{1,2})/i);
  if (!m) m = s.match(/(?:^|[\s_\-])s(\d{1,2})(?![0-9])/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n < 1 || n > 53) return null;
  const y = refISO ? weekYear(refISO) : new Date().getFullYear();
  const today = toISODate(new Date());
  const tryYear = (yy) => {
    const mon = mondayOfISOWeek(yy, n);
    return weekNum(mon) === n && weekYear(mon) === yy ? mon : null;
  };
  let mon = tryYear(y);
  if (mon) {
    const diff = (new Date(mon) - new Date(today)) / 86400000;
    if (diff > 180) mon = tryYear(y - 1) || mon;
    else if (diff < -180) mon = tryYear(y + 1) || mon;
  }
  return mon;
}
export function weekRangeTitle(iso) {
  const days = weekDays(iso);
  if (!days.length) return 'Horario de la semana';
  const a = days[0];
  const b = days[6];
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
    return 'Horario de la semana del ' + a.getDate() + ' al ' + b.getDate() + ' de ' + MESES_LARGOS[a.getMonth()] + ' de ' + a.getFullYear();
  if (a.getFullYear() === b.getFullYear())
    return 'Horario de la semana del ' + a.getDate() + ' de ' + MESES_LARGOS[a.getMonth()] + ' al ' + b.getDate() + ' de ' + MESES_LARGOS[b.getMonth()] + ' de ' + a.getFullYear();
  return 'Horario de la semana del ' + a.getDate() + ' de ' + MESES_LARGOS[a.getMonth()] + ' de ' + a.getFullYear() + ' al ' + b.getDate() + ' de ' + MESES_LARGOS[b.getMonth()] + ' de ' + b.getFullYear();
}
export function reservationsRangeTitle(iso) {
  const days = weekDays(iso);
  if (!days.length) return 'Reservaciones de la semana';
  const a = days[0];
  const b = days[6];
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
    return 'Reservaciones de la semana del ' + a.getDate() + ' al ' + b.getDate() + ' de ' + MESES_LARGOS[a.getMonth()] + ' de ' + a.getFullYear();
  if (a.getFullYear() === b.getFullYear())
    return 'Reservaciones de la semana del ' + a.getDate() + ' de ' + MESES_LARGOS[a.getMonth()] + ' al ' + b.getDate() + ' de ' + MESES_LARGOS[b.getMonth()] + ' de ' + a.getFullYear();
  return 'Reservaciones de la semana del ' + a.getDate() + ' de ' + MESES_LARGOS[a.getMonth()] + ' de ' + a.getFullYear() + ' al ' + b.getDate() + ' de ' + MESES_LARGOS[b.getMonth()] + ' de ' + b.getFullYear();
}
export function fmtDateDMY(d) {
  if (!d) return '';
  const x = d instanceof Date ? d : new Date(d);
  if (isNaN(x)) return '';
  return x.getDate() + '/' + String(x.getMonth() + 1).padStart(2, '0') + '/' + x.getFullYear();
}
// El reporte POS trae su periodo ("DEL 01/11/2026 AL 09/11/2026").
// Regla: week_start = lunes de la semana ISO de (fecha inicial + 1 día).
// 01/11/2026 (domingo) + 1 día = 02/11/2026 → 2026-11-02, Semana 45.
export function weekStartFromPeriodStart(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return toISODate(mondayOf(x));
}
export function fmtHour12(hhmm) {
  if (!hhmm) return '';
  const p = String(hhmm).split(':');
  let h = parseInt(p[0], 10);
  const m = String(p[1] || '00').padStart(2, '0');
  if (isNaN(h)) return String(hhmm);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return h + ':' + m + ' ' + ap;
}
export function shiftClass(v) {
  const t = String(v || '').trim().toUpperCase();
  if (t === 'OFF') return 'off';
  if (t === 'F') return 'f';
  if (t) return 'work';
  return '';
}
export function greetingFor(date) {
  const h = date.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
