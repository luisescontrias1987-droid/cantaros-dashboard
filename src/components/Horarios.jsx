// Horarios: tabla semanal por área, selector de turnos en formato 12h,
// editar/eliminar personal con Deshacer (10 s) y exportación de la imagen
// del horario (canvas), Excel y PDF.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye, FileSpreadsheet, FileText, MoreHorizontal,
  Plus, Trash2, Undo2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useDashboard } from '../store/DashboardContext.jsx';
import {
  AREAS, DIAS, MESES, shiftClass, toISODate, weekDays,
  weekLabel, weekNum, weekRangeTitle,
} from '../lib/utils.js';
import { drawScheduleCanvas } from '../lib/canvas.js';
import { printSchedulePDF } from '../lib/print.js';
import { Modal, ConfirmModal, WeekStepper } from './ui.jsx';

function parseShift(v) {
  const out = { entryH: 11, entryM: '00', entryAP: 'AM', exitH: 8, exitM: '00', exitAP: 'PM', close: false, kind: 'range' };
  const t = String(v || '').trim().toUpperCase();
  if (!t) return out;
  if (t === 'OFF') return { ...out, kind: 'off' };
  if (t === 'F') return { ...out, kind: 'f' };
  const to12 = (hh, mm) => {
    let h = parseInt(hh, 10);
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return { h, m: String(mm || '00').padStart(2, '0'), ap };
  };
  const m12 = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (m12) {
    return {
      entryH: parseInt(m12[1], 10), entryM: m12[2] || '00', entryAP: m12[3],
      exitH: parseInt(m12[4], 10), exitM: m12[5] || '00', exitAP: m12[6], close: false, kind: 'range',
    };
  }
  const mCL = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*-\s*CL$/);
  if (mCL) {
    let h = parseInt(mCL[1], 10);
    let ap = mCL[3];
    if (!ap) {
      if (h >= 12) {
        ap = 'PM';
        h = h % 12 || 12;
      } else ap = 'AM';
    }
    return { ...out, entryH: h, entryM: mCL[2] || '00', entryAP: ap, close: true, kind: 'range' };
  }
  const m24 = t.match(/^(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?$/);
  if (m24) {
    const e = to12(m24[1], m24[2]);
    const x = to12(m24[3], m24[4]);
    return { entryH: e.h, entryM: e.m, entryAP: e.ap, exitH: x.h, exitM: x.m, exitAP: x.ap, close: false, kind: 'range' };
  }
  return out;
}

