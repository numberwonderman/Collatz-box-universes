from collections import deque
from math import isfinite

def assert_contiguous_Q2(tree):
    # For every node u, its subtree block in Q2 is contiguous and includes all descendants
    for u in tree._q2_end_idx.keys():
        block = tree.subtree_members(u)
        # Every child must be in the block
        q = deque([u])
        seen = set()
        desc = set()
        while q:
            x = q.popleft()
            for c in tree.children[x]:
                desc.add(c)
                q.append(c)
        assert desc.issubset(set(block)), (u, "descendants not contiguous in Q2")

def tiny_build():
    T = IncrementalTree(1)
    T.insert_child(1, 2)
    T.insert_child(1, 3)
    T.insert_child(2, 4)
    # Reachability rectangle test
    assert T.reaches(1,4) and T.reaches(2,4) and not T.reaches(3,4)
    assert_contiguous_Q2(T)

tiny_build()
print("OK")
