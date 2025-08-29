from collections import deque, defaultdict
from fractions import Fraction

class OrderList:
    """
    Minimal order-maintenance: each item has a 'pos' key with a rational tag.
    Insert between neighbors by assigning midpoint Fraction to avoid FP drift.
    """
    def __init__(self):
        self.seq = []          # list of node ids in order
        self.pos = {}          # node -> Fraction position

    def _mid(self, a: Fraction, b: Fraction) -> Fraction:
        return (a + b) / 2

    def append_right(self, node):
        if not self.seq:
            p = Fraction(0)
        else:
            p = self.pos[self.seq[-1]] + 1
        self.seq.append(node)
        self.pos[node] = p

    def insert_after(self, left_node, new_node):
        i = self.seq.index(left_node)
        if i == len(self.seq) - 1:
            # simplest: tack on a +1 tag
            p = self.pos[left_node] + 1
            self.seq.insert(i + 1, new_node)
            self.pos[new_node] = p
            return
        right_node = self.seq[i + 1]
        p = self._mid(self.pos[left_node], self.pos[right_node])
        self.seq.insert(i + 1, new_node)
        self.pos[new_node] = p

    def insert_before(self, right_node, new_node):
        j = self.seq.index(right_node)
        if j == 0:
            p = self.pos[right_node] - 1
            self.seq.insert(0, new_node)
            self.pos[new_node] = p
            return
        left_node = self.seq[j - 1]
        p = self._mid(self.pos[left_node], self.pos[right_node])
        self.seq.insert(j, new_node)
        self.pos[new_node] = p

    def index(self, node):
        return self.seq.index(node)

    def left_of(self, a, b):
        return self.pos[a] < self.pos[b]


class IncrementalTree:
    """
    Dual projections Q1 (left-to-right) and Q2 (right-to-left sibling order),
    with contiguous subtree blocks in both. Supports:
      - insert_child(parent, child, ref_sibling=None, before=True)
      - reaches(u, v) in O(1): pos1[u] < pos1[v] and pos2[u] < pos2[v]
      - subtree(u) as contiguous slices (O(size of subtree) to list)
    """
    def __init__(self, root):
        self.root = root
        self.parent = {root: None}
        self.children = defaultdict(list)

        # Projection order lists
        self.Q1 = OrderList()
        self.Q2 = OrderList()

        # For each node, track the rightmost endpoint (exclusive) of its subtree block in Q2.
        # We store a sentinel "delimiter index" as an integer into Q2.seq; keep it updated up ancestors.
        self._q2_end_idx = {}   # node -> delimiter_index (points to first item AFTER the subtree)

        # initialize projections with root as singletons
        self.Q1.append_right(root)
        self.Q2.append_right(root)
        self._q2_end_idx[root] = 1  # subtree of root is [0:1) initially

    # ----- internal helpers -----

    def _q2_delimiter_index(self, u):
        """Return the current delimiter index (first index after u's subtree block) in Q2."""
        return self._q2_end_idx[u]

    def _q2_insert_before_delimiter(self, parent, v):
        """
        Insert node v in Q2 just before parent's delimiter index to keep subtree contiguous.
        Update delimiter indices along the ancestor chain (they shift by +1).
        """
        delim = self._q2_end_idx[parent]  # integer index into Q2.seq
        # If delim == len, inserting at end; else insert before that element
        if delim == len(self.Q2.seq):
            # Append right (maintain tag spacing)
            # Note: we still need a stable pos; we can use insert_after(last)
            if self.Q2.seq:
                self.Q2.insert_after(self.Q2.seq[-1], v)
            else:
                self.Q2.append_right(v)
        else:
            right_node = self.Q2.seq[delim]
            self.Q2.insert_before(right_node, v)

        # After insertion, everything at index >= delim has shifted right by 1.
        # Therefore, parent's delimiter increases by 1, and so do all ancestors'.
        x = parent
        while x is not None:
            self._q2_end_idx[x] += 1
            x = self.parent[x]

        # For the new node v, its subtree is length 1; locate index of v to set end = idx+1
        v_idx = self.Q2.index(v)
        self._q2_end_idx[v] = v_idx + 1

    # ----- public API -----

    def insert_child(self, parent, child, ref_sibling=None, before=True):
        """
        Insert `child` under `parent`.
        Q1 rule (default): child immediately AFTER parent (or relative to a reference sibling).
        Q2 rule: child inserted immediately BEFORE parent's delimiter (keeps subtree contiguous).
        Also maintain sibling-reversal: children order in Q2 is reverse of Q1.
        """
        assert child not in self.parent, "Child already exists"
        assert parent in self.parent, "Parent must exist"

        # structure
        self.parent[child] = parent

        # ---- Q1 placement ----
        if ref_sibling is None:
            # Default: immediately after parent (local insert)
            self.Q1.insert_after(parent, child)
            # children list in Q1 order:
            self.children[parent].append(child)
        else:
            # Insert before/after a known sibling in Q1
            i = self.children[parent].index(ref_sibling)
            if before:
                self.children[parent].insert(i, child)
            else:
                self.children[parent].insert(i + 1, child)
            # To place in Q1.seq near ref_sibling, we can insert before/after in sequence:
            if before:
                # insert child at the position just before ref_sibling in Q1
                self.Q1.insert_before(ref_sibling, child)
            else:
                self.Q1.insert_after(ref_sibling, child)

        # ---- Q2 placement: before parent's delimiter ----
        self._q2_insert_before_delimiter(parent, child)

        # Sibling-reversal invariant is automatic at block level because
        # new child goes at the *right edge* (before delimiter) of the parent's subtree block in Q2,
        # while in Q1 it appears near the parent or a chosen sibling.
        # (If you need strict per-sibling reverse ordering, choose ref_sibling accordingly.)

    def reaches(self, u, v):
        """O(1) symbolic reachability in the projections."""
        return self.Q1.left_of(u, v) and self.Q2.left_of(u, v)

    def subtree_members(self, u):
        """Return list of nodes in u's subtree as a contiguous slice of Q2 (or Q1)."""
        # Use Q2 contiguous block: from the index of u to _q2_end_idx[u]-1
        start = self.Q2.index(u)
        end = self._q2_end_idx[u]
        return self.Q2.seq[start:end]

    # ----- builders and adapters -----

    @classmethod
    def build_from_reverse(
        cls,
        root,
        predecessors_fn,
        depth_limit=None,
        value_limit=None,
        stop_condition=None,
    ):
        """
        Build the reverse tree incrementally from root, using a predecessor generator.
        For Collatz-reverse: preds(m) yields 2m and (m-1)/3 if valid.
        """
        T = cls(root)
        depth = {root: 0}
        seen = {root}
        q = deque([root])

        while q:
            m = q.popleft()
            d = depth[m]
            if depth_limit is not None and d >= depth_limit:
                continue

            for p in predecessors_fn(m):
                if value_limit is not None and p > value_limit:
                    continue
                if stop_condition and stop_condition(p):
                    continue
                if p in seen:
                    # Ensure we only keep a tree (unique parent); skip if encountered
                    continue
                # Insert p as child of m
                T.insert_child(m, p)
                seen.add(p)
                depth[p] = d + 1
                q.append(p)

        return T


