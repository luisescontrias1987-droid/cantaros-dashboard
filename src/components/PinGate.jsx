// Puerta con PIN antes de mostrar los datos.
// El PIN 2026 es solo una guarda contra miradas accidentales en el
// cliente, NO seguridad real. Ver README. La sesión se guarda en
// sessionStorage para no pedirlo en cada vista.
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

export default function PinGate({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (pin === '2026') {
      sessionStorage.setItem('cantaros-pin-ok', '1');
      onUnlock();
    } else {
      setError('PIN incorrecto. Inténtalo de nuevo.');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        className="glass-card rounded-3xl p-6 sm:p-8 w-full max-w-sm text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <img src="/logo-cantaros.png" alt="Cántaros, Cazos y Cantares" className="h-20 w-20 mx-auto rounded-3xl object-contain bg-white/80 p-2" />
        <h1 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">Cántaros, Cazos y Cantares</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Dashboard del restaurante</p>
        <form onSubmit={submit} className="mt-6">
          <label className="flex items-center justify-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            <Lock size={16} /> Escribe el PIN para entrar
          </label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            className="input mt-3 text-center text-2xl tracking-[0.5em]"
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            autoFocus
          />
          {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full justify-center mt-4">
            Entrar
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          El PIN solo evita que alguien abra el dashboard por accidente. No es seguridad real: para cuentas por persona se usa Supabase Auth.
        </p>
      </motion.div>
    </div>
  );
}
