export const BRUSH_PRESETS = Object.freeze([
  { id: 'basic', nameKey: 'presetBasic', settings: { mode: 'pen', size: 12, opacity: 100, smoothing: 35, pressure: true } },
  { id: 'pencil', nameKey: 'presetPencil', settings: { mode: 'pencil', size: 5, opacity: 58, smoothing: 24, pressure: true } },
  { id: 'ink', nameKey: 'presetInk', settings: { mode: 'pen', size: 3, opacity: 100, smoothing: 58, pressure: true } },
  { id: 'marker', nameKey: 'presetMarker', settings: { mode: 'marker', size: 22, opacity: 62, smoothing: 12, pressure: false } },
  { id: 'airbrush', nameKey: 'presetAirbrush', settings: { mode: 'airbrush', size: 48, opacity: 72, smoothing: 8, pressure: true } },
]);

export const MAX_CUSTOM_BRUSH_PRESETS = 20;
export const FAVORITES_KEY = 'my-paint-tool-favorites-v1';
export const BRUSH_PRESETS_KEY = 'my-paint-brush-presets-v1';
export const BRUSH_MODES = Object.freeze(['pen', 'pencil', 'marker', 'airbrush']);

export function normalizeBrushMode(mode) {
  return BRUSH_MODES.includes(mode) ? mode : null;
}

export function normalizeBrushSettings(value) {
  if (!value || typeof value !== 'object') return null;
  const number = (key, min, max) => {
    const n = Number(value[key]);
    return Number.isFinite(n) ? Math.round(Math.min(max, Math.max(min, n))) : null;
  };
  const size = number('size', 1, 256);
  const opacity = number('opacity', 1, 100);
  const smoothing = number('smoothing', 0, 80);
  const mode = value.mode === undefined ? 'pen' : normalizeBrushMode(value.mode);
  if (size === null || opacity === null || smoothing === null || !mode || typeof value.pressure !== 'boolean') return null;
  return { mode, size, opacity, smoothing, pressure: value.pressure };
}

export function normalizeCustomBrushPreset(value) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !/^custom-[\w-]{1,80}$/.test(value.id)) return null;
  if (typeof value.name !== 'string' || !value.name.trim()) return null;
  const settings = normalizeBrushSettings(value.settings);
  if (!settings) return null;
  return { id: value.id, name: value.name.trim().slice(0, 32), settings };
}

export function loadCustomBrushPresets(storage = globalThis.localStorage) {
  try {
    if (!storage) return [];
    const raw = JSON.parse(storage.getItem(BRUSH_PRESETS_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    return raw.map(normalizeCustomBrushPreset).filter(p => p && !seen.has(p.id) && seen.add(p.id)).slice(0, MAX_CUSTOM_BRUSH_PRESETS);
  } catch {
    return [];
  }
}

export function saveCustomBrushPresets(presets, storage = globalThis.localStorage) {
  const seen = new Set();
  const safe = (Array.isArray(presets) ? presets : [])
    .map(normalizeCustomBrushPreset)
    .filter(p => p && !seen.has(p.id) && seen.add(p.id))
    .slice(0, MAX_CUSTOM_BRUSH_PRESETS);
  if (!storage) return safe;
  storage.setItem(BRUSH_PRESETS_KEY, JSON.stringify(safe));
  return safe;
}

export function loadToolFavorites(storage = globalThis.localStorage, allowed = []) {
  try {
    if (!storage) return [];
    const raw = JSON.parse(storage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(raw) ? [...new Set(raw.filter(name => allowed.includes(name)))] : [];
  } catch {
    return [];
  }
}

export function saveToolFavorites(favorites, storage = globalThis.localStorage, allowed = []) {
  const safe = [...new Set((Array.isArray(favorites) ? favorites : []).filter(name => allowed.includes(name)))];
  if (storage) storage.setItem(FAVORITES_KEY, JSON.stringify(safe));
  return safe;
}
