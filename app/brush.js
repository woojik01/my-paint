export const BRUSH_MODES = Object.freeze(['pen', 'pencil', 'marker', 'airbrush']);

function rgba(color, alpha) {
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? [...hex].map(value => value + value).join('') : hex;
  const channels = full.match(/\w{2}/g)?.slice(0, 3).map(value => parseInt(value, 16)) || [0, 0, 0];
  return `rgba(${channels.join(',')},${alpha})`;
}

export function createBrushTexture(ctx, mode, color, makeCanvas) {
  if (mode === 'airbrush') {
    const texture = makeCanvas(128, 128), brush = texture.getContext('2d');
    const gradient = brush.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, rgba(color, .24));
    gradient.addColorStop(.35, rgba(color, .16));
    gradient.addColorStop(1, rgba(color, 0));
    brush.fillStyle = gradient;
    brush.fillRect(0, 0, 128, 128);
    return texture;
  }
  if (mode === 'pencil') {
    const texture = makeCanvas(64, 64), brush = texture.getContext('2d'), image = brush.createImageData(64, 64);
    const hex = color.replace('#', ''), full = hex.length === 3 ? [...hex].map(value => value + value).join('') : hex;
    const channels = full.match(/\w{2}/g)?.slice(0, 3).map(value => parseInt(value, 16)) || [0, 0, 0];
    let seed = 0x5eed;
    for (let i = 0; i < image.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      image.data[i] = channels[0]; image.data[i + 1] = channels[1]; image.data[i + 2] = channels[2];
      image.data[i + 3] = (seed >>> 24) < 58 ? 0 : 75 + ((seed >>> 16) % 150);
    }
    brush.putImageData(image, 0, 0);
    return ctx.createPattern(texture, 'repeat');
  }
  return null;
}

