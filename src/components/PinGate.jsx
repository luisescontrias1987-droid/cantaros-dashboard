// Puerta con PIN antes de mostrar los datos.
// El PIN 2026 es solo una guarda contra miradas accidentales en el
// cliente, NO seguridad real. Ver README. La sesión se guarda en
// sessionStorage para no pedirlo en cada vista.
// Diseño glassy (vista previa login-glassy): tarjeta de vidrio dividida,
// formulario PIN a la izquierda y panel de marca con el logo a la derecha;
// en móvil se apila con la marca arriba. Solo cambia el aspecto: la
// lógica del PIN es la misma de antes.
import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

export default function PinGate({ onUnlock }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const inputsRef = useRef([]);

  // Lámparas del logo navideño: cada una se enciende/apaga por separado
  // y su estado persiste en localStorage. Default: encendidas.
  const [farolIzq, setFarolIzq] = useState(() => {
    try {
      return localStorage.getItem('cantaros-farol-izq') !== '0';
    } catch (e) {
      return true;
    }
  });
  const [farolDer, setFarolDer] = useState(() => {
    try {
      return localStorage.getItem('cantaros-farol-der') !== '0';
    } catch (e) {
      return true;
    }
  });

  const toggleFarol = (side) => {
    const key = side === 'izq' ? 'cantaros-farol-izq' : 'cantaros-farol-der';
    const set = side === 'izq' ? setFarolIzq : setFarolDer;
    const next = side === 'izq' ? !farolIzq : !farolDer;
    set(next);
    try {
      localStorage.setItem(key, next ? '1' : '0');
    } catch (e) {
      // Sin almacenamiento: el cambio solo vive en esta vista.
    }
  };

  const pin = digits.join('');

  const submit = (e) => {
    if (e) e.preventDefault();
    if (pin === '2026') {
      sessionStorage.setItem('cantaros-pin-ok', '1');
      onUnlock();
    } else {
      setError('PIN incorrecto. Inténtalo de nuevo.');
      setDigits(['', '', '', '']);
      if (inputsRef.current[0]) inputsRef.current[0].focus();
    }
  };

  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, '').slice(-1);
    setDigits((prev) => {
      const next = prev.slice();
      next[i] = d;
      return next;
    });
    if (d && i < 3 && inputsRef.current[i + 1]) inputsRef.current[i + 1].focus();
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0 && inputsRef.current[i - 1]) {
      inputsRef.current[i - 1].focus();
    }
    if (e.key === 'Enter') submit(e);
  };

  const onPaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4);
    if (!text) return;
    e.preventDefault();
    const next = ['', '', '', ''];
    text.split('').forEach((ch, j) => {
      next[j] = ch;
    });
    setDigits(next);
    const focusIdx = Math.min(3, text.length - 1);
    if (inputsRef.current[focusIdx]) inputsRef.current[focusIdx].focus();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        className="glass-card rounded-3xl overflow-hidden w-full max-w-3xl shadow-2xl"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col sm:flex-row">
          {/* Formulario PIN */}
          <div className="flex-1 p-6 sm:p-10 flex flex-col justify-center">
            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900 dark:text-white">
              Acceso al panel
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Ingresa tu PIN para ver el panel de Cántaros.
            </p>
            <form onSubmit={submit} className="mt-7">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                <Lock size={16} /> Escribe el PIN para entrar
              </label>
              <div className="mt-4 flex gap-3" onPaste={onPaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label={'Dígito ' + (i + 1) + ' del PIN'}
                    maxLength={1}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    autoFocus={i === 0}
                    className="h-14 w-12 sm:h-16 sm:w-14 rounded-2xl border border-slate-300/70 bg-white/80 text-center text-2xl font-bold text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-cyan-400 dark:border-white/20 dark:bg-white/10 dark:text-white"
                  />
                ))}
              </div>
              {error && <p className="mt-3 text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}
              <button type="submit" className="btn-primary w-full justify-center mt-6">
                Entrar
              </button>
            </form>
            <p className="mt-5 text-xs text-slate-400 dark:text-slate-500">
              El PIN solo evita que alguien abra el dashboard por accidente. No es seguridad real: para cuentas por
              persona se usa Supabase Auth.
            </p>
          </div>
          {/* Panel de marca: logo navideño COMPUESTO e INTERACTIVO — base
              sin faroles + las dos lámparas como botones independientes
              (coordenadas relativas a la base 917x734, ver index.css).
              El nombre ya va dentro del logo: no hay h2 de texto aparte. */}
          <div className="pin-brand order-first sm:order-last sm:w-[300px] shrink-0 px-6 py-8 sm:p-8 flex flex-col items-center justify-center text-center">
            <div className="logo-wrap">
              <img
                className="logo-base"
                src="/logo-navidad-sin-faroles.png"
                alt="Cántaros, Cazos y Cantares"
              />
              <button
                type="button"
                className={'farol farol-izq' + (farolIzq ? '' : ' apagada')}
                aria-label="Lámpara izquierda, toca para encender o apagar"
                aria-pressed={farolIzq}
                onClick={() => toggleFarol('izq')}
              >
                <span className="farol-glow" />
                <img src="/farol-izq.png" alt="" />
              </button>
              <button
                type="button"
                className={'farol farol-der' + (farolDer ? '' : ' apagada')}
                aria-label="Lámpara derecha, toca para encender o apagar"
                aria-pressed={farolDer}
                onClick={() => toggleFarol('der')}
              >
                <span className="farol-glow" />
                <img src="/farol-der.png" alt="" />
              </button>
            </div>
            <div className="farol-hint">Toca las lámparas para encenderlas o apagarlas</div>
            <div className="mt-5 h-[3px] w-16 rounded-full bg-[#d4a017]" />
            <p className="mt-4 text-sm leading-relaxed text-white/75">
              Panel de operación del restaurante: ventas, costos e inventario en vivo.
            </p>
            <p className="mt-4 text-[11px] font-semibold tracking-[0.18em] uppercase text-white/50">
              Ventas · Inventario · Horarios · Reservaciones
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
