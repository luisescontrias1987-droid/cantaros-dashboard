// Captura semanal: venta por mesero (tarjetas con mini gráfica y orden;
// cada tarjeta se puede editar y eliminar con PIN 2026) y subida de
// inventarios. La subida del reporte POS vive solo en el Panel.
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Trash2, ArrowUpDown, Banknote, Pencil } from 'lucide-react';
import { useDashboard } from '../store/DashboardContext.jsx';
import { fmtMoney, num, weekLabel, weekNum } from '../lib/utils.js';
import { EmptyState, Modal, PinModal, SectionTitle } from './ui.jsx';

export default function Captura() {
  const d = useDashboard();
  const [waiterId, setWaiterId] = useState('');
  const [total, setTotal] = useState('');
  const [status, setStatus] = useState('');
  const [invFile, setInvFile] = useState(null);
  const [invArea, setInvArea] = useState('barra');
  const [invWeek, setInvWeek] = useState(d.invWeekBarra);
  const [invStatus, setInvStatus] = useState('');
  const [editTarget, setEditTarget] = useState(null); // { staffId, name, weekTotal }
  const [editTotal, setEditTotal] = useState('');
  const [pinTarget, setPinTarget] = useState(null); // tarjeta a eliminar
  const [pinError, setPinError] = useState('');
  const [busy, setBusy] = useState(false);

  const waiters = useMemo(
    () => d.staff.filter((s) => s.area === 'MESEROS' && s.activo !== false).slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [d.staff],
  );

  useEffect(() => {
    d.refreshWaiterSales().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const waiterCards = useMemo(() => {
    const byName = {};
    d.ventasMeseroAll.forEach((r) => {
      const name = r.waiter || 'Sin nombre';
      if (!byName[name]) byName[name] = { name, staffId: r.staff_id, weeks: {}, total: 0 };
      byName[name].weeks[r.week_start] = num(r.total);
    });
    return Object.keys(byName)
      .map((name) => {
        const w = byName[name];
        const last8 = Object.keys(w.weeks).sort().slice(-8);
        return {
          name,
          staffId: w.staffId,
          weekTotal: num(w.weeks[d.waiterWeek]),
          hasSale: w.weeks[d.waiterWeek] != null,
          last8: last8.map((k) => ({ week: k, total: w.weeks[k] })),
          max: Math.max(...last8.map((k) => w.weeks[k]), 0),
        };
      })
      .sort((a, b) => d.waiterSortDir * (a.weekTotal - b.weekTotal));
  }, [d.ventasMeseroAll, d.waiterWeek, d.waiterSortDir]);

  const submitSale = async (e) => {
    e.preventDefault();
    if (!waiterId || !total) {
      setStatus('Elige un mesero y escribe el total de venta.');
      return;
    }
    const w = waiters.find((x) => x.id === waiterId);
    if (!w) return;
    setBusy(true);
    setStatus('Guardando…');
    try {
      await d.submitWaiterSale({ staffId: w.id, name: w.nombre, week: d.waiterWeek, total: num(total) });
      setStatus('Venta guardada: ' + w.nombre + ' · ' + weekLabel(d.waiterWeek) + ' · ' + fmtMoney(num(total)) + '.');
      setTotal('');
    } catch (err) {
      setStatus('No se pudo guardar: ' + (err.message || err));
    }
    setBusy(false);
  };

  const openEdit = (c) => {
    setEditTarget(c);
    setEditTotal(String(c.weekTotal || ''));
  };

  const submitEdit = async () => {
    if (!editTarget || editTotal === '') return;
    setBusy(true);
    try {
      await d.submitWaiterSale({ staffId: editTarget.staffId, name: editTarget.name, week: d.waiterWeek, total: num(editTotal) });
      setStatus('Venta actualizada: ' + editTarget.name + ' · ' + weekLabel(d.waiterWeek) + ' · ' + fmtMoney(num(editTotal)) + '.');
      setEditTarget(null);
    } catch (err) {
      setStatus('No se pudo guardar: ' + (err.message || err));
    }
    setBusy(false);
  };

  const confirmDeleteWaiter = async (pin) => {
    if (pin !== '2026') {
      setPinError('PIN incorrecto.');
      return;
    }
    setPinError('');
    const target = pinTarget;
    setPinTarget(null);
    setBusy(true);
    try {
      await d.deleteWaiterSale({ week: d.waiterWeek, staffId: target.staffId });
      setStatus('Venta eliminada: ' + target.name + ' · ' + weekLabel(d.waiterWeek) + '.');
    } catch (err) {
      setStatus('No se pudo eliminar: ' + (err.message || err));
    }
    setBusy(false);
  };

  const submitInv = async (e) => {
    e.preventDefault();
    if (!invFile) {
      setInvStatus('Elige el archivo de inventario (.csv, .xls o .xlsx).');
      return;
    }
    setBusy(true);
    setInvStatus('Subiendo…');
    try {
      const res = await d.uploadInventory({ file: invFile, area: invArea, week: invWeek });
      setInvStatus(
        'Inventario de ' + (invArea === 'barra' ? 'barra' : 'cocina') + ' subido: ' + res.total + ' productos en la ' +
          weekLabel(res.week) + '. Perdido ' + fmtMoney(res.perdido) + ' · Sobrante ' + fmtMoney(res.sobrante) + '.' +
          (res.detected ? ' Semana detectada del nombre de la hoja/archivo.' : ''),
      );
    } catch (err) {
      setInvStatus('No se pudo subir: ' + (err.message || err));
    }
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-3xl p-4 sm:p-5">
        <SectionTitle title="Venta por mesero" subtitle="Solo el total de venta y la semana. La venta por mesero no se suma al panel: el panel usa el reporte POS." />
        {!d.horariosReady && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
            Aún no hay personal cargado. Corre el SQL de horarios (Supabase-Cantaros-Horarios.sql) en Supabase para ver la lista de meseros.
          </p>
        )}
        <form onSubmit={submitSale} className="mt-4 grid gap-3 sm:grid-cols-4 [&>*]:min-w-0">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Mesero</span>
            <select value={waiterId} onChange={(e) => setWaiterId(e.target.value)} className="input mt-1" required>
              <option value="">Elige un mesero…</option>
              {waiters.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Semana</span>
            <select value={d.waiterWeek} onChange={(e) => d.setWaiterWeek(e.target.value)} className="input mt-1">
              {d.waiterWeeks.map((w) => (
                <option key={w} value={w}>
                  {weekLabel(w)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total de venta ($)</span>
            <input type="number" min="0" step="0.01" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} className="input mt-1" placeholder="0.00" required />
          </label>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full justify-center" disabled={busy}>
              <Banknote size={16} /> Guardar venta
            </button>
          </div>
        </form>
        {status && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{status}</p>}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900 dark:text-white">Ventas de la {weekLabel(d.waiterWeek)}</h3>
          <button type="button" className="btn-secondary" onClick={() => d.setWaiterSortDir(-d.waiterSortDir)}>
            <ArrowUpDown size={15} /> {d.waiterSortDir === -1 ? 'Mayor a menor' : 'Menor a mayor'}
          </button>
        </div>
        {waiterCards.length ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
            {waiterCards.map((c, i) => (
              <motion.div key={c.name} className="glass-card rounded-3xl p-4" whileHover={{ y: -5 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                <p className="mt-1 text-xl font-extrabold text-cyan-700 dark:text-cyan-300">{fmtMoney(c.weekTotal)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">en la {weekLabel(d.waiterWeek)}</p>
                {c.last8.length > 1 && (
                  <svg viewBox="0 0 200 56" className="mt-3 w-full" role="img" aria-label="Mini gráfica de las últimas semanas">
                    {c.last8.map((p, j) => {
                      const bw = 200 / c.last8.length;
                      const h = c.max > 0 ? Math.max(3, (p.total / c.max) * 44) : 0;
                      return (
                        <rect key={p.week} x={j * bw + 3} y={52 - h} width={bw - 6} height={h} rx={3} fill="#0891b2" opacity={p.week === d.waiterWeek ? 1 : 0.45} />
                      );
                    })}
                  </svg>
                )}
                {c.last8.length > 1 && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Últimas {c.last8.length} semanas: {c.last8.map((p) => 'S' + weekNum(p.week)).join(' · ')}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <button type="button" className="btn-secondary flex-1" onClick={() => openEdit(c)} disabled={busy}>
                    <Pencil size={15} /> Editar
                  </button>
                  {c.hasSale && c.staffId && (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => {
                        setPinError('');
                        setPinTarget(c);
                      }}
                      disabled={busy}
                    >
                      <Trash2 size={15} /> Eliminar
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState title={'Aún no hay ventas por mesero en la ' + weekLabel(d.waiterWeek)} subtitle="Captura el total de venta de cada mesero con el formulario de arriba." />
          </div>
        )}
      </div>

      <div className="glass-card rounded-3xl p-4 sm:p-5">
        <SectionTitle title="Subir inventario" subtitle="Archivo de inventario de barra o cocina (.csv, .xls o .xlsx). Los faltantes y sobrantes se calculan solos." />
        <form onSubmit={submitInv} className="mt-4 grid gap-3 sm:grid-cols-4 [&>*]:min-w-0">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Archivo</span>
            <input type="file" accept=".csv,.xls,.xlsx" onChange={(e) => setInvFile(e.target.files && e.target.files[0])} className="input mt-1" />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Área</span>
            <select value={invArea} onChange={(e) => setInvArea(e.target.value)} className="input mt-1">
              <option value="barra">Barra</option>
              <option value="cocina">Cocina</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Semana (lunes)</span>
            <input type="date" value={invWeek} onChange={(e) => setInvWeek(e.target.value)} className="input mt-1" />
          </label>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full justify-center" disabled={busy}>
              <Upload size={16} /> Subir inventario
            </button>
          </div>
        </form>
        {invStatus && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{invStatus}</p>}
      </div>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={editTarget ? 'Editar venta · ' + editTarget.name : ''}>
        {editTarget && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Total de venta de {editTarget.name} en la {weekLabel(d.waiterWeek)}.
            </p>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total de venta ($)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={editTotal}
                onChange={(e) => setEditTotal(e.target.value)}
                className="input mt-1"
                placeholder="0.00"
                autoFocus
              />
            </label>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setEditTarget(null)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary flex-1" onClick={submitEdit} disabled={busy}>
                Guardar cambios
              </button>
            </div>
          </div>
        )}
      </Modal>

      <PinModal
        open={!!pinTarget}
        title="Eliminar venta por mesero"
        message={
          pinTarget
            ? '¿Eliminar la venta de ' + pinTarget.name + ' en la ' + weekLabel(d.waiterWeek) + ' (' + fmtMoney(pinTarget.weekTotal) + ')? Solo se borra esa captura, no la semana entera. Escribe el PIN 2026 para confirmar.'
            : ''
        }
        error={pinError}
        onCancel={() => setPinTarget(null)}
        onOk={confirmDeleteWaiter}
      />
    </div>
  );
}
