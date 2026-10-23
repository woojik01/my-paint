export function reorderLayerStack(layers, sourceId, targetId, after = false) {
  if (!Array.isArray(layers) || sourceId === targetId) return null;
  const source = layers.find(layer => layer.id === sourceId);
  const target = layers.find(layer => layer.id === targetId);
  if (!source || !target || source.parent !== target.parent) return null;

  const siblings = layers.filter(layer => layer.parent === source.parent);
  const reordered = siblings.filter(layer => layer !== source);
  const targetIndex = reordered.indexOf(target);
  if (targetIndex < 0) return null;
  reordered.splice(targetIndex + (after ? 1 : 0), 0, source);
  if (reordered.every((layer, index) => layer === siblings[index])) return null;

  const children = new Map();
  for (const layer of layers) {
    if (layer.parent) {
      if (!children.has(layer.parent)) children.set(layer.parent, []);
      children.get(layer.parent).push(layer);
    }
  }
  const roots = source.parent ? layers.filter(layer => !layer.parent) : reordered;
  if (source.parent) children.set(source.parent, reordered);
  const result = [];
  for (const layer of roots) {
    result.push(layer);
    if (layer.type === 'group') result.push(...(children.get(layer.id) || []));
  }
  return result;
}
