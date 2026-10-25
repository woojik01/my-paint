export function imageLocalPoint(point, transform) {
  const dx = point.x - transform.cx, dy = point.y - transform.cy;
  const c = Math.cos(transform.rotation || 0), s = Math.sin(transform.rotation || 0);
  return { x: dx * c + dy * s, y: -dx * s + dy * c };
}

export function imageWorldPoint(local, transform) {
  const c = Math.cos(transform.rotation || 0), s = Math.sin(transform.rotation || 0);
  return { x: transform.cx + local.x * c - local.y * s, y: transform.cy + local.x * s + local.y * c };
}

export function imageFrameBounds(transform) {
  const c = Math.abs(Math.cos(transform.rotation || 0)), s = Math.abs(Math.sin(transform.rotation || 0));
  const width = transform.width * c + transform.height * s;
  const height = transform.width * s + transform.height * c;
  return { x: transform.cx - width / 2, y: transform.cy - height / 2, width, height };
}

export function renderImageObject(base, source, transform, makeCanvas) {
  if (!base || !source || !transform || !(source.width > 0) || !(source.height > 0) || !(transform.width > 0) || !(transform.height > 0)) return base;
  const output = makeCanvas(base.width, base.height), ctx = output.getContext('2d');
  ctx.save();
  ctx.translate(transform.cx, transform.cy);
  ctx.rotate(transform.rotation || 0);
  ctx.scale(transform.flipX ? -1 : 1, transform.flipY ? -1 : 1);
  ctx.drawImage(base, source.x, source.y, source.width, source.height, -transform.width / 2, -transform.height / 2, transform.width, transform.height);
  ctx.restore();
  return output;
}

const handles = transform => [
  ['nw', -transform.width / 2, -transform.height / 2], ['n', 0, -transform.height / 2], ['ne', transform.width / 2, -transform.height / 2],
  ['e', transform.width / 2, 0], ['se', transform.width / 2, transform.height / 2], ['s', 0, transform.height / 2],
  ['sw', -transform.width / 2, transform.height / 2], ['w', -transform.width / 2, 0],
  ['rotate', 0, -transform.height / 2 - 24]
];

export function imageHandlePoints(transform, zoom = 1) {
  return handles(transform).map(([name, x, y]) => [name, x, name === 'rotate' ? -transform.height / 2 - 24 / Math.max(.025, zoom) : y]);
}

export function imageHandleAt(point, transform, zoom = 1) {
  const local = imageLocalPoint(point, transform), radius = 12 / Math.max(.025, zoom);
  for (const [name, x, y] of imageHandlePoints(transform, zoom)) {
    if (Math.hypot(local.x - x, local.y - y) <= radius) return name;
  }
  if (Math.abs(local.x) <= transform.width / 2 && Math.abs(local.y) <= transform.height / 2) return 'move';
  return null;
}

export function resizeImageTransform(transform, point, handle, keepAspect = true, minimum = 8, maximum = 8192) {
  const local = imageLocalPoint(point, transform);
  const sx = handle.includes('w') ? -1 : handle.includes('e') ? 1 : 0;
  const sy = handle.includes('n') ? -1 : handle.includes('s') ? 1 : 0;
  if (!sx && !sy) return { ...transform };
  const anchorX = sx ? -sx * transform.width / 2 : 0;
  const anchorY = sy ? -sy * transform.height / 2 : 0;
  let width = sx ? Math.max(minimum, Math.min(maximum, (local.x - anchorX) * sx)) : transform.width;
  let height = sy ? Math.max(minimum, Math.min(maximum, (local.y - anchorY) * sy)) : transform.height;
  if (sx && sy && keepAspect) {
    const scale = Math.max(width / transform.width, height / transform.height);
    width = Math.max(minimum, Math.min(maximum, transform.width * scale));
    height = Math.max(minimum, Math.min(maximum, transform.height * scale));
  }
  const activeX = sx ? anchorX + sx * width : 0;
  const activeY = sy ? anchorY + sy * height : 0;
  const center = imageWorldPoint({ x: sx ? (anchorX + activeX) / 2 : 0, y: sy ? (anchorY + activeY) / 2 : 0 }, transform);
  return { ...transform, cx: center.x, cy: center.y, width, height };
}

export function rotateImageTransform(transform, startPoint, point, snap = false) {
  const start = Math.atan2(startPoint.y - transform.cy, startPoint.x - transform.cx);
  const current = Math.atan2(point.y - transform.cy, point.x - transform.cx);
  let delta = current - start;
  if (snap) delta = Math.round(delta / (Math.PI / 12)) * (Math.PI / 12);
  let rotation = (transform.rotation || 0) + delta;
  rotation = ((rotation + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return { ...transform, rotation };
}

export function cropImageObject(source, transform, rect, minimum = 8) {
  if (!source || !transform || !rect) return null;
  const x1 = Math.max(0, Math.min(transform.width, rect.x));
  const y1 = Math.max(0, Math.min(transform.height, rect.y));
  const x2 = Math.max(0, Math.min(transform.width, rect.x + rect.width));
  const y2 = Math.max(0, Math.min(transform.height, rect.y + rect.height));
  const width = x2 - x1, height = y2 - y1;
  if (width < minimum || height < minimum) return null;
  const left = x1 / transform.width, top = y1 / transform.height;
  const right = x2 / transform.width, bottom = y2 / transform.height;
  const sourceLeft = transform.flipX ? 1 - right : left;
  const sourceTop = transform.flipY ? 1 - bottom : top;
  const nextSource = { x: source.x + sourceLeft * source.width, y: source.y + sourceTop * source.height, width: (right - left) * source.width, height: (bottom - top) * source.height };
  const localCenter = { x: ((x1 + x2) / 2 - transform.width / 2) * (transform.flipX ? -1 : 1), y: ((y1 + y2) / 2 - transform.height / 2) * (transform.flipY ? -1 : 1) };
  const center = imageWorldPoint(localCenter, transform);
  return { source: nextSource, transform: { ...transform, cx: center.x, cy: center.y, width, height } };
}

export function validImageObject(layer, documentWidth, documentHeight) {
  if (layer.imageObject !== true) return false;
  const source = layer.imageSourceBounds, transform = layer.imageTransform;
  if (!source || !transform) return false;
  const sourceNumbers = [source.x, source.y, source.width, source.height];
  const transformNumbers = [transform.cx, transform.cy, transform.width, transform.height, transform.rotation];
  if (![...sourceNumbers, ...transformNumbers].every(value => typeof value === 'number' && Number.isFinite(value))) return false;
  if (source.width <= 0 || source.height <= 0 || source.x < 0 || source.y < 0 || source.x + source.width > documentWidth + 1 || source.y + source.height > documentHeight + 1) return false;
  if (transform.width < 1 || transform.height < 1 || transform.width > 8192 || transform.height > 8192 || Math.abs(transform.cx) > 16384 || Math.abs(transform.cy) > 16384) return false;
  if (transform.flipX !== undefined && typeof transform.flipX !== 'boolean') return false;
  if (transform.flipY !== undefined && typeof transform.flipY !== 'boolean') return false;
  return true;
}