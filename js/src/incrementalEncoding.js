export class IncrementalTree {
  constructor(root) {
    this.root = root;
    this.parent = new Map([[root, null]]);
    this.children = new Map([[root, []]]);

    this.Q1 = [root];
    this.Q2 = [root];

    this.q2End = new Map([[root, 1]]); // subtree(root) = [0,1)
  }

  // O(n) scans are fine for small/medium tests
  _q1Index(node) { return this.Q1.indexOf(node); }
  _q2Index(node) { return this.Q2.indexOf(node); }

  _ensureNode(node) {
    if (!this.children.has(node)) this.children.set(node, []);
  }

  // Bump subtree end for parent and all ancestors (+1) after an insertion into that block
  _bumpQ2EndOnInsertion(parent) {
    let cur = parent;
    while (cur != null) {
      this.q2End.set(cur, (this.q2End.get(cur)) + 1);
      cur = this.parent.get(cur);
    }
  }

  insertChild(parent, child) {
    if (this.parent.has(child)) throw new Error("Child already exists");
    if (!this.parent.has(parent)) throw new Error("Parent must exist");

    this.parent.set(child, parent);
    this._ensureNode(parent);
    this._ensureNode(child);
    this.children.get(parent).push(child);

    // Q1: put child immediately after parent (keeps pos1[parent] < pos1[child])
    const i1 = this._q1Index(parent);
    this.Q1.splice(i1 + 1, 0, child);

    // Q2: insert at the END of parent's subtree block to keep contiguity
    const end = this.q2End.get(parent);  // exclusive end index
    this.Q2.splice(end, 0, child);

    // All ancestors' subtree ends shift by +1
    this._bumpQ2EndOnInsertion(parent);

    // New child's subtree is [end, end+1) — no need to scan
    this.q2End.set(child, end + 1);
  }

  // O(1) reachability using positions (indices-as-positions)
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

  static buildFromReverse({ root=1n, predecessors, depthLimit=12, valueLimit=50000n }) {
    const T = new IncrementalTree(root);
    const seen = new Set([root]);
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
        q.push({ node: p, d: d + 1 });
      }
    }
    return T;
  }
}
