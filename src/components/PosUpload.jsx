// Subida del reporte POS de Soft Restaurant + semanas cargadas.
// Vive SOLO en el Panel. Detecta la semana del periodo del propio reporte
// ("PRODUCTOS VENDIDOS DEL 01/11/2026 AL 09/11/2026"); si no trae periodo,
// del nombre de la hoja o del archivo; si no, de la semana elegida.
import React, { useEffect, useState } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { fmtDateDMY, fmtNum, parseWeekRef, weekLabel, weekNum, weekStartFromPeriodStart } from '../lib/utils.js';
import { parseReportPeriod, readSpreadsheetWithMeta } from '../lib/files.js';
import { PinModal, SectionTitle } from './ui.jsx';

export default function PosUpload() {
  const d = useDashboard();
  const [posFile, setPosFile] = useState(null);
  const [posWeek, setPosWeek] = useState(d.selectedWeek);
  const [posStatus, setPosStatus] = useState('');
  const [detectHint, setDetectHint] = useState('');
  const [uploaded, setUploaded] = useState([]);
  const [pinTarget, setPinTarget] = useState(null);
  const [pinError, setPinError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    d.refreshUploadedWeeks().then(setUploaded).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFileChange = async (f) => {
    setPosFile(f);
    setDetectHint('');
    if (!f) return;
    try {
      const meta = await readSpreadsheetWithMeta(f);
      const periodInfo = parseReportPeriod(meta.rows);
      if (periodInfo) {
        const w = weekStartFromPeriodStart(periodInfo.start);
        setPosWeek(w);
        setDetectHint(
          'Semana ' + weekNum(w) + ' detectada del periodo del reporte: ' +
          fmtDateDMY(periodInfo.start) + ' – ' + fmtDateDMY(periodInfo.end) + '.',
        );
        return;
      }
      const det = parseWeekRef(meta.sheetName, d.selectedWeek) || parseWeekRef(f.name, d.selectedWeek);
      if (det) {
        setPosWeek(det);
        setDetectHint('Semana detectada del nombre de la hoja/archivo: ' + weekLabel(det) + '.');
      } else {
        setDetectHint('El archivo no trae periodo ni número de semana; se usará la semana elegida.');
      }
    } catch (e) {
      setDetectHint('No se pudo leer el archivo para detectar la semana; se usará la semana elegida.');
    }
  };

  const submitPOS = async (e) => {
    e.preventDefault();
    if (!posFile) {
      setPosStatus('Elige el archivo del reporte POS (.csv, .xls o .xlsx).');
      return;
    }
    setBusy(true);
    setPosStatus('Subiendo…');
    try {
      const res = await d.uploadPOS({ file: posFile, week: posWeek });
      let msg = 'Reporte subido: ' + res.total + ' productos en la ' + weekLabel(res.week) + '.';
      if (res.detectedFrom === 'periodo') {
        msg += ' Semana ' + weekNum(res.week) + ' detectada del periodo del reporte: ' + res.periodText + '.';
      } else if (res.detected) {
        msg += ' Semana detectada del nombre de la hoja/archivo.';
      }
      if (res.noCost.length) msg += ' Sin costo: ' + res.noCost.join(', ') + '.';
      setPosStatus(msg);
      setUploaded(await d.refreshUploadedWeeks());
    } catch (err) {
      setPosStatus('No se pudo subir: ' + (err.message || err));
    }
    setBusy(false);
  };

  const confirmDeleteWeek = async (pin) => {
    if (pin !== '2026') {
      setPinError('PIN incorrecto.');
      return;
    }
    setPinError('');
    setPinTarget(null);
    setBusy(true);
    try {
      await d.deleteWeek(pinTarget.week);
      setUploaded(await d.refreshUploadedWeeks());
      setPosStatus('Semana ' + pinTarget.week + ' eliminada.');
    } catch (err) {
      setPosStatus('No se pudo eliminar: ' + (err.message || err));
    }
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      <div id="subir-pos-card" className="glass-card rounded-3xl p-4 sm:p-5">
        <SectionTitle title="Subir reporte POS" subtitle="Reporte de Soft Restaurant (.csv, .xls o .xlsx). La semana se detecta del periodo que trae el propio reporte; si no, del nombre de la hoja o del archivo, y si no, de la semana elegida." />
        <form onSubmit={submitPOS} className="mt-4 grid gap-3 sm:grid-cols-3 [&>*]:min-w-0">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Archivo del reporte</span>
            <input type="file" accept=".csv,.xls,.xlsx" onChange={(e) => onFileChange(e.target.files && e.target.files[0])} className="input mt-1" />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Semana (lunes)</span>
            <input type="date" value={posWeek} onChange={(e) => setPosWeek(e.target.value)} className="input mt-1" />
          </label>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full justify-center" disabled={busy}>
              <Upload size={16} /> Subir reporte
            </button>
          </div>
        </form>
        {detectHint && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{detectHint}</p>}
        {posStatus && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{posStatus}</p>}
      </div>

      <div className="glass-card rounded-3xl p-4 sm:p-5">
        <SectionTitle title="Semanas de ventas cargadas (reporte POS)" subtitle="Eliminar una semana borra sus ventas y su renglón en el reporte importado. Pide PIN 2026." />
        {uploaded.length ? (
          <ul className="mt-3 space-y-2">
            {uploaded.map((u) => (
              <li key={u.week} className="flex items-center justify-between gap-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 px-3 py-2.5">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {weekLabel(u.week)} · {fmtNum(u.count)} productos
                </span>
                <button type="button" className="btn-danger" onClick={() => { setPinError(''); setPinTarget(u); }} disabled={busy}>
                  <Trash2 size={15} /> Eliminar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No hay semanas de ventas cargadas desde el reporte POS.</p>
        )}
      </div>

      <PinModal
        open={!!pinTarget}
        title="Eliminar semana de ventas"
        message={
          pinTarget
            ? '¿Eliminar las ventas de la ' + weekLabel(pinTarget.week) + '? Se borran ' + fmtNum(pinTarget.count) + ' productos de esa semana. Escribe el PIN 2026 para confirmar.'
            : ''
        }
        error={pinError}
        onCancel={() => setPinTarget(null)}
        onOk={confirmDeleteWeek}
      />
    </div>
  );
}