# ---------- Baseline reverse tree for cross-checks ----------
class ReverseBaseline:
    def __init__(self, root):
        self.root = root
        self.parent = {root: None}
        self.children = defaultdict(list)

    @classmethod
    def build(cls, root, predecessors_fn, depth_limit=None, value_limit=None, stop_condition=None):
        R = cls(root)
        depth = {root: 0}
        seen = {root}
        q = deque([root])

        while q:
            m = q.popleft()
            d = depth[m]
            if depth_limit is not None and d >= depth_limit:
                continue

            for p in predecessors_fn(m):
                if value_limit is not None and p > value_limit:
                    continue
                if stop_condition and stop_condition(p):
                    continue
                if p in seen:
                    continue
                R.parent[p] = m
                R.children[m].append(p)
                seen.add(p)
                depth[p] = d + 1
                q.append(p)
        return R

    def reaches(self, u, v):
        # DFS from u to see if v is in its subtree
        stack = [u]
        while stack:
            x = stack.pop()
            if x == v:
                return True
            stack.extend(self.children[x])
        return False


# ---------- Example predecessor functions ----------

def collatz_reverse_predecessors(m: int):
    """Classic reverse Collatz predecessors for m >= 1."""
    # Always even predecessor
    yield 2 * m
    # Odd predecessor when valid
    # If (m-1) divisible by 3 and predecessor is odd: m ≡ 4 (mod 6)
    if (m - 1) % 3 == 0:
        p = (m - 1) // 3
        if p % 2 == 1 and p > 0:
            yield p

# Example generalized hook:
# def generalized_predecessors(m: int):
#     yield from ...  # your rules here


# ---------- Quick self-check (small build) ----------

if __name__ == "__main__":
    root = 1
    depth_limit = 20
    value