function fmt12(h, m, ap) {
  return h + ':' + String(m).padStart(2, '0') + ' ' + ap;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINS = ['00', '15', '30', '45'];

function ShiftPickerModal({ open, person, dia, current, onClose, onSave }) {
  const [st, setSt] = useState(() => parseShift(current));
  useEffect(() => {
    if (open) setSt(parseShift(current));
  }, [open, current]);
  if (!open) return null;
  const save = (kind) => {
    let v = '';
    if (kind === 'off') v = 'OFF';
    else if (kind === 'f') v = 'F';
    else if (st.close) v = fmt12(st.entryH, st.entryM, st.entryAP) + ' - CL';
    else v = fmt12(st.entryH, st.entryM, st.entryAP) + ' - ' + fmt12(st.exitH, st.exitM, st.exitAP);
    onSave(v);
  };
  const sel = (label, value, onChange, options) => (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input mt-1">
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <Modal open={open} onClose={onClose} title={'Turno · ' + (person ? person.nombre : '')}>
      <p className="text-sm text-slate-500 dark:text-slate-400">{dia ? weekLabel(dia) : ''} · elige entrada y salida en formato de 12 horas, o cierre.</p>
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Entrada</p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {sel('Hora', st.entryH, (v) => setSt({ ...st, entryH: Number(v) }), HOURS)}
          {sel('Minutos', st.entryM, (v) => setSt({ ...st, entryM: v }), MINS)}
          {sel('AM / PM', st.entryAP, (v) => setSt({ ...st, entryAP: v }), ['AM', 'PM'])}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Salida</p>
        <label className="mt-1 flex items-center gap-2 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 px-3 py-3 min-h-[52px]">
          <input type="checkbox" checked={st.close} onChange={(e) => setSt({ ...st, close: e.target.checked })} className="h-5 w-5 accent-cyan-600" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Cierre (CL) — sale al cierre del restaurante</span>
        </label>
        {!st.close && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {sel('Hora', st.exitH, (v) => setSt({ ...st, exitH: Number(v) }), HOURS)}
            {sel('Minutos', st.exitM, (v) => setSt({ ...st, exitM: v }), MINS)}
            {sel('AM / PM', st.exitAP, (v) => setSt({ ...st, exitAP: v }), ['AM', 'PM'])}
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-primary flex-1" onClick={() => save('range')}>
          Guardar turno
        </button>
        <button type="button" className="btn-secondary" onClick={() => save('off')}>
          OFF
        </button>
        <button type="button" className="btn-secondary" onClick={() => save('f')}>
          F (falta)
        </button>
        <button type="button" className="btn-secondary" onClick={() => onSave('')}>
          Limpiar
        </button>
      </div>
    </Modal>
  );
}

export default function Horarios() {
  const d = useDashboard();
  const [dayIdx, setDayIdx] = useState(() => {
    const today = (new Date().getDay() + 6) % 7;
    return today;
  });
  const [picker, setPicker] = useState(null); // {staff, dia, current}
  const [staffModal, setStaffModal] = useState(null); // {staff}
  const [editName, setEditName] = useState('');
  const [editArea, setEditArea] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [newName, setNewName] = useState('');
  const [newArea, setNewArea] = useState('MESEROS');
  const [imgOpen, setImgOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState('');
  const [status, setStatus] = useState('');
  const canvasRef = useRef(null);

  const days = useMemo(() => weekDays(d.horariosWeek), [d.horariosWeek]);
  const shiftMap = useMemo(() => {
    const m = {};
    d.horarios.forEach((h) => {
      m[h.staff_id + '|' + h.dia] = h.turno || '';
    });
    return m;
  }, [d.horarios]);

  useEffect(() => {
    if (imgOpen && canvasRef.current) {
      drawScheduleCanvas(canvasRef.current, {
        staff: d.staff,
        horarios: d.horarios,
        eventos: d.eventos,
        horariosWeek: d.horariosWeek,
      });
      setImgUrl(canvasRef.current.toDataURL('image/png'));
    }
  }, [imgOpen, d.staff, d.horarios, d.eventos, d.horariosWeek]);

  const saveShift = async (v) => {
    if (!picker) return;
    await d.saveShift(picker.staff.id, picker.dia, v);
    setPicker(null);
  };

  const openStaffModal = (s) => {
    setEditName(s.nombre);
    setEditArea(s.area);
    setStaffModal({ staff: s });
  };

  const submitStaffEdit = async () => {
    const s = staffModal.staff;
    await d.saveStaffEdit(s.id, { nombre: s.nombre, area: s.area, activo: s.activo }, editName.trim(), editArea);
    setStaffModal(null);
    setStatus('Personal actualizado. Tienes 10 segundos para deshacer.');
  };

  const doDeleteStaff = async () => {
    const s = confirmDelete;
    setConfirmDelete(null);
    setStaffModal(null);
    await d.deleteStaff(s.id, { nombre: s.nombre, area: s.area, activo: s.activo });
    setStatus('Personal eliminado (desactivado). Tienes 10 segundos para deshacer.');
  };

  const submitNewStaff = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await d.submitStaff(newName.trim(), newArea);
    setNewName('');
    setStatus('Personal agregado: ' + newName.trim() + ' (' + newArea + ').');
  };

  const cellBtn = (s, day, v, compact) => {
    const cls = shiftClass(v);
    return (
      <button
        key={s.id + '|' + toISODate(day)}
        type="button"
        onClick={() => setPicker({ staff: s, dia: toISODate(day), current: v })}
        className={
          'min-h-[44px] rounded-xl px-1 text-xs sm:text-sm font-bold transition ' +
          (compact ? 'w-28 shrink-0 ' : 'w-full ') +
          (cls === 'off'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
            : cls === 'f'
              ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
              : cls === 'work'
                ? 'bg-white/70 text-slate-800 hover:bg-white dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/20'
                : 'text-slate-300 hover:bg-white/50 dark:text-slate-600 dark:hover:bg-white/10')
        }
      >
        {v || '—'}
      </button>
    );
  };

  const day = days[dayIdx] || days[0];
  const undoLeft = d.undoStaff ? Math.max(0, Math.ceil((d.undoStaff.until - Date.now()) / 1000)) : 0;

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Horarios</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {weekLabel(d.horariosWeek)} · {weekRangeTitle(d.horariosWeek)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <WeekStepper week={d.horariosWeek} onChange={(iso) => d.changeHorariosWeek(iso)} />
            <button type="button" className="btn-secondary" onClick={() => setImgOpen(true)}>
              <Eye size={16} /> Ver imagen
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                try {
                  await d.exportScheduleXLSX();
                  setStatus('Excel del horario descargado.');
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
                printSchedulePDF(
                  { staff: d.staff, horarios: d.horarios, eventos: d.eventos, horariosWeek: d.horariosWeek },
                  () => setStatus('El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.'),
                )
              }
            >
              <FileText size={16} /> Exportar PDF
            </button>
          </div>
        </div>

        {d.undoStaff && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 px-3 py-2.5">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {d.undoStaff.kind === 'delete' ? 'Personal eliminado: ' : 'Personal editado: '}
              {d.undoStaff.prev.nombre} · quedan {undoLeft} s para deshacer
            </p>
            <button type="button" className="btn-secondary" onClick={() => d.undoStaffChange()}>
              <Undo2 size={15} /> Deshacer
            </button>
          </div>
        )}

        {!d.horariosReady && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
            Aún no hay personal cargado. Corre el SQL de horarios (Supabase-Cantaros-Horarios.sql) en Supabase para ver los 18 del equipo.
          </p>
        )}

        {/* Vista móvil por día */}
        <div className="mt-4 md:hidden">
          <div className="flex items-center justify-between gap-2">
            <button type="button" aria-label="Día anterior" className="rounded-full p-2 text-slate-500 min-h-[44px] min-w-[44px] flex items-center justify-center" onClick={() => setDayIdx((dayIdx + 6) % 7)}>
              <ChevronLeft size={20} />
            </button>
            <p className="font-bold text-slate-900 dark:text-white">
              {day ? DIAS[dayIdx] + ' ' + day.getDate() + ' ' + MESES[day.getMonth()] : ''}
            </p>
            <button type="button" aria-label="Día siguiente" className="rounded-full p-2 text-slate-500 min-h-[44px] min-w-[44px] flex items-center justify-center" onClick={() => setDayIdx((dayIdx + 1) % 7)}>
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="mt-2 flex gap-1.5 overflow-x-auto thin-scroll pb-1" role="tablist" aria-label="Días de la semana">
            {days.map((dd, i) => (
              <button
                key={toISODate(dd)}
                type="button"
                role="tab"
                aria-selected={i === dayIdx}
                onClick={() => setDayIdx(i)}
                className={
                  'shrink-0 rounded-full px-3 py-2 text-sm font-bold min-h-[44px] ' +
                  (i === dayIdx ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white/70 text-slate-600 dark:bg-white/10 dark:text-slate-200')
                }
              >
                {DIAS[i]}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-4">
            {AREAS.map((area) => {
              const members = d.staff.filter((s) => s.area === area);
              if (!members.length) return null;
              return (
                <div key={area}>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{area}</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {members.map((s) => (
                      <li key={s.id} className="flex items-center gap-2 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 px-2 py-1.5">
                        <span className="flex-1 min-w-0 font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{s.nombre}</span>
                        {cellBtn(s, day, shiftMap[s.id + '|' + toISODate(day)] || '', true)}
                        <button
                          type="button"
                          aria-label={'Opciones de ' + s.nombre}
                          onClick={() => openStaffModal(s)}
                          className="rounded-full p-2 text-slate-500 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {!d.staff.length && <p className="text-sm text-slate-500 dark:text-slate-400">Sin personal registrado.</p>}
          </div>
        </div>

        {/* Tabla completa (escritorio) */}
        <div className="mt-4 hidden md:block overflow-x-auto thin-scroll">
          <table className="w-full text-sm min-w-[760px] border-separate" style={{ borderSpacing: 0 }}>
            <thead>
              <tr>
                <th className="text-left px-2 py-2 w-10 text-xs uppercase tracking-wide text-slate-400">#</th>
                <th className="text-left px-2 py-2 text-xs uppercase tracking-wide text-slate-400">Nombre</th>
                {days.map((dd, i) => (
                  <th key={toISODate(dd)} className="px-1 py-2 text-center text-xs uppercase tracking-wide text-slate-400">
                    {DIAS[i]}
                    <span className="block font-normal normal-case">{dd.getDate()}</span>
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {AREAS.map((area) => {
                const members = d.staff.filter((s) => s.area === area);
                if (!members.length) return null;
                return (
                  <React.Fragment key={area}>
                    <tr>
                      <td colSpan={10} className="px-2 pt-3 pb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                        {area}
                      </td>
                    </tr>
                    {members.map((s, idx) => (
                      <tr key={s.id} className="border-t border-slate-200/60 dark:border-white/10">
                        <td className="px-2 py-1.5 text-slate-400">{idx + 1}</td>
                        <td className="px-2 py-1.5 font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">{s.nombre}</td>
                        {days.map((dd) => (
                          <td key={toISODate(dd)} className="px-1 py-1.5">
                            {cellBtn(s, dd, shiftMap[s.id + '|' + toISODate(dd)] || '')}
                          </td>
                        ))}
                        <td className="px-1 py-1.5">
                          <button
                            type="button"
                            aria-label={'Opciones de ' + s.nombre}
                            onClick={() => openStaffModal(s)}
                            className="rounded-full p-2 text-slate-500 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          >
                            <MoreHorizontal size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {!d.staff.length && <p className="py-3 text-sm text-slate-500 dark:text-slate-400">Sin personal registrado.</p>}
        </div>

        <form onSubmit={submitNewStaff} className="mt-4 flex flex-wrap gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del personal" className="input flex-1 min-w-[180px]" aria-label="Nombre del personal" />
          <select value={newArea} onChange={(e) => setNewArea(e.target.value)} className="input w-auto" aria-label="Área">
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary">
            <Plus size={16} /> Agregar personal
          </button>
        </form>
        {status && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{status}</p>}
      </div>

      <ShiftPickerModal
        open={!!picker}
        person={picker && picker.staff}
        dia={picker && picker.dia}
        current={picker && picker.current}
        onClose={() => setPicker(null)}
        onSave={saveShift}
      />

      <Modal open={!!staffModal} onClose={() => setStaffModal(null)} title={staffModal ? 'Opciones · ' + staffModal.staff.nombre : ''}>
        {staffModal && (
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nombre</span>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input mt-1" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Área</span>
              <select value={editArea} onChange={(e) => setEditArea(e.target.value)} className="input mt-1">
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <button type="button" className="btn-primary flex-1" onClick={submitStaffEdit}>
                Guardar cambios
              </button>
              <button type="button" className="btn-danger" onClick={() => setConfirmDelete(staffModal.staff)}>
                <Trash2 size={15} /> Eliminar
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Eliminar desactiva a la persona (no borra sus turnos). Tienes 10 segundos para deshacer el cambio.
            </p>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        title="Eliminar personal"
        confirmLabel="Sí, eliminar"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={doDeleteStaff}
      >
        <p>
          ¿Eliminar a <b>{confirmDelete && confirmDelete.nombre}</b> del horario? Se desactiva (sus turnos se conservan) y tienes 10 segundos para
          deshacer.
        </p>
      </ConfirmModal>

      <Modal open={imgOpen} onClose={() => setImgOpen(false)} title={'Horario · ' + weekLabel(d.horariosWeek)} wide>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {weekRangeTitle(d.horariosWeek)} · {d.staff.length} personas · lista para compartir por WhatsApp.
        </p>
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        {imgUrl && <img src={imgUrl} alt={'Horario de la ' + weekLabel(d.horariosWeek)} className="mt-3 w-full rounded-2xl border border-slate-200/70 dark:border-white/10" />}
        {imgUrl && (
          <a href={imgUrl} download={'horarios-semana' + weekNum(d.horariosWeek) + '-' + d.horariosWeek + '.png'} className="btn-primary mt-4 inline-flex">
            Descargar PNG
          </a>
        )}
      </Modal>
    </div>
  );
}
