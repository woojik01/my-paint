import test from 'node:test';
import assert from 'node:assert/strict';
import { BRUSH_PRESETS, BRUSH_PRESETS_KEY, FAVORITES_KEY, loadCustomBrushPresets, loadToolFavorites, loadToolSizes, saveCustomBrushPresets, saveToolFavorites, saveToolSizes, TOOL_SIZES_KEY } from '../app/preferences.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('built-in brush presets have valid independent settings', () => {
  assert.deepEqual(BRUSH_PRESETS.map(p => p.id), ['basic', 'pencil', 'ink', 'marker', 'airbrush']);
  for (const preset of BRUSH_PRESETS) {
    assert.ok(preset.settings.size >= 1 && preset.settings.size <= 256);
    assert.ok(['pen', 'pencil', 'marker', 'airbrush'].includes(preset.settings.mode));
    assert.ok(preset.settings.opacity >= 1 && preset.settings.opacity <= 100);
    assert.ok(preset.settings.smoothing >= 0 && preset.settings.smoothing <= 80);
    assert.equal(typeof preset.settings.pressure, 'boolean');
  }
});

test('custom brush presets are validated, bounded and round-trip through storage', () => {
  const storage = memoryStorage();
  const presets = [
    { id: 'custom-1', name: '  Soft sketch  ', settings: { size: 999, opacity: 50, smoothing: -3, pressure: true } },
    { id: 'custom-2', name: '', settings: { size: 10, opacity: 50, smoothing: 20, pressure: false } },
    { id: 'custom-1', name: 'duplicate', settings: { size: 10, opacity: 50, smoothing: 20, pressure: false } },
  ];
  const saved = saveCustomBrushPresets(presets, storage);
  assert.deepEqual(saved, [{ id: 'custom-1', name: 'Soft sketch', settings: { mode: 'pen', size: 256, opacity: 50, smoothing: 0, pressure: true } }]);
  assert.deepEqual(loadCustomBrushPresets(storage), saved);
  storage.setItem(BRUSH_PRESETS_KEY, '{bad json');
  assert.deepEqual(loadCustomBrushPresets(storage), []);
});

test('saved brush settings retain the selected mode and migrate older presets to pen', () => {
  const storage = memoryStorage();
  const saved = saveCustomBrushPresets([
    { id: 'custom-marker', name: 'Wide marker', settings: { mode: 'marker', size: 28, opacity: 66, smoothing: 10, pressure: false } },
    { id: 'custom-old', name: 'Old preset', settings: { size: 10, opacity: 80, smoothing: 20, pressure: true } },
  ], storage);
  assert.deepEqual(saved.map(preset => preset.settings.mode), ['marker', 'pen']);
  assert.deepEqual(loadCustomBrushPresets(storage), saved);
});

test('tool favorites keep only known tools and remove duplicates', () => {
  const storage = memoryStorage({ [FAVORITES_KEY]: JSON.stringify(['brush', 'unknown', 'brush', 'eraser']) });
  const allowed = ['brush', 'eraser', 'fill'];
  assert.deepEqual(loadToolFavorites(storage, allowed), ['brush', 'eraser']);
  assert.deepEqual(saveToolFavorites(['fill', 'brush', 'fill', 'unknown'], storage, allowed), ['fill', 'brush']);
  assert.deepEqual(JSON.parse(storage.getItem(FAVORITES_KEY)), ['fill', 'brush']);
});

test('brush, eraser and shape sizes persist independently and stay within bounds', () => {
  const storage = memoryStorage();
  const saved = saveToolSizes({ brush: 18, eraser: 42, rectangle: 999, ellipse: 2, fill: 90 }, storage);
  assert.deepEqual(saved, { brush: 18, eraser: 42, rectangle: 256, ellipse: 2 });
  assert.deepEqual(loadToolSizes(storage), saved);
  assert.deepEqual(JSON.parse(storage.getItem(TOOL_SIZES_KEY)), saved);
});
