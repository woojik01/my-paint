import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { BRUSH_MODES, createBrushTexture, drawBrushDot, drawBrushSegment } from '../app/brush.js';

test('each brush mode renders its own stroke appearance', () => {
  const outputs = BRUSH_MODES.map(mode => {
    const canvas = createCanvas(100, 60), ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 100, 60);
    ctx.fillStyle = '#36224f'; ctx.strokeStyle = '#36224f';
    const texture = createBrushTexture(ctx, mode, '#36224f', (width, height) => createCanvas(width, height));
    drawBrushDot(ctx, { x: 20, y: 30, width: 16, mode, texture });
    drawBrushSegment(ctx, { from: { x: 20, y: 30 }, to: { x: 80, y: 30 }, width: 16, color: '#36224f', mode, texture });
    return Buffer.from(ctx.getImageData(0, 0, 100, 60).data).toString('base64');
  });
  assert.equal(new Set(outputs).size, BRUSH_MODES.length);
});
