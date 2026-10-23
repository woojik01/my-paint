const TAU = Math.PI * 2;

export function shortestAngleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function snapRotationToZero(rotation, tolerance = 5 * Math.PI / 180) {
  if (!Number.isFinite(rotation) || !Number.isFinite(tolerance) || tolerance < 0) return rotation;
  const nearestTurn = Math.round(rotation / TAU);
  return Math.abs(rotation - nearestTurn * TAU) <= tolerance ? 0 : rotation;
}
