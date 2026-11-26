// Tarjeta KPI: ícono en círculo, número grande, etiqueta, subtexto y
// badge de variación (verde si sube, rojo si baja). Se eleva 5px al hover.
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function KpiCard({ icon: Icon, label, value, sub, delta, index }) {
  const up = delta != null && delta > 0.001;
  const down = delta != null && delta < -0.001;
  return (
    <motion.div
      className="glass-card rounded-3xl p-4 sm:p-5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: (index || 0) * 0.06, ease: 'easeOut' }}
      whileHover={{ y: -5 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-300">
          <Icon size={20} />
        </div>
        {delta != null && (
          <span
            className={
              'inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-bold ' +
              (up
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : down
                  ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                  : 'bg-slate-500/10 text-slate-500 dark:text-slate-400')
            }
          >
            {up ? <ArrowUpRight size={13} /> : down ? <ArrowDownRight size={13} /> : <Minus size={13} />}
            {Math.abs(delta * 100).toFixed(1).replace('.', ',') + ' %'}
          </span>
        )}
      </div>
      <p className="mt-3 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
        {value}
      </p>
      <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
    </motion.div>
  );
}
