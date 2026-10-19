"""Empirical test for reciprocity obstructions in the (-1, 2, 2, 3) packing.

Haag-Kertzer-Rickards-Stange obstructions remove whole families c*n^2 or
c*n^4 from an admissible residue class.  If this packing had one, the count
of admissible-but-missing curvatures would keep growing (like sqrt(X) or
X^(1/4)) and some family would have missing members at every scale.

usage: python3 apollonian_obstruction_check.py [LIMIT]   (default 10^6, ~30 s)
"""
import sys
from math import isqrt
from apollonian import circle_curvatures

L = int(sys.argv[1]) if len(sys.argv) > 1 else 10**6
present = bytearray(L + 1)
for k in circle_curvatures(L):
    if k > 0: present[k] = 1
adm = {2, 3, 6, 11, 14, 15, 18, 23}
miss = [k for k in range(1, L + 1) if k % 24 in adm and not present[k]]
print("limit", L, "admissible missing:", len(miss), "largest:", miss[-5:])
for X in (10**4, 10**5, 3*10**5, 10**6):
    if X <= L: print(f"  missing <= {X}: {sum(1 for k in miss if k <= X)}")
# test families c*n^2 and c*n^4 for squarefree c <= 200: how many admissible members are present?
def sqf(c): return all(c % (p*p) for p in range(2, isqrt(c) + 1))
worst = []
for e in (2, 4):
    for c in range(1, 201):
        if not sqf(c): continue
        mem = [c * n**e for n in range(1, int((L / c) ** (1 / e)) + 2) if c * n**e <= L and (c * n**e) % 24 in adm]
        if len(mem) < 5: continue
        m = sum(1 for x in mem if not present[x])
        big = [x for x in mem if x > 10**5]
        mb = sum(1 for x in big if not present[x])
        worst.append((mb / max(len(big), 1), e, c, len(mem), m, len(big), mb))
worst.sort(reverse=True)
print("families c*n^e with most missing members above 1e5 (frac, e, c, members, missing, members>1e5, missing>1e5):")
for w in worst[:8]: print("  ", w)
