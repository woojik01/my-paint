import test from 'node:test';
import assert from 'node:assert/strict';
import { reorderLayerStack } from '../app/layers.js';

const stack = () => [
  { id: 'group-a', type: 'group', parent: null },
  { id: 'paint-a', type: 'paint', parent: 'group-a' },
  { id: 'paint-b', type: 'paint', parent: null },
  { id: 'group-b', type: 'group', parent: null },
  { id: 'paint-c', type: 'paint', parent: 'group-b' },
];

test('root reorder keeps each group and its children together', () => {
  const layers = stack();
  const reordered = reorderLayerStack(layers, 'paint-b', 'group-a', false);
  assert.deepEqual(reordered.map(layer => layer.id), ['paint-b', 'group-a', 'paint-a', 'group-b', 'paint-c']);
  assert.equal(layers[0].id, 'group-a');
});

test('child reorder stays inside its group and respects before/after placement', () => {
  const layers = [
    { id: 'group', type: 'group', parent: null },
    { id: 'paint-a', type: 'paint', parent: 'group' },
    { id: 'paint-b', type: 'paint', parent: 'group' },
    { id: 'outside', type: 'paint', parent: null },
  ];
  assert.deepEqual(reorderLayerStack(layers, 'paint-a', 'paint-b', true).map(layer => layer.id), ['group', 'paint-b', 'paint-a', 'outside']);
  assert.equal(reorderLayerStack(layers, 'paint-a', 'outside', false), null);
});

test('same-position and unknown layer moves are no-ops', () => {
  const layers = stack();
  assert.equal(reorderLayerStack(layers, 'paint-b', 'paint-b'), null);
  assert.equal(reorderLayerStack(layers, 'missing', 'paint-b'), null);
  assert.equal(reorderLayerStack(layers, 'paint-b', 'group-a', true), null);
});
