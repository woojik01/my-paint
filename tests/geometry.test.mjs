import test from 'node:test';
import assert from 'node:assert/strict';
import { shortestAngleDelta, snapRotationToZero } from '../app/geometry.js';

const radians = degrees => degrees * Math.PI / 180;

test('canvas rotation snaps to zero around both sides of a full turn', () => {
  assert.equal(snapRotationToZero(radians(0.5)), 0);
  assert.equal(snapRotationToZero(radians(355.1)), 0);
  assert.equal(snapRotationToZero(radians(-4.9)), 0);
  assert.equal(snapRotationToZero(radians(5.1)), radians(5.1));
});

test('two-finger rotation uses the shortest angle across the wrap boundary', () => {
  const delta = shortestAngleDelta(radians(179), radians(-179));
  assert.ok(Math.abs(delta - radians(2)) < 1e-10);
});
