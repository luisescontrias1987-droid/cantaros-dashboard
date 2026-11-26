// Piezas de UI compartidas: modales (confirmación y PIN), chips, títulos.
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { mondayOf, toISODate, weekLabel } from '../lib/utils.js';

// Selector de semana independiente: anterior/siguiente (±7 días), etiqueta
// con número de semana ("Semana 48 · 23–29 nov 2026") y salto a cualquier
// semana con un input de fecha que ajusta al lunes. Sin límites.
export function WeekStepper({ week, onChange, label }) {
  const shift = (days) => {
    const p = String(week).split('-').map(Number);
    const d = new Date(p[0], p[1] - 1, p[2]);
    d.setDate(d.getDate() + days);
    onChange(toISODate(mondayOf(d)));
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-label="Semana anterior"
        onClick={() => shift(-7)}
        className="rounded-full p-2 text-slate-500 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <ChevronLeft size={20} />
      </button>
      <span className="font-bold text-slate-900 dark:text-white text-sm">{label || weekLabel(week)}</span>
      <button
        type="button"
        aria-label="Semana siguiente"
        onClick={() => shift(7)}
        className="rounded-full p-2 text-slate-500 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <ChevronRight size={20} />
      </button>
      <input
        type="date"
        value={week}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
        className="input w-auto"
        aria-label="Ir a una semana"
      />
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={
              'glass-card relative w-full rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl ' +
              (wide ? 'sm:max-w-2xl' : 'sm:max-w-md')
            }
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="rounded-full p-2 text-slate-500 hover:bg-slate-500/10 dark:text-slate-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-3">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Modal de PIN: el PIN 2026 es solo una guarda contra borrados por
// accidente en el cliente, NO seguridad real. Ver README.
export function PinModal({ open, title, message, onCancel, onOk, error }) {
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState('');
  React.useEffect(() => {
    if (open) {
      setPin('');
      setLocalError('');
    }
  }, [open ]);
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        className="input mt-4 text-center text-2xl tracking-[0.5em]"
        placeholder="••••"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (pin.length === 0) return;
            onOk(pin);
          }
        }}
        autoFocus
      />
      {(error || localError) && (
        <p className="mt-2 text-sm font-semibold text-red-600">{error || localError}</p>
      )}
      <div className="mt-4 flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn-danger flex-1"
          onClick={() => {
            if (!pin) {
              setLocalError('Escribe el PIN.');
              return;
            }
            onOk(pin);
          }}
        >
          Confirmar
        </button>
      </div>
    </Modal>
  );
}

export function ConfirmModal({ open, title, children, confirmLabel, onCancel, onConfirm, danger }) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="text-sm text-slate-600 dark:text-slate-300">{children}</div>
      <div className="mt-4 flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className={(danger ? 'btn-danger' : 'btn-primary') + ' flex-1'} onClick={onConfirm}>
          {confirmLabel || 'Confirmar'}
        </button>
      </div>
    </Modal>
  );
}

export function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-full px-3.5 py-2 text-sm font-semibold transition min-h-[44px] ' +
        (active
          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
          : 'bg-white/70 text-slate-600 hover:bg-white dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20')
      }
    >
      {children}
    </button>
  );
}

export function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, subtitle }) {
  return (
    <div className="glass-card rounded-3xl p-6 text-center">
      <p className="font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}
