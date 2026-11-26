// Reservaciones: vista propia (última del menú). Captura reservaciones
// (día, hora 12h, personas, tipo, título, notas, anticipo) y genera su
// reporte como el de Horarios: Ver imagen (canvas), Exportar Excel y PDF.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye, FileSpreadsheet, FileText, Plus, Trash2,
} from 'lucide-react';
import { useDashboard } from '../store/DashboardContext.jsx';
import {
  DIAS, MESES, fmtMoney, num, reservationsRangeTitle, toISODate, weekDays,
  weekLabel, weekNum,
} from '../lib/utils.js';
import { drawReservationsCanvas } from '../lib/canvas.js';
import { printReservationsPDF } from '../lib/print.js';
import { Modal, WeekStepper } from './ui.jsx';

export default function Reservaciones() {
  const d = useDashboard();
  const [evForm, setEvForm] = useState({ dia: '', hora: '19:00', titulo: '', tipo: 'Posada', personas: '', anticipo: '', nota: '' });
  const [imgOpen, setImgOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState('');
  const [status, setStatus] = useState('');
  const canvasRef = useRef(null);

  const days = useMemo(() => weekDays(d.reservacionesWeek), [d.reservacionesWeek]);

  useEffect(() => {
    if (imgOpen && canvasRef.current) {
      drawReservationsCanvas(canvasRef.current, {
        eventos: d.reservaciones,
        reservacionesWeek: d.reservacionesWeek,
      });
      setImgUrl(canvasRef.current.toDataURL('image/png'));
    }
  }, [imgOpen, d.reservaciones, d.reservacionesWeek]);

  useEffect(() => {
    setEvForm((f) => ({ ...f, dia: toISODate(days[4]) }));
  }, [days]);

  const submitEvent = async (e) => {
    e.preventDefault();
    if (!evForm.dia || !evForm.titulo.trim()) {
      setStatus('La reservación necesita día y nombre.');
      return;
    }
    const fmtHour = (hhmm) => {
      if (!hhmm) return '';
      const p = String(hhmm).split(':');
      let h = parseInt(p[0], 10);
      const m = String(p[1] || '00').padStart(2, '0');
      const ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      return h + ':' + m + ' ' + ap;
    };
    await d.submitEvent({
      week_start: d.reservacionesWeek,
      dia: evForm.dia,
      hora: fmtHour(evForm.hora),
      titulo: evForm.titulo.trim(),
      tipo_evento: evForm.tipo,
      personas: evForm.personas ? Number(evForm.personas) : null,
      anticipo: evForm.anticipo ? Number(evForm.anticipo) : null,
      nota: evForm.nota.trim() || null,
    });
    setEvForm({ dia: toISODate(days[4]), hora: '19:00', titulo: '', tipo: 'Posada', personas: '', anticipo: '', nota: '' });
    setStatus('Reservación agregada a la ' + weekLabel(d.reservacionesWeek) + '.');
  };

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reservaciones</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {weekLabel(d.reservacionesWeek)} · {reservationsRangeTitle(d.reservacionesWeek)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <WeekStepper week={d.reservacionesWeek} onChange={(iso) => d.changeReservacionesWeek(iso)} />
            <button type="button" className="btn-secondary" onClick={() => setImgOpen(true)}>
              <Eye size={16} /> Ver imagen
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                try {
                  await d.exportReservationsXLSX();
                  setStatus('Excel de reservaciones descargado.');
                } catch (err) {
                  setStatus('No se pudo exportar el Excel: ' + (err.message || err));
                }
              }}
            >
              <FileSpreadsheet size={16} /> Exportar Excel
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                printReservationsPDF(
                  { eventos: d.reservaciones, horariosWeek: d.reservacionesWeek },
                  () => setStatus('El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.'),
                )
              }
            >
              <FileText size={16} /> Exportar PDF
            </button>
          </div>
        </div>

        <form onSubmit={submitEvent} className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4 [&>*]:min-w-0">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Día</span>
            <select value={evForm.dia} onChange={(e) => setEvForm({ ...evForm, dia: e.target.value })} className="input mt-1" required>
              {days.map((dd, i) => (
                <option key={toISODate(dd)} value={toISODate(dd)}>
                  {DIAS[i]} {dd.getDate()} {MESES[dd.getMonth()]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Hora</span>
            <input type="time" value={evForm.hora} onChange={(e) => setEvForm({ ...evForm, hora: e.target.value })} className="input mt-1" />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Reservación / nombre</span>
            <input value={evForm.titulo} onChange={(e) => setEvForm({ ...evForm, titulo: e.target.value })} className="input mt-1" placeholder="Ej. Posada de la familia Gómez" required />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tipo de evento</span>
            <select value={evForm.tipo} onChange={(e) => setEvForm({ ...evForm, tipo: e.target.value })} className="input mt-1">
              {['Cumpleaños', 'Posada', 'Graduación', 'Boda', 'XV años', 'Empresarial', 'Otro'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Cantidad de personas</span>
            <input type="number" min="1" inputMode="numeric" value={evForm.personas} onChange={(e) => setEvForm({ ...evForm, personas: e.target.value })} className="input mt-1" placeholder="Ej. 25" />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Anticipo ($)</span>
            <input type="number" min="0" step="0.01" inputMode="decimal" value={evForm.anticipo} onChange={(e) => setEvForm({ ...evForm, anticipo: e.target.value })} className="input mt-1" placeholder="0.00" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Notas</span>
            <input value={evForm.nota} onChange={(e) => setEvForm({ ...evForm, nota: e.target.value })} className="input mt-1" placeholder="Ej. Mesa larga en terraza" />
          </label>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full justify-center">
              <Plus size={16} /> Agregar reservación
            </button>
          </div>
        </form>

        {d.reservaciones.length ? (
          <ul className="mt-4 space-y-2">
            {d.reservaciones.map((e) => {
              const dd = days.find((x) => toISODate(x) === e.dia);
              const label = dd ? DIAS[days.indexOf(dd)] + ' ' + dd.getDate() + ' ' + MESES[dd.getMonth()] : e.dia;
              const det = [];
              if (e.hora) det.push(e.hora);
              if (e.tipo_evento) det.push(e.tipo_evento);
              if (e.personas) det.push(e.personas + ' pers.');
              if (e.anticipo != null && num(e.anticipo) > 0) det.push('anticipo ' + fmtMoney(e.anticipo));
              return (
                <li key={e.id} className="flex items-start justify-between gap-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {label} · {e.titulo}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {det.join(' · ')}
                      {e.nota ? ' — ' + e.nota : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={'Eliminar reservación ' + e.titulo}
                    onClick={() => d.deleteEvent(e.id, d.reservacionesWeek)}
                    className="rounded-full p-2 text-red-500 hover:bg-red-500/10 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                  >
                    <Trash2 size={17} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Sin reservaciones esta semana.</p>
        )}
        {status && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{status}</p>}
      </div>

      <Modal open={imgOpen} onClose={() => setImgOpen(false)} title={'Reservaciones · ' + weekLabel(d.reservacionesWeek)} wide>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {reservationsRangeTitle(d.reservacionesWeek)} · {d.reservaciones.length} reservacion(es) · lista para compartir por WhatsApp.
        </p>
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        {imgUrl && <img src={imgUrl} alt={'Reservaciones de la ' + weekLabel(d.reservacionesWeek)} className="mt-3 w-full rounded-2xl border border-slate-200/70 dark:border-white/10" />}
        {imgUrl && (
          <a href={imgUrl} download={'reservaciones-semana' + weekNum(d.reservacionesWeek) + '-' + d.reservacionesWeek + '.png'} className="btn-primary mt-4 inline-flex">
            Descargar PNG
          </a>
        )}
      </Modal>
    </div>
  );
}
