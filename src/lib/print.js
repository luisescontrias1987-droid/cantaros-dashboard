// Ventanas imprimibles (PDF vía window.print). Portado de vercel-app/index.html.
import { AREAS, DIAS, MESES, fmtMoney, num, reservationsRangeTitle, toISODate, weekDays, weekLabel, weekNum, weekRangeTitle } from './utils.js';

function openPrintWindow(html, onBlocked) {
  const win = window.open('', '_blank');
  if (!win) {
    if (onBlocked) onBlocked();
    return null;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    try {
      win.print();
    } catch (e) {
      /* el usuario cerró la ventana */
    }
  }, 400);
  return win;
}

export function printSchedulePDF({ staff, horarios, eventos, horariosWeek }, onBlocked) {
  const days = weekDays(horariosWeek);
  const shiftMap = {};
  horarios.forEach((h) => {
    shiftMap[h.staff_id + '|' + h.dia] = h.turno || '';
  });
  let rowsHtml = '';
  let n = 0;
  AREAS.forEach((area) => {
    const members = staff.filter((s) => s.area === area);
    if (!members.length) return;
    rowsHtml += '<tr class="sec"><td colspan="9">' + area + '</td></tr>';
    members.forEach((s) => {
      n++;
      rowsHtml +=
        '<tr><td class="num">' + n + '</td><td><b>' + s.nombre + '</b></td>' +
        days
          .map((d) => {
            const v = String(shiftMap[s.id + '|' + toISODate(d)] || '').trim().toUpperCase();
            const cls = v === 'OFF' ? ' class="off"' : v === 'F' ? ' class="falta"' : '';
            return '<td' + cls + '>' + v + '</td>';
          })
          .join('') +
        '</tr>';
    });
  });
  const evs = (eventos || [])
    .map((e) => {
      const d = days.find((x) => toISODate(x) === e.dia);
      const label = d ? DIAS[days.indexOf(d)] + ' ' + d.getDate() + ' ' + MESES[d.getMonth()] : e.dia;
      const det = [];
      if (e.hora) det.push(e.hora);
      if (e.tipo_evento) det.push(e.tipo_evento);
      if (e.personas) det.push(e.personas + ' pers.');
      if (e.anticipo != null && num(e.anticipo) > 0) det.push('anticipo ' + fmtMoney(e.anticipo));
      return '<li><b>' + label + '</b> · ' + e.titulo + (det.length ? ' · ' + det.join(' · ') : '') + (e.nota ? ' — ' + e.nota : '') + '</li>';
    })
    .join('');
  const html =
    '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Semana ' +
    weekNum(horariosWeek) +
    ' · ' +
    weekRangeTitle(horariosWeek) +
    '</title><style>' +
    'body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1b2530;margin:24px}' +
    'h1{font-size:22px;margin:0 0 4px} p.sub{color:#667085;margin:0 0 18px}' +
    'table{width:100%;border-collapse:collapse;font-size:13px} th,td{border:1px solid #cbd5d1;padding:7px 8px;text-align:center}' +
    'th{background:#0d2e20;color:#fff} td:first-child,td:nth-child(2){text-align:left}' +
    'tr.sec td{background:#eef3f0;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:.05em;color:#667085}' +
    'td.off{background:#dbeafe;color:#175cd3;font-weight:700} td.falta{background:#fdecea;color:#c0392b;font-weight:700}' +
    'h2{font-size:15px;margin:22px 0 6px} li{margin:4px 0}' +
    '@media print{body{margin:0} @page{size:landscape}}' +
    '</style></head><body>' +
    '<h1>Semana ' +
    weekNum(horariosWeek) +
    ' · ' +
    weekRangeTitle(horariosWeek) +
    '</h1>' +
    '<p class="sub">Cántaros, Cazos y Cantares · Calle Sol #840 Oriente, Ciudad Juárez</p>' +
    '<table><thead><tr><th>#</th><th style="text-align:left">Nombre</th>' +
    days.map((d, i) => '<th>' + DIAS[i] + '</th>').join('') +
    '</tr></thead><tbody>' +
    (rowsHtml || '<tr><td colspan="9">Sin personal registrado.</td></tr>') +
    '</tbody></table>' +
    (evs ? '<h2>Reservaciones de la ' + weekLabel(horariosWeek) + '</h2><ul>' + evs + '</ul>' : '') +
    '<p class="sub" style="margin-top:18px">OFF = descanso · F = falta · 11:00 AM - CL = entrada a cierre · 2:00 PM - 5:00 PM = entrada y salida</p>' +
    '</body></html>';
  return openPrintWindow(html, onBlocked);
}

export function printReservationsPDF({ eventos, horariosWeek }, onBlocked) {
  const days = weekDays(horariosWeek);
  const rows = (eventos || [])
    .map((e) => {
      const d = days.find((x) => toISODate(x) === e.dia);
      const label = d ? DIAS[days.indexOf(d)] + ' ' + d.getDate() + ' ' + MESES[d.getMonth()] : e.dia;
      return (
        '<tr><td>' + label + '</td><td>' + (e.hora || '—') + '</td><td><b>' + e.titulo + '</b></td>' +
        '<td>' + (e.tipo_evento || '—') + '</td><td class="num">' + (e.personas ? e.personas : '—') + '</td>' +
        '<td class="num">' + (e.anticipo != null && num(e.anticipo) > 0 ? fmtMoney(e.anticipo) : '—') + '</td>' +
        '<td>' + (e.nota || '') + '</td></tr>'
      );
    })
    .join('');
  const html =
    '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>' +
    reservationsRangeTitle(horariosWeek) +
    '</title><style>' +
    'body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1b2530;margin:24px}' +
    'h1{font-size:22px;margin:0 0 4px} p.sub{color:#667085;margin:0 0 18px}' +
    'table{width:100%;border-collapse:collapse;font-size:13px} th,td{border:1px solid #cbd5d1;padding:7px 8px;text-align:left}' +
    'th{background:#0d2e20;color:#fff} td.num{text-align:right}' +
    '@media print{body{margin:0} @page{size:landscape}}' +
    '</style></head><body>' +
    '<h1>' +
    reservationsRangeTitle(horariosWeek) +
    '</h1>' +
    '<p class="sub">Cántaros, Cazos y Cantares · Calle Sol #840 Oriente, Ciudad Juárez</p>' +
    '<table><thead><tr><th>Día</th><th>Hora</th><th>Reservación</th><th>Tipo</th><th>Personas</th><th>Anticipo</th><th>Notas</th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="7">Sin reservaciones en la ' + weekLabel(horariosWeek) + '.</td></tr>') +
    '</tbody></table>' +
    '</body></html>';
  return openPrintWindow(html, onBlocked);
}
