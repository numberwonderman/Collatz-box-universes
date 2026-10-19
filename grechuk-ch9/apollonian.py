"""Prompt 3 (Grechuk 9.72): curvatures of the (-1, 2, 2, 3) Apollonian packing.

Each quadruple of mutually tangent circles (a, b, c, d) satisfies Descartes'
relation; swapping out one circle gives the other circle tangent to the
remaining three:  c -> 2(a + b + d) - c.  Walking the Apollonian tree from the
root, without undoing the previous swap, visits every circle of the packing
once.  Past the root the new curvature is always the largest in its
quadruple, so pruning at LIMIT is exact.

usage: python3 apollonian.py [LIMIT]
"""
import sys
from collections import Counter

LIMIT = int(sys.argv[1]) if len(sys.argv) > 1 else 10**5
ROOT = (-1, 2, 2, 3)


def circle_curvatures(limit):
    """Yield the curvature of every circle in the packing with curvature <= limit."""
    yield from ROOT
    stack = [(ROOT, -1)]
    while stack:
        q, last = stack.pop()
        s = sum(q)
        for i in range(4):
            if i == last:
                continue
            new = 2 * (s - q[i]) - q[i]
            if new > limit:
                continue
            yield new
            stack.append((q[:i] + (new,) + q[i + 1:], i))


def main():
    circles = Counter(circle_curvatures(LIMIT))
    curv = sorted(circles)
    with open("apollonian_curvatures.txt", "w") as f:
        f.write("\n".join(map(str, curv)) + "\n")

    present = set(curv)
    missing = [k for k in range(1, 501) if k not in present]
    with open("apollonian_missing_1_500.txt", "w") as f:
        f.write("\n".join(map(str, missing)) + "\n")

    print(f"limit {LIMIT}: {sum(circles.values())} circles, {len(curv)} distinct curvatures")
    print("\ncutoff    circles   distinct curvatures")
    for x in [10**2, 10**3, 10**4, 10**5]:
        if x <= LIMIT:
            print(f"{x:>7} {sum(c for k, c in circles.items() if k <= x):>10} {sum(1 for k in curv if k <= x):>10}")

    res = Counter(k % 24 for k in curv if k > 0)
    print(f"\nresidues mod 24 that occur: {sorted(res)}")
    print(f"\n{len(missing)} integers in 1..500 do not occur:")
    print(missing)
    admissible = set(res)
    sporadic = [k for k in missing if k % 24 in admissible]
    print(f"\n...of which {len(sporadic)} lie in an occurring residue class mod 24 "
          f"(i.e. are not explained by the mod-24 obstruction):")
    print(sporadic)

    # Exceptions to the local-global principle within the box: admissible but absent.
    big = [k for k in range(1, LIMIT + 1) if k % 24 in admissible and k not in present]
    print(f"\nadmissible-class integers <= {LIMIT} that are missing: {len(big)}; largest 30:")
    print(big[-30:])


if __name__ == "__main__":
    main()
