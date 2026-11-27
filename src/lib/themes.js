// Temas visuales del dashboard. Solo presentación: no toca datos,
// llamadas a Supabase ni lógica de ningún componente.
// 'vidrio-oscuro' es el tema por default cuando no hay elección guardada.
// Reset único (27 nov 2026, por decisión de Joms): la primera vez que
// carga esta versión, TODOS arrancan en Vidrio oscuro aunque tuvieran
// una preferencia guardada de antes ('light'/'dark' o 'claro'/'vidrio').
// Después del reset, la elección del usuario vuelve a persistir normal.

export const THEME_RESET_KEY = 'cantaros-theme-reset-v1';

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

// Tema inicial al cargar la app. Si el reset único aún no se aplicó,
// fuerza Vidrio oscuro para todos (ignora cualquier preferencia
// guardada) y marca el reset como hecho. En cargas posteriores, la
// preferencia guardada se resuelve normal y persiste.
export function getInitialTheme() {
  let resetDone = false;
  try {
    resetDone = localStorage.getItem(THEME_RESET_KEY) === '1';
  } catch (e) {
    // Sin almacenamiento: no se puede marcar el reset; el default ya
    // es Vidrio oscuro y la elección solo vive en esta sesión.
  }
  if (!resetDone) {
    try {
      localStorage.setItem(THEME_RESET_KEY, '1');
      localStorage.setItem(THEME_STORAGE_KEY, DEFAULT_THEME);
    } catch (e) {
      // Sin almacenamiento: nada que guardar.
    }
    return DEFAULT_THEME;
  }
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY);
  } catch (e) {
    // Sin almacenamiento: default.
  }
  return resolveTheme(saved);
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
