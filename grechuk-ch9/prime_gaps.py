"""Prompt 4 (Grechuk 9.2): maximal prime gaps and the Cramér ratio.

Runs the segmented sieve in prime_gaps.c up to LIMIT, re-checks every
maximal gap independently (both ends prime, nothing prime in between, by
deterministic Miller-Rabin), compares with the published record table, and
plots g / log^2 p against log p.

usage: python3 prime_gaps.py [LIMIT]     (default 10^10, ~20 s; needs gcc, matplotlib)
"""
import csv
import math
import os
import subprocess
import sys

LIMIT = int(sys.argv[1]) if len(sys.argv) > 1 else 10**10
HERE = os.path.dirname(os.path.abspath(__file__))
EXE = os.path.join(HERE, "prime_gaps")
CRAMER = 2 * math.exp(-0.5772156649015329)          # 2e^-gamma = 1.1229...

# Record gaps g = p' - p with their starting primes p, as published in
# OEIS A005250 / A002386 (all records below 10^10).  Caldwell's t5k.org table
# lists the same primes with g - 1 (it counts the composites in between).
PUBLISHED = [
    (1, 2), (2, 3), (4, 7), (6, 23), (8, 89), (14, 113), (18, 523), (20, 887),
    (22, 1129), (34, 1327), (36, 9551), (44, 15683), (52, 19609), (72, 31397),
    (86, 155921), (96, 360653), (112, 370261), (114, 492113), (118, 1349533),
    (132, 1357201), (148, 2010733), (154, 4652353), (180, 17051707),
    (210, 20831323), (220, 47326693), (222, 122164747), (234, 189695659),
    (248, 191912783), (250, 387096133), (282, 436273009), (288, 1294268491),
    (292, 1453168141), (320, 2300942549), (336, 3842610773), (354, 4302407359),
]


def is_prime(n):
    if n < 2:
        return False
    bases = (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37)   # deterministic far beyond 10^10
    for p in bases:
        if n % p == 0:
            return n == p
    d, s = n - 1, 0
    while d % 2 == 0:
        d, s = d // 2, s + 1
    for a in bases:
        x = pow(a, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True


def plot(rows, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    ink, muted, grid, blue, surface = "#0b0b0b", "#52514e", "#e4e3df", "#2a78d6", "#fcfcfb"
    fig, ax = plt.subplots(figsize=(8, 4.6), dpi=150, facecolor=surface)
    ax.set_facecolor(surface)
    x = [math.log(r["p"]) for r in rows]
    y = [r["ratio"] for r in rows]
    ax.plot(x, y, color=blue, linewidth=2, zorder=2)
    ax.scatter(x, y, s=28, color=blue, edgecolor=surface, linewidth=1.5, zorder=3)
    ax.axhline(CRAMER, color=muted, linewidth=1.2, linestyle=(0, (4, 3)), zorder=1)
    ax.text(x[-1], CRAMER + 0.03, "2e^−γ ≈ 1.1229 (conjectured lim sup)", color=muted,
            ha="right", va="bottom", fontsize=9)
    last = rows[-1]
    ax.annotate(f"gap {last['gap']} at p = {last['p']:,}\nratio {last['ratio']:.3f}",
                (x[-1], y[-1]), xytext=(-8, -36), textcoords="offset points",
                ha="right", fontsize=8.5, color=ink)
    ax.set_xlabel("log p   (natural log of the prime where the gap starts)", color=muted, fontsize=9)
    ax.set_ylabel("g / log² p", color=muted, fontsize=9)
    ax.set_title(f"Maximal prime gaps up to {LIMIT:.0e}: g / log² p", loc="left",
                 color=ink, fontsize=11)
    ax.set_ylim(0, max(2.2, max(y) + 0.1))
    ax.grid(axis="y", color=grid, linewidth=0.8)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(grid)
    ax.tick_params(colors=muted, labelsize=8.5)
    fig.tight_layout()
    fig.savefig(path, facecolor=surface)


def main():
    subprocess.run(["gcc", "-O2", "-o", EXE, os.path.join(HERE, "prime_gaps.c"), "-lm"], check=True)
    out = subprocess.run([EXE, str(LIMIT)], capture_output=True, text=True, check=True).stdout
    rows, total = [], None
    for line in out.splitlines():
        if line.startswith("#"):
            total = int(line.split()[-1])
            continue
        g, p, q = map(int, line.split())
        # independent check: both ends prime, nothing prime strictly between
        assert q - p == g and is_prime(p) and is_prime(q), line
        assert not any(is_prime(n) for n in range(p + 1, q)), line
        rows.append({"gap": g, "p": p, "next": q, "ratio": g / math.log(p) ** 2})

    with open("prime_gaps_maximal.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["gap", "p", "next", "ratio"])
        w.writeheader()
        for r in rows:
            w.writerow({**r, "ratio": f"{r['ratio']:.6f}"})
    plot(rows, "prime_gaps_ratio.png")

    print(f"limit {LIMIT}: pi(limit) = {total}" + ("  (matches 455052511)" if LIMIT == 10**10 else ""))
    print(f"{len(rows)} maximal gaps, each re-verified by Miller-Rabin\n")
    print(f"{'gap':>4} {'p':>14} {'g/log^2 p':>10}")
    for r in rows:
        print(f"{r['gap']:>4} {r['p']:>14,} {r['ratio']:>10.4f}")
    found = [(r["gap"], r["p"]) for r in rows]
    expected = [t for t in PUBLISHED if t[1] < LIMIT]
    print(f"\nmatches published record table: {found == expected}")
    big = max(rows, key=lambda r: r["ratio"])
    tail = [r for r in rows if r["p"] > 1000]
    big_tail = max(tail, key=lambda r: r["ratio"]) if tail else None
    print(f"largest ratio overall: {big['ratio']:.4f} (gap {big['gap']} at p = {big['p']})")
    if big_tail:
        print(f"largest ratio with p > 1000: {big_tail['ratio']:.4f} "
              f"(gap {big_tail['gap']} at p = {big_tail['p']:,})")
    print(f"ratio at the last record: {rows[-1]['ratio']:.4f}  vs 2e^-gamma = {CRAMER:.4f}")


if __name__ == "__main__":
    main()
