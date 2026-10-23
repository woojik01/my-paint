import test from 'node:test';
import assert from 'node:assert/strict';
import { BRUSH_PRESETS, BRUSH_PRESETS_KEY, FAVORITES_KEY, loadCustomBrushPresets, loadToolFavorites, saveCustomBrushPresets, saveToolFavorites } from '../app/preferences.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('built-in brush presets have valid independent settings', () => {
  assert.deepEqual(BRUSH_PRESETS.map(p => p.id), ['basic', 'pencil', 'ink', 'marker']);
  for (const preset of BRUSH_PRESETS) {
    assert.ok(preset.settings.size >= 1 && preset.settings.size <= 160);
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
  assert.deepEqual(saved, [{ id: 'custom-1', name: 'Soft sketch', settings: { size: 160, opacity: 50, smoothing: 0, pressure: true } }]);
  assert.deepEqual(loadCustomBrushPresets(storage), saved);
  storage.setItem(BRUSH_PRESETS_KEY, '{bad json');
  assert.deepEqual(loadCustomBrushPresets(storage), []);
});

test('tool favorites keep only known tools and remove duplicates', () => {
  const storage = memoryStorage({ [FAVORITES_KEY]: JSON.stringify(['brush', 'unknown', 'brush', 'eraser']) });
  const allowed = ['brush', 'eraser', 'fill'];
  assert.deepEqual(loadToolFavorites(storage, allowed), ['brush', 'eraser']);
  assert.deepEqual(saveToolFavorites(['fill', 'brush', 'fill', 'unknown'], storage, allowed), ['fill', 'brush']);
  assert.deepEqual(JSON.parse(storage.getItem(FAVORITES_KEY)), ['fill', 'brush']);
});
