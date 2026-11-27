// Temas visuales del dashboard. Solo presentación: no toca datos,
// llamadas a Supabase ni lógica de ningún componente.
// 'vidrio-oscuro' es el tema por default cuando no hay elección guardada.
// Migración de la clave vieja ('dark'/'light'): 'dark' -> 'vidrio',
// 'light' -> 'claro', para respetar la elección que el usuario ya tenía.

export const THEMES = [
  {
    id: 'vidrio-oscuro',
    label: 'Vidrio oscuro',
    short: 'Oscuro',
    icon: 'moon-star',
    // Swatch: fondo, vidrio, acento.
    swatch: ['#05070d', '#12283d', '#22d3ee'],
  },
  {
    id: 'claro',
    label: 'Claro',
    short: 'Claro',
    icon: 'sun',
    swatch: ['#f8fafc', '#0f172a', '#2563eb'],
  },
  {
    id: 'vidrio',
    label: 'Vidrio',
    short: 'Vidrio',
    icon: 'droplets',
    swatch: ['#0b1f33', '#0e2a3f', '#2dd4bf'],
  },
];

export const THEME_IDS = THEMES.map((t) => t.id);
export const DEFAULT_THEME = 'vidrio-oscuro';
export const THEME_STORAGE_KEY = 'cantaros-theme';

export function themeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function resolveTheme(saved) {
  if (!saved) return DEFAULT_THEME;
  if (saved === 'dark') return 'vidrio';
  if (saved === 'light') return 'claro';
  if (THEME_IDS.indexOf(saved) !== -1) return saved;
  return DEFAULT_THEME;
}

// Aplica el tema al <html>: data-theme para los overrides de CSS y
// la clase .dark para las variantes dark: de Tailwind (los dos temas
// oscuros la usan; 'claro' no).
export function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme !== 'claro');
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    // Almacenamiento no disponible (modo privado, etc.): el tema solo
    // vive en esta sesión.
  }
}
