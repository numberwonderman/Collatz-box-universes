// Minimal incremental encoding for directed trees using dual projections (Q1, Q2).
// Focus: correctness for tests (small/medium trees). Simplicity > speed.
//
// Invariants we rely on:
// - Q1 and Q2 are arrays holding nodes exactly once.
// - In Q2, each subtree of a node u is a contiguous block [idx(u), endIdx(u)).
// - Reachability test: u reaches v  iff  pos1[u] < pos1[v] AND pos2[u] < pos2[v].

export class IncrementalTree {
  constructor(root) {
    this.root = root;
    this.parent = new Map([[root, null]]);
    this.children = new Map(); // node -> child array (Q1 order)
    this.children.set(root, []);

    // Projections as arrays (indices are "positions")
    this.Q1 = [root];
    this.Q2 = [root];

    // End index (exclusive) of subtree block in Q2 for each node
    this.q2End = new Map([[root, 1]]); // subtree(root) initially [0:1)
  }

  // ---- helpers ----
  _q2Index(node) { return this.Q2.indexOf(node); } // O(n), fine for tests
  _q1Index(node) { return this.Q1.indexOf(node); }

  _ensureNode(node) {
    if (!this.children.has(node)) this.children.set(node, []);
  }

  _bumpQ2EndOnAncestors(node) {
    // When a new child is inserted into parent's subtree block, every ancestor's end shifts by +1.
    let cur = node;
    while (cur != null) {
      this.q2End.set(cur, (this.q2End.get(cur) ?? this._q2Index(cur) + 1) + 1);
      cur = this.parent.get(cur);
    }
  }

  // Insert `child` under `parent`.
  // Q1: insert child immediately AFTER parent (append as last child in Q1 sibling order).
  // Q2: insert child just BEFORE parent's subtree delimiter (keeps subtree contiguous).
  insertChild(parent, child) {
    if (this.parent.has(child)) throw new Error("Child already exists");
    if (!this.parent.has(parent)) throw new Error("Parent must exist");

    // Structure
    this.parent.set(child, parent);
    this._ensureNode(parent);
    this._ensureNode(child);
    this.children.get(parent).push(child);

    // ---- Q1 placement: after parent in the global sequence (local insert) ----
    const i = this._q1Index(parent);
    // Find the next index right after the entire parent+descendants block in Q1?
    // Simpler (still valid): insert immediately after parent in Q1 array.
    this.Q1.splice(i + 1, 0, child);

    // ---- Q2 placement: before parent's delimiter end ----
    const end = this.q2End.get(parent);
    // end is an index into current Q2 (exclusive); insert at 'end' to extend the block
    this.Q2.splice(end, 0, child);

    // Update q2End for parent and all its ancestors (+1 shift)
    this._bumpQ2EndOnInsertion(parent);

    // New node's subtree end is its own index + 1
    const idxChild = this._q2Index(child);
    this.q2End.set(child, idxChild + 1);
  }

  _bumpQ2EndOnInsertion(parent) {
    let cur = parent;
    while (cur != null) {
      this.q2End.set(cur, (this.q2End.get(cur) ?? this._q2Index(cur) + 1) + 1);
      cur = this.parent.get(cur);
    }
  }

  // O(1) reachability using positions (array indices used as positions)
  reaches(u, v) {
    const pos1u = this._q1Index(u), pos1v = this._q1Index(v);
    const pos2u = this._q2Index(u), pos2v = this._q2Index(v);
    return pos1u < pos1v && pos2u < pos2v;
  }

  subtreeMembersQ2(u) {
    const start = this._q2Index(u);
    const end = this.q2End.get(u);
    return this.Q2.slice(start, end);
  }

  // Build from a predecessor provider (like reversePredecessors) with BFS limits
  static buildFromReverse({ root=1n, predecessors, depthLimit=12, valueLimit=50000n }) {
    const T = new IncrementalTree(root);
    const seen = new Set([root]);
    const depth = new Map([[root, 0]]);
    const q = [{ node: root, d: 0 }];

    while (q.length) {
      const { node: m, d } = q.shift();
      if (d >= depthLimit) continue;

      for (const p of predecessors(m)) {
        if (p <= 0n) continue;
        if (valueLimit !== undefined && p > valueLimit) continue;
        if (seen.has(p)) continue;

        T.insertChild(m, p);
        seen.add(p);
        depth.set(p, d + 1);
        q.push({ node: p, d: d + 1 });
      }
    }
    return T;
  }
}
