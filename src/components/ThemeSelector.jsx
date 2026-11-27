// Selector de tema con animación líquida (framer-motion, spring suave).
// - ThemeSelector: botón desplegable para el header (desktop y móvil).
//   Al abrir, el menú emerge del botón con morph de border-radius tipo
//   gota/blob y la píldora compartida (layoutId) se desliza entre opciones.
// - ThemeList: lista vertical para el sidebar, con la misma píldora.
// Cada opción muestra un mini swatch de su paleta (3 bolitas) + nombre.
// La píldora usa un layoutId distinto por instancia (pillId) para que
// dos selectores en pantalla no se roben la animación.
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Droplets, MoonStar, Sun } from 'lucide-react';
import { THEMES, themeById } from '../lib/themes.js';

const ICONS = { 'moon-star': MoonStar, sun: Sun, droplets: Droplets };

const SPRING = { type: 'spring', stiffness: 380, damping: 28 };
const PILL_SPRING = { type: 'spring', stiffness: 500, damping: 38 };

export function ThemeSwatch({ theme }) {
  return (
    <span className="flex items-center gap-1 shrink-0" aria-hidden="true">
      {theme.swatch.map((c) => (
        <span
          key={c}
          className="h-3 w-3 rounded-full ring-1 ring-black/15 dark:ring-white/25"
          style={{ background: c }}
        />
      ))}
    </span>
  );
}

function ThemeOption({ t, active, onSelect, pillId }) {
  const Icon = ICONS[t.icon] || Droplets;
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onSelect}
      className="relative w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left min-h-[48px] cursor-pointer"
    >
      {active && (
        <motion.span
          layoutId={pillId}
          transition={PILL_SPRING}
          className="absolute inset-0 rounded-2xl bg-cyan-500/15 ring-1 ring-cyan-500/30 dark:bg-cyan-400/15 dark:ring-cyan-400/30"
          aria-hidden="true"
        />
      )}
      <span className="relative">
        <ThemeSwatch theme={t} />
      </span>
      <span className="relative flex-1 flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
        <Icon size={15} className="text-cyan-600 dark:text-cyan-300" />
        {t.label}
      </span>
      {active && <Check size={16} className="relative text-cyan-600 dark:text-cyan-300" aria-label="Tema activo" />}
    </button>
  );
}

export function ThemeSelector({ theme, onChange, pillId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = themeById(theme);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // Clic fuera: por listener de documento, no por backdrop fijo (el
    // header tiene backdrop-filter y recortaría un backdrop fixed).
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open ]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Cambiar tema"
        className="flex items-center gap-2 rounded-full px-2.5 py-2 text-slate-600 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/10 min-h-[44px] cursor-pointer"
      >
        <ThemeSwatch theme={current} />
        <span className="hidden sm:block text-sm font-bold">{current.short}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex">
          <ChevronDown size={15} />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            key="theme-menu"
            role="menu"
            aria-label="Temas"
            initial={{ opacity: 0, scale: 0.55, y: -10, borderRadius: '46% 54% 52% 48% / 54% 48% 52% 46%' }}
            animate={{ opacity: 1, scale: 1, y: 0, borderRadius: 20 }}
            exit={{ opacity: 0, scale: 0.6, y: -8, borderRadius: '50% 50% 50% 50% / 50% 50% 50% 50%' }}
            transition={SPRING}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-full mt-2 w-64 z-50 glass-strong rounded-[20px] p-2 shadow-2xl"
          >
            <p className="px-3 pt-2 pb-1 text-[11px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500">
              Tema
            </p>
            {THEMES.map((t) => (
              <ThemeOption
                key={t.id}
                t={t}
                active={theme === t.id}
                onSelect={() => {
                  onChange(t.id);
                  setOpen(false);
                }}
                pillId={pillId || 'theme-pill-header'}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ThemeList({ theme, onChange, pillId }) {
  return (
    <div role="radiogroup" aria-label="Tema">
      <p className="px-3 pb-2 text-[11px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
        Tema
      </p>
      <div className="space-y-1">
        {THEMES.map((t) => (
          <ThemeOption
            key={t.id}
            t={t}
            active={theme === t.id}
            onSelect={() => onChange(t.id)}
            pillId={pillId || 'theme-pill-sidebar'}
          />
        ))}
      </div>
    </div>
  );
}
