// Saludo grande con fecha y acciones rápidas.
import React from 'react';
import { motion } from 'framer-motion';
import { Upload, CalendarDays, PlusCircle } from 'lucide-react';
import { greetingFor, MESES_LARGOS } from '../lib/utils.js';

export default function Greeting({ onNavigate }) {
  const now = new Date();
  const fecha =
    now.getDate() +
    ' de ' +
    MESES_LARGOS[now.getMonth()] +
    ' de ' +
    now.getFullYear();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="flex flex-wrap items-end justify-between gap-3"
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {greetingFor(now)}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {fecha} · Cántaros, Cazos y Cantares
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={() => onNavigate('subir-pos')}>
          <Upload size={16} /> Subir reporte POS
        </button>
        <button type="button" className="btn-secondary" onClick={() => onNavigate('horarios')}>
          <CalendarDays size={16} /> Ver horarios
        </button>
        <button type="button" className="btn-secondary" onClick={() => onNavigate('captura')}>
          <PlusCircle size={16} /> Captura por mesero
        </button>
      </div>
    </motion.div>
  );
}
