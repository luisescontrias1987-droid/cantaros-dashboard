// Dibuja la tabla de horarios de la semana en un canvas (la usan
// "Ver imagen" y la descarga PNG). Portado de vercel-app/index.html.
// La imagen conserva los colores propios del horario (verde oscuro y
// dorado), como en la app actual.
import { AREAS, DIAS, MESES, fmtMoney, num, toISODate, weekDays, weekNum, weekRangeTitle } from './utils.js';

export function drawScheduleCanvas(canvas, { staff, horarios, eventos, horariosWeek }) {
  const ctx = canvas.getContext('2d');
  const days = weekDays(horariosWeek);
  const W = 1080;
  const pad = 14;
  const noW = 46;
  const nameW = 252;
  const dayW = (W - pad * 2 - noW - nameW) / 7;
  const titleH = 100;
  const headH = 66;
  const areaH = 40;
  const rowH = 50;
  const areaCount = AREAS.filter((a) => staff.some((s) => s.area === a)).length;
  const evs = (eventos || []).slice();
  const footH = evs.length ? 40 + evs.length * 32 + 26 : 40;
  const H = titleH + headH + areaCount * areaH + staff.length * rowH + footH + (staff.length ? 0 : 60);
  canvas.width = W;
  canvas.height = H;
  const FONT = '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  function fit(text, maxW, font) {
    ctx.font = font;
    let t = String(text == null ? '' : text);
    if (ctx.measureText(t).width <= maxW) return t;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1b2530';
  ctx.font = '800 30px ' + FONT;
  ctx.fillText(
    fit('Semana ' + weekNum(horariosWeek) + ' · ' + weekRangeTitle(horariosWeek), W - pad * 2 - 12, '800 30px ' + FONT),
    pad + 6,
    42,
  );
  ctx.fillStyle = '#667085';
  ctx.font = '600 21px ' + FONT;
  ctx.fillText('Cántaros, Cazos y Cantares · Calle Sol #840 Oriente, Ciudad Juárez', pad + 6, 78);
  let y = titleH;
  ctx.fillStyle = '#0d2e20';
  ctx.fillRect(pad, y, W - pad * 2, headH);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 21px ' + FONT;
  ctx.fillText('#', pad + 12, y + headH / 2);
  ctx.fillText('NOMBRE', pad + noW + 10, y + headH / 2);
  days.forEach((d, i) => {
    const x = pad + noW + nameW + i * dayW;
    const cx = x + dayW / 2;
    ctx.textAlign = 'center';
    ctx.font = '800 21px ' + FONT;
    ctx.fillText(DIAS[i], cx, y + 22);
    const dayEvs = evs.filter((e) => e.dia === toISODate(d));
    if (dayEvs.length) {
      ctx.fillStyle = '#e3c15e';
      ctx.font = '700 16px ' + FONT;
      ctx.fillText(fit(dayEvs.map((e) => '📅 ' + e.titulo).join(' · '), dayW - 12, '700 16px ' + FONT), cx, y + 48);
      ctx.fillStyle = '#ffffff';
    }
    ctx.textAlign = 'left';
  });
  y += headH;
  const shiftMap = {};
  horarios.forEach((h) => {
    shiftMap[h.staff_id + '|' + h.dia] = h.turno || '';
  });
  let n = 0;
  if (!staff.length) {
    ctx.fillStyle = '#667085';
    ctx.font = '600 22px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText('Sin personal registrado. Corre el SQL de horarios en Supabase o agrega personal en la app.', pad + 10, y + 40);
    y += 60;
  }
  AREAS.forEach((area) => {
    const members = staff.filter((s) => s.area === area);
    if (!members.length) return;
    ctx.fillStyle = '#eef3f0';
    ctx.fillRect(pad, y, W - pad * 2, areaH);
    ctx.fillStyle = '#667085';
    ctx.font = '800 19px ' + FONT;
    ctx.fillText(area, pad + 12, y + areaH / 2);
    y += areaH;
    members.forEach((s) => {
      n++;
      ctx.strokeStyle = '#e4e9e6';
      ctx.lineWidth = 1;
      ctx.strokeRect(pad + 0.5, y + 0.5, W - pad * 2 - 1, rowH - 1);
      ctx.fillStyle = '#667085';
      ctx.font = '700 20px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(String(n), pad + noW - 10, y + rowH / 2);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1b2530';
      ctx.font = '700 21px ' + FONT;
      ctx.fillText(fit(s.nombre, nameW - 16, '700 21px ' + FONT), pad + noW + 10, y + rowH / 2);
      days.forEach((d, i) => {
        const v = String(shiftMap[s.id + '|' + toISODate(d)] || '').trim().toUpperCase();
        const x = pad + noW + nameW + i * dayW;
        if (v === 'OFF') {
          ctx.fillStyle = '#dbeafe';
          ctx.fillRect(x + 1, y + 1, dayW - 2, rowH - 2);
          ctx.fillStyle = '#175cd3';
        } else if (v === 'F') {
          ctx.fillStyle = '#fdecea';
          ctx.fillRect(x + 1, y + 1, dayW - 2, rowH - 2);
          ctx.fillStyle = '#c0392b';
        } else if (v) {
          ctx.fillStyle = '#f7faf8';
          ctx.fillRect(x + 1, y + 1, dayW - 2, rowH - 2);
          ctx.fillStyle = '#1b2530';
        } else {
          ctx.fillStyle = '#667085';
        }
        if (v) {
          const fnt = v.length > 7 ? '800 16px ' + FONT : '800 21px ' + FONT;
          ctx.font = fnt;
          ctx.textAlign = 'center';
          ctx.fillText(fit(v, dayW - 8, fnt), x + dayW / 2, y + rowH / 2);
          ctx.textAlign = 'left';
        }
      });
      y += rowH;
    });
  });
  y += 10;
  ctx.fillStyle = '#1b2530';
  ctx.font = '800 21px ' + FONT;
  ctx.textAlign = 'left';
  if (evs.length) {
    ctx.fillText('Reservaciones de la semana', pad + 6, y + 12);
    y += 38;
    ctx.font = '600 19px ' + FONT;
    evs.forEach((e) => {
      const d = days.find((x) => toISODate(x) === e.dia);
      const label = d ? DIAS[days.indexOf(d)] + ' ' + d.getDate() + ' ' + MESES[d.getMonth()] : e.dia;
      ctx.fillStyle = '#667085';
      const det = [];
      if (e.hora) det.push(e.hora);
      if (e.tipo_evento) det.push(e.tipo_evento);
      if (e.personas) det.push(e.personas + ' pers.');
      if (e.anticipo != null && num(e.anticipo) > 0) det.push('anticipo ' + fmtMoney(e.anticipo));
      ctx.fillText(
        fit('• ' + label + ' · ' + e.titulo + (det.length ? ' · ' + det.join(' · ') : '') + (e.nota ? ' — ' + e.nota : ''), W - pad * 2 - 12, '600 19px ' + FONT),
        pad + 6,
        y + 10,
      );
      y += 32;
    });
  }
  ctx.fillStyle = '#667085';
  ctx.font = '600 17px ' + FONT;
  ctx.fillText('Generado desde el dashboard Cántaros · OFF = descanso · F = falta · 11:00 AM - CL = entrada a cierre · 2:00 PM - 5:00 PM = entrada y salida', pad + 6, H - 18);
  return canvas;
}
