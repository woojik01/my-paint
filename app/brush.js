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
