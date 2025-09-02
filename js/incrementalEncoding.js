export class IncrementalTree {
  constructor(root) {
    this.root = root;
    this.parent = new Map([[root, null]]);
    this.children = new Map([[root, []]]);

    this.Q1 = [root];
    this.Q2 = [root];

    this.q1Index = new Map([[root, 0]]);
    this.q2Index = new Map([[root, 0]]);
    this.q2End = new Map([[root, 1]]);
  }

  _q1Index(node) { return this.q1Index.get(node); }
  _q2Index(node) { return this.q2Index.get(node); }

  _ensureNode(node) {
    if (!this.children.has(node)) this.children.set(node, []);
  }

  insertChild(parent, child) {
    if (this.parent.has(child)) throw new Error("Child already exists");
    if (!this.parent.has(parent)) throw new Error("Parent must exist");

    this.parent.set(child, parent);
    this._ensureNode(parent);
    this._ensureNode(child);
    const siblings = this.children.get(parent);
    siblings.push(child);

    // Find the correct insertion point in Q1 (preorder traversal).
    let q1InsertIndex;
    if (siblings.length > 1) {
        const lastSibling = siblings[siblings.length - 2];
        q1InsertIndex = this.q1Index.get(lastSibling) + 1;
    } else {
        q1InsertIndex = this.q1Index.get(parent) + 1;
    }

    // Find the correct insertion point in Q2 (postorder traversal).
    let q2InsertIndex;
    if (siblings.length > 1) {
        const lastSibling = siblings[siblings.length - 2];
        q2InsertIndex = this.q2End.get(lastSibling);
    } else {
        q2InsertIndex = this.q2Index.get(parent) + 1;
    }
    
    // Splice into Q1 and Q2.
    this.Q1.splice(q1InsertIndex, 0, child);
    this.Q2.splice(q2InsertIndex, 0, child);

    // Update all indices that were shifted.
    for (let i = q1InsertIndex; i < this.Q1.length; i++) {
        this.q1Index.set(this.Q1[i], i);
    }
    for (let i = q2InsertIndex; i < this.Q2.length; i++) {
        this.q2Index.set(this.Q2[i], i);
    }
    
    // Set the q2End for the new child itself.
    this.q2End.set(child, this.q2Index.get(child) + 1);

    // Update q2End values for all ancestors based on the post-order traversal property.
    let currentAncestor = parent;
    while(currentAncestor !== null) {
        const lastChild = this.children.get(currentAncestor)[this.children.get(currentAncestor).length - 1];
        this.q2End.set(currentAncestor, this.q2End.get(lastChild));
        currentAncestor = this.parent.get(currentAncestor);
    }
  }

  reaches(u, v) {
    const pos1u = this._q1Index(u), pos1v = this._q1Index(v);
    const pos2u = this._q2Index(u), pos2v = this._q2Index(v);
    const uEnd = this.q2End.get(u);
    return pos1u < pos1v && pos2v >= pos2u && pos2v < uEnd;
  }

  subtreeMembersQ2(u) {
    const start = this._q2Index(u);
    const end = this.q2End.get(u);
    return this.Q2.slice(start, end);
  }

  static buildFromReverse({ root = 1n, predecessors, depthLimit = 12, valueLimit = 50000n }) {
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
