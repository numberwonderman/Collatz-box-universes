"""Prompt 2 (Grechuk 9.7): D(n)-sets for small n.

1. Verify Grechuk's D(2985984) sextuple.
2. For n in 1..64, n != 2 (mod 4), run the exhaustive C search (dn_sets.c)
   for D(n)-quadruples and quintuples with every element <= BOUND.

usage: python3 dn_sets.py [BOUND]     (compiles dn_sets.c with gcc)
"""
import csv
import os
import subprocess
import sys
from itertools import combinations
from math import isqrt

BOUND = int(sys.argv[1]) if len(sys.argv) > 1 else 10**5
HERE = os.path.dirname(os.path.abspath(__file__))
EXE = os.path.join(HERE, "dn_sets")

# Literature status for n in this range (see README):
#  - n = 2 (mod 4): no D(n)-quadruple exists (Brown; Gupta-Singh; Mohanty-Ramasamy).
#  - n in {3, 5, 8, 12, 20} (and -1, -3, -4): quadruple existence is OPEN;
#    for every other n not 2 (mod 4) a D(n)-quadruple is known to exist.
#  - n = 1: no quintuple (He-Togbe-Ziegler 2019); n = 4: no quintuple
#    (Bliznac Trebjesanin-Filipin 2019).
OPEN_QUADRUPLE = {3, 5, 8, 12, 20}
NO_QUINTUPLE = {1, 4}


def is_square(x):
    return x >= 0 and isqrt(x) ** 2 == x


def verify_sextuple():
    n, s = 2985984, [99, 315, 9920, 32768, 44460, 19534284]
    print(f"Grechuk's D({n}) set {s}:")
    ok = True
    for a, b in combinations(s, 2):
        v = a * b + n
        r = isqrt(v)
        good = r * r == v
        ok &= good
        print(f"  {a:>8} * {b:<8} + n = {v:>14} = {r}^2" if good else f"  {a} * {b} + n = {v}  NOT a square")
    print(f"  -> {'VERIFIED' if ok else 'FAILED'}: all 15 products + n are squares; n = {n} = 12^6 = {isqrt(n)}^2\n")


def main():
    verify_sextuple()
    subprocess.run(["gcc", "-O2", "-o", EXE, os.path.join(HERE, "dn_sets.c"), "-lm"], check=True)

    rows, found = [], []
    for n in range(1, 65):
        if n % 4 == 2:
            continue
        p = subprocess.run([EXE, str(n), str(BOUND)], capture_output=True, text=True, check=True)
        quads = [tuple(map(int, l.split()[1:])) for l in p.stdout.splitlines() if l.startswith("4 ")]
        quints = [tuple(map(int, l.split()[1:])) for l in p.stdout.splitlines() if l.startswith("5 ")]
        for t in quads + quints:          # independent re-check of every set reported
            assert all(is_square(a * b + n) for a, b in combinations(t, 2)), (n, t)
        edges = int(p.stderr.split("edges=")[1].split()[0])

        def status(found_any, size):
            if found_any:
                return "found"
            if size == 5 and n in NO_QUINTUPLE:
                return "none <= bound (proved: none exist)"
            return "none <= bound (inconclusive)"

        rows.append({
            "n": n, "pairs": edges,
            "quadruples": len(quads), "quintuples": len(quints),
            "size4": status(quads, 4), "size5": status(quints, 5),
            "smallest_quadruple": " ".join(map(str, min(quads, key=lambda t: (t[-1], t)))) if quads else "",
            "quintuples_found": "; ".join(" ".join(map(str, t)) for t in quints),
            "note": "quadruple existence open in literature" if n in OPEN_QUADRUPLE else "",
        })
        found += [(n, 4, t) for t in quads] + [(n, 5, t) for t in quints]

    with open("dn_summary.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    with open("dn_sets_found.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["n", "size", "set"])
        for n, k, t in found:
            w.writerow([n, k, " ".join(map(str, t))])

    print(f"bound: every element <= {BOUND}; search is exhaustive inside that box")
    print(f"{'n':>3} {'pairs':>7} {'#quad':>6} {'#quint':>6}  smallest quadruple (by max)      quintuples")
    for r in rows:
        print(f"{r['n']:>3} {r['pairs']:>7} {r['quadruples']:>6} {r['quintuples']:>6}  "
              f"{r['smallest_quadruple'] or '-':<32} {r['quintuples_found'] or '-'}  {r['note']}")


if __name__ == "__main__":
    main()
