"""Compute R(p) = F_{p-(5/p)} mod p^2 for all primes p < LIMIT, p != 5, and analyse
the centred residues separately for several ranges of p.

Writes results.json and one histogram PNG per range. Stops early (exit code 2) if an
anchor fails, and (exit code 3) if any R(p) == 0 is found.
"""
import json
import sys
from fractions import Fraction

from wss.fib import ANCHORS, fib_mod, legendre5, primes_below

LIMIT = 10_000_000
NBINS = 20
THRESHOLD_DENOMS = [100, 1000]  # c = 1/100, 1/1000

# (key, label, lo inclusive, hi exclusive)
RANGES = [
    ("below_1e7", "all primes p < 10^7, p != 5", 2, 10_000_000),
    ("band_1e6_1e7", "new band 10^6 <= p < 10^7", 1_000_000, 10_000_000),
    ("below_1e6", "earlier run, p < 10^6, p != 5 (recomputed for comparison)", 2, 1_000_000),
]


def check_anchors():
    for p, n, m, expected in ANCHORS:
        got = fib_mod(n, m)
        if got != expected:
            print(f"ANCHOR FAILURE: p={p}: F_{n} mod {m} = {got}, expected {expected}. STOPPING.")
            sys.exit(2)
    print("All anchors hold.")


def analyse(rows, label, png):
    N = len(rows)

    # Histogram over (-1/2, 1/2], bins (lo, hi], exact integer arithmetic.
    counts = [0] * NBINS
    for p, r in rows:
        m = p * p
        t = NBINS * (2 * r + m)
        counts[-(-t // (2 * m)) - 1] += 1
    bins = []
    for k in range(NBINS):
        lo = Fraction(-1, 2) + Fraction(k, NBINS)
        bins.append({"lo": float(lo), "hi": float(lo + Fraction(1, NBINS)), "count": counts[k]})
    expected_per_bin = N / NBINS

    keyed = sorted(rows, key=lambda t: Fraction(abs(t[1]), t[0] * t[0]))
    smallest = [{"p": p, "r": r, "rho": r / (p * p)} for p, r in keyed[:20]]

    records, best = [], None
    for p, r in rows:
        a = Fraction(abs(r), p * p)
        if best is None or a < best:
            best = a
            records.append({"p": p, "r": r, "rho": r / (p * p), "abs_rho": float(a)})

    thresholds = []
    for D in THRESHOLD_DENOMS:
        # |rho| < 1/D  <=>  D*|r| < p^2
        cnt = sum(1 for p, r in rows if D * abs(r) < p * p)
        # Discreteness-aware variant: r = q*p with q one of the p integers in (-p/2, p/2];
        # nonzero q with |q| < p/D number 2*(ceil(p/D) - 1).
        disc = sum(2 * (-(-p // D) - 1) / p for p, _ in rows)
        thresholds.append({"c": 1 / D, "count": cnt, "expected": N * 2 / D,
                           "expected_discrete": disc})

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
    ax.set_title(f"Relative Wall–Sun–Sun residues: {label} ({N} primes)")
    ax.legend(loc="lower center", framealpha=0.95)
    fig.tight_layout()
    fig.savefig(png, dpi=150)
    plt.close(fig)

    return {
        "label": label,
        "primes_checked": N,
        "smallest_prime": rows[0][0],
        "largest_prime": rows[-1][0],
        "histogram": {"nbins": NBINS, "interval": "(-1/2, 1/2], bins (lo, hi]", "png": png,
                      "bins": bins, "expected_per_bin_uniform": expected_per_bin},
        "smallest_abs_rho": smallest,
        "record_minima": records,
        "threshold_counts": thresholds,
    }


def main():
    check_anchors()

    rows = []  # (p, r) with r the centred residue
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
        rows.append((p, R if 2 * R <= m else R - m))
    print(f"Primes checked: {len(rows)}; no R(p) = 0.")

    ranges = {}
    for key, label, lo, hi in RANGES:
        sub = [t for t in rows if lo <= t[0] < hi]
        ranges[key] = analyse(sub, label, f"rho_histogram_{key}.png")
        print(f"{key}: {len(sub)} primes, thresholds {ranges[key]['threshold_counts']}")

    results = {
        "convention": "F_1 = F_2 = 1",
        "limit": LIMIT,
        "excluded": [5],
        "primes_checked": len(rows),
        "largest_prime_checked": rows[-1][0],
        "any_zero_residue": False,
        "anchors": [{"p": p, "n": n, "m": m, "value": fib_mod(n, m), "expected": e}
                    for p, n, m, e in ANCHORS],
        "range_order": [k for k, *_ in RANGES],
        "ranges": ranges,
    }
    with open("results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("Wrote results.json and histograms")


if __name__ == "__main__":
    main()
