// layoutTree.js (pure)
// Lays out an IncrementalTree (anything with .root and a .children Map) for drawTree.
// Leaves get evenly spaced x slots left to right; each parent sits centred over its
// children; y is set by depth. Returns { nodes: [{id, x, y}], edges: [{u, v}] }.
export function layoutTree(T, { width = 800, height = 600, padding = 20 } = {}) {
  if (!T || T.root === undefined) return { nodes: [], edges: [] };

  const childrenOf = (id) => (T.children && T.children.get(id)) || [];
  const pos = new Map(); // id -> { slot, depth }
  const edges = [];
  let nextLeafSlot = 0;
  let maxDepth = 0;

  // Iterative post-order so deep trees can't overflow the call stack.
  const stack = [{ id: T.root, depth: 0, visited: false }];
  while (stack.length) {
    const item = stack.pop();
    const kids = childrenOf(item.id);
    if (!item.visited) {
      maxDepth = Math.max(maxDepth, item.depth);
      stack.push({ ...item, visited: true });
      for (let i = kids.length - 1; i >= 0; i--) {
        edges.push({ u: item.id, v: kids[i] });
        stack.push({ id: kids[i], depth: item.depth + 1, visited: false });
      }
    } else if (kids.length === 0) {
      pos.set(item.id, { slot: nextLeafSlot++, depth: item.depth });
    } else {
      const first = pos.get(kids[0]).slot;
      const last = pos.get(kids[kids.length - 1]).slot;
      pos.set(item.id, { slot: (first + last) / 2, depth: item.depth });
    }
  }

  const usableW = Math.max(width - 2 * padding, 0);
  const usableH = Math.max(height - 2 * padding, 0);
  const xStep = nextLeafSlot > 1 ? usableW / (nextLeafSlot - 1) : 0;
  const yStep = maxDepth > 0 ? usableH / maxDepth : 0;
  const singleColumn = nextLeafSlot <= 1;

  const nodes = [];
  for (const [id, { slot, depth }] of pos) {
    nodes.push({
      id,
      x: singleColumn ? width / 2 : padding + slot * xStep,
      y: padding + depth * yStep,
    });
  }
  return { nodes, edges };
}
