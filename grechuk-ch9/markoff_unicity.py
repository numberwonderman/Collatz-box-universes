"""Prompt 1 (Grechuk 9.8): Markoff unicity data.

Markoff equation: x^2 + y^2 + z^2 = 3xyz.  The Vieta move that preserves it
is (x, y, z) -> (x, y, 3xy - z).  (The draft prompt wrote xy - z; that is the
move for x^2+y^2+z^2 = xyz, whose tree starts at (3,3,3), and from (1,1,1) it
immediately produces 0.  The 3xy - z form is the correct one here.)

BFS over the Markoff tree from (1,1,1), keeping triples with max <= LIMIT.
Moving up the tree never decreases the max, so pruning at LIMIT is exact:
every triple with max <= LIMIT is reached.
"""
import csv
import sys
from collections import Counter, deque

LIMIT = int(sys.argv[1]) if len(sys.argv) > 1 else 10**6


def markoff_triples(limit):
    seen = {(1, 1, 1)}
    queue = deque([(1, 1, 1)])
    while queue:
        a, b, c = queue.popleft()          # sorted a <= b <= c
        assert a * a + b * b + c * c == 3 * a * b * c
        yield a, b, c
        # The three Vieta neighbours; keep the ones above us in the tree.
        for t in ((b, c, 3 * b * c - a), (a, c, 3 * a * c - b), (a, b, 3 * a * b - c)):
            t = tuple(sorted(t))
            if t[2] <= limit and t not in seen:
                seen.add(t)
                queue.append(t)


def main():
    triples = list(markoff_triples(LIMIT))
    by_max = Counter(c for _, _, c in triples)
    witnesses = {}
    for t in triples:
        witnesses.setdefault(t[2], []).append(t)

    numbers = sorted(by_max)
    bad = [m for m in numbers if by_max[m] != 1]

    with open("markoff_counts.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["markoff_number", "triples_with_this_max", "triples"])
        for m in numbers:
            w.writerow([m, by_max[m], " ".join(f"({a};{b};{c})" for a, b, c in witnesses[m])])

    print(f"limit                       : {LIMIT}")
    print(f"triples found (sorted, up to perm): {len(triples)}")
    print(f"(a) distinct Markoff numbers: {len(numbers)}")
    print(f"(b) m with count != 1       : {bad if bad else 'none'}")
    print(f"(c) largest m verified      : {numbers[-1]}  triple {witnesses[numbers[-1]][0]}")
    print()
    print("first Markoff numbers and their unique triple:")
    for m in numbers[:12]:
        print(f"  {m:>8}  count={by_max[m]}  {witnesses[m]}")


if __name__ == "__main__":
    main()