export function drawBrushDot(ctx, { x, y, width, mode = 'pen', texture = null }) {
  ctx.save();
  if (mode === 'airbrush' && texture) {
    const size = Math.max(1, width * 1.35);
    ctx.globalAlpha = .09;
    ctx.drawImage(texture, x - size / 2, y - size / 2, size, size);
  } else {
    const scale = mode === 'marker' ? 1.6 : mode === 'pencil' ? .72 : 1;
    if (mode === 'marker') ctx.globalAlpha = .68;
    ctx.fillStyle = mode === 'pencil' && texture ? texture : ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(.5, width * scale / 2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawBrushSegment(ctx, { from, to, width, color, mode = 'pen', texture = null }) {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (mode === 'airbrush' && texture) {
    const size = Math.max(1, width * 1.35), spacing = Math.max(.75, size * .14);
    const distance = Math.hypot(to.x - from.x, to.y - from.y), steps = Math.max(1, Math.ceil(distance / spacing));
    ctx.globalAlpha = .09;
    for (let i = 1; i <= steps; i++) {
      const ratio = i / steps, x = from.x + (to.x - from.x) * ratio, y = from.y + (to.y - from.y) * ratio;
      ctx.drawImage(texture, x - size / 2, y - size / 2, size, size);
    }
  } else {
    const scale = mode === 'marker' ? 1.6 : mode === 'pencil' ? .72 : 1;
    ctx.lineWidth = Math.max(.5, width * scale);
    ctx.strokeStyle = mode === 'pencil' && texture ? texture : color;
    if (mode === 'marker') ctx.globalAlpha = .68;
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
  }
  ctx.restore();
}


function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function taperFactor(distance, sharpness, length) {
  const amount = clamp(sharpness, 0, 100) / 100;
  if (amount <= 0) return 1;
  const progress = clamp(distance / length, 0, 1);
  const eased = progress * progress * (3 - 2 * progress);
  return Math.max(.025, 1 - amount * (1 - eased));
}

export function drawBrushStroke(ctx, {
  points, size, color, mode = 'pen', texture = null,
  startSharpness = 0, endSharpness = 0,
}) {
  if (!Array.isArray(points) || points.length === 0) return;
  const scale = mode === 'marker' ? 1.6 : mode === 'pencil' ? .72 : 1;
  const totalWidth = points.reduce((width, point) => Math.max(width, Number(point.width) || size), 1);
  const spacing = Math.max(.75, Math.min(6, totalWidth * scale * .22));
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const totalLength = lengths[lengths.length - 1];
  if (points.length < 2 || totalLength < .01) {
    const point = points[0];
    drawBrushDot(ctx, { x: point.x, y: point.y, width: point.width || size, mode, texture });
    return;
  }

  const startLength = Math.max(size * scale * 2.5, 6);
  const endLength = Math.max(size * scale * 2.5, 6);
  const samples = [];
  const firstPoint = points[0];
  const firstTaper = Math.min(taperFactor(0, startSharpness, startLength), taperFactor(totalLength, endSharpness, endLength));
  samples.push({ x: firstPoint.x, y: firstPoint.y, radius: Math.max(.025, (Number(firstPoint.width) || size) * scale * firstTaper / 2) });
  for (let segment = 1; segment < points.length; segment++) {
    const from = points[segment - 1], to = points[segment];
    const distance = lengths[segment] - lengths[segment - 1];
    if (distance < .01) continue;
    const steps = Math.max(1, Math.ceil(distance / spacing));
    for (let step = 1; step <= steps; step++) {
      const ratio = step / steps;
      const travelled = lengths[segment - 1] + distance * ratio;
      const fromWidth = Number(from.width) || size, toWidth = Number(to.width) || size;
      const width = fromWidth + (toWidth - fromWidth) * ratio;
      const taper = Math.min(
        taperFactor(travelled, startSharpness, startLength),
        taperFactor(totalLength - travelled, endSharpness, endLength),
      );
      samples.push({
        x: from.x + (to.x - from.x) * ratio,
        y: from.y + (to.y - from.y) * ratio,
        radius: Math.max(.025, width * scale * taper / 2),
      });
    }
  }
  if (!samples.length) return;

  ctx.save();
  if (mode === 'airbrush' && texture) {
    for (const sample of samples) {
      drawBrushDot(ctx, { x: sample.x, y: sample.y, width: sample.radius * 2, mode, texture });
    }
    ctx.restore();
    return;
  }

  const left = [], right = [];
  for (let i = 0; i < samples.length; i++) {
    const before = samples[i - 1] || samples[i], after = samples[i + 1] || samples[i];
    const beforeLength = Math.hypot(samples[i].x - before.x, samples[i].y - before.y) || 1;
    const afterLength = Math.hypot(after.x - samples[i].x, after.y - samples[i].y) || 1;
    const t1 = { x: (samples[i].x - before.x) / beforeLength, y: (samples[i].y - before.y) / beforeLength };
    const t2 = { x: (after.x - samples[i].x) / afterLength, y: (after.y - samples[i].y) / afterLength };
    if (i === 0) { t1.x = t2.x; t1.y = t2.y; }
    if (i === samples.length - 1) { t2.x = t1.x; t2.y = t1.y; }
    let nx = t1.y + t2.y, ny = -t1.x - t2.x;
    const normalLength = Math.hypot(nx, ny);
    if (normalLength < .001) { nx = t2.y; ny = -t2.x; }
    else { nx /= normalLength; ny /= normalLength; }
    const denominator = Math.max(.25, nx * t2.y - ny * t2.x);
    const offset = Math.min(samples[i].radius * 3, samples[i].radius / denominator);
    left.push({ x: samples[i].x + nx * offset, y: samples[i].y + ny * offset });
    right.push({ x: samples[i].x - nx * offset, y: samples[i].y - ny * offset });
  }

  const first = samples[0], last = samples[samples.length - 1];
  const startNext = samples[1] || first, endPrevious = samples[samples.length - 2] || last;
  const startAngle = Math.atan2(startNext.y - first.y, startNext.x - first.x);
  const endAngle = Math.atan2(last.y - endPrevious.y, last.x - endPrevious.x);
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
  if (last.radius > .1) ctx.arc(last.x, last.y, last.radius, endAngle - Math.PI / 2, endAngle + Math.PI / 2);
  else ctx.lineTo(right[right.length - 1].x, right[right.length - 1].y);
  for (let i = right.length - 2; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  if (first.radius > .1) ctx.arc(first.x, first.y, first.radius, startAngle + Math.PI / 2, startAngle + Math.PI * 1.5);
  else ctx.lineTo(left[0].x, left[0].y);
  ctx.closePath();
  ctx.fillStyle = mode === 'pencil' && texture ? texture : color;
  if (mode === 'marker') ctx.globalAlpha = .68;
  ctx.fill();
  ctx.restore();
}
