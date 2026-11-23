"""Part 1 + Part 2: compute R(p) for all primes p < LIMIT, p != 5, and analyse residues.

Writes results.json and rho_histogram.png. Stops early (exit code 2) if an anchor
fails, and (exit code 3) if any R(p) == 0 is found.
"""
import json
import sys
from fractions import Fraction

from wss.fib import ANCHORS, fib_mod, legendre5, primes_below

LIMIT = 1_000_000
NBINS = 20
THRESHOLDS = [Fraction(1, 100), Fraction(1, 1000)]


def check_anchors():
    for p, n, m, expected in ANCHORS:
        got = fib_mod(n, m)
        if got != expected:
            print(f"ANCHOR FAILURE: p={p}: F_{n} mod {m} = {got}, expected {expected}. STOPPING.")
            sys.exit(2)
    print("All anchors hold.")


def main():
    check_anchors()

    rows = []  # (p, R, r)
    for p in primes_below(LIMIT):
        if p == 5:
            continue
        m = p * p
        R = fib_mod(p - legendre5(p), m)
        if R == 0:
            print(f"WALL-SUN-SUN PRIME FOUND: p = {p} (F_{p - legendre5(p)} ≡ 0 mod p^2). STOPPING.")
            with open("WSS_FOUND.json", "w") as f:
                json.dump({"p": p}, f)
            sys.exit(3)
        r = R if 2 * R <= m else R - m  # centred residue in (-m/2, m/2]
        rows.append((p, R, r))

    N = len(rows)
    print(f"Primes checked: {N}; no R(p) = 0.")

    # Histogram of rho = r/p^2 over (-1/2, 1/2], bins left-open/right-closed, exact arithmetic.
    counts = [0] * NBINS
    for p, _, r in rows:
        m = p * p
        t = NBINS * (2 * r + m)          # = 2*NBINS*m*(rho + 1/2)
        k = -(-t // (2 * m)) - 1          # ceil(t / 2m) - 1
        counts[k] += 1
    bins = []
    for k in range(NBINS):
        lo = Fraction(-1, 2) + Fraction(k, NBINS)
        hi = lo + Fraction(1, NBINS)
        bins.append({"lo": float(lo), "hi": float(hi), "count": counts[k]})
    expected_per_bin = N / NBINS

    # 20 smallest |rho| (exact comparison via Fraction)
    keyed = sorted(rows, key=lambda t: Fraction(abs(t[2]), t[0] * t[0]))
    smallest = [{"p": p, "r": r, "rho": r / (p * p)} for p, _, r in keyed[:20]]

    # Record minima of |rho| as p increases
    records = []
    best = None
    for p, _, r in rows:
        a = Fraction(abs(r), p * p)
        if best is None or a < best:
            best = a
            records.append({"p": p, "r": r, "rho": r / (p * p), "abs_rho": float(a)})

    # Threshold counts
    thresholds = []
    for c in THRESHOLDS:
        cnt = sum(1 for p, _, r in rows if Fraction(abs(r), p * p) < c)
        thresholds.append({"c": float(c), "count": cnt, "expected": N * 2 * float(c)})

    results = {
        "convention": "F_1 = F_2 = 1",
        "limit": LIMIT,
        "excluded": [5],
        "primes_checked": N,
        "largest_prime_checked": rows[-1][0],
        "any_zero_residue": False,
        "anchors": [{"p": p, "n": n, "m": m, "value": fib_mod(n, m), "expected": e}
                    for p, n, m, e in ANCHORS],
        "histogram": {"nbins": NBINS, "interval": "(-1/2, 1/2], bins (lo, hi]",
                      "bins": bins, "expected_per_bin_uniform": expected_per_bin},
        "smallest_abs_rho": smallest,
        "record_minima": records,
        "threshold_counts": thresholds,
    }
    with open("results.json", "w") as f:
        json.dump(results, f, indent=2)

    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(9, 4.5))
    ax.bar([b["lo"] for b in bins], counts, width=1 / NBINS, align="edge",
           color="#4C72B0", edgecolor="white", label="observed")
    ax.axhline(expected_per_bin, color="#C44E52", linestyle="--",
               label=f"uniform expectation ({expected_per_bin:.2f})")
    ax.set_xlim(-0.5, 0.5)
    ax.set_xlabel(r"$\rho(p) = r(p)/p^2$")
    ax.set_ylabel("number of primes")
    ax.set_title(f"Relative Wall–Sun–Sun residues, {N} primes p < {LIMIT:,}, p ≠ 5")
    ax.legend(loc="lower center")
    fig.tight_layout()
    fig.savefig("rho_histogram.png", dpi=150)
    print("Wrote results.json and rho_histogram.png")


if __name__ == "__main__":
    main()
