"""Pisano-period study. Writes pisano_results.json and pisano_scatter.png.

Exit code 2: an anchor failed. Exit code 4: a prime p <= 500 with pi(p^2) != p*pi(p).
"""
import json
import sys
from fractions import Fraction

from wss.fib import primes_below
from wss.pisano import PISANO_ANCHORS, pisano

M_MAX = 5000
P_MAX = 500


def main():
    for m, expected in PISANO_ANCHORS:
        got = pisano(m)
        if got != expected:
            print(f"ANCHOR FAILURE: pi({m}) = {got}, expected {expected}. STOPPING.")
            sys.exit(2)
    print("All Pisano anchors hold.")

    # Part 3 first, so that a lifting failure stops the run before anything else.
    lifting = []
    exceptions = []
    for p in primes_below(P_MAX + 1):
        pp, pp2 = pisano(p), pisano(p * p)
        ok = pp2 == p * pp
        lifting.append({"p": p, "pi_p": pp, "pi_p2": pp2, "p_times_pi_p": p * pp, "lifts": ok})
        if not ok:
            exceptions.append(p)
            print(f"LIFTING EXCEPTION: p = {p}: pi(p^2) = {pp2}, p*pi(p) = {p * pp}. STOPPING.")
            with open("PISANO_EXCEPTION.json", "w") as f:
                json.dump(lifting[-1], f)
            sys.exit(4)
    print(f"Lifting holds for all {len(lifting)} primes p <= {P_MAX}.")

    # Part 1: the table.
    table = {m: pisano(m) for m in range(2, M_MAX + 1)}
    odd_exceptions = [m for m, v in table.items() if m > 2 and v % 2 != 0]

    # Part 2: ratio extremes (exact, ties reported).
    ratios = {m: Fraction(v, m) for m, v in table.items()}
    rmax, rmin = max(ratios.values()), min(ratios.values())
    max_ms = [m for m, r in ratios.items() if r == rmax]
    min_ms = [m for m, r in ratios.items() if r == rmin]

    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    ms = list(table)
    fig, ax = plt.subplots(figsize=(9, 5.5))
    ax.scatter(ms, [table[m] for m in ms], s=2, color="#4C72B0", alpha=0.7, linewidths=0)
    for c, style in [(6, ":"), (2, "--"), (1, "-.")]:
        ax.plot([2, M_MAX], [c * 2, c * M_MAX], style, color="#C44E52", lw=0.8,
                label=f"π(m) = {c}m")
    ax.set_xlim(0, M_MAX)
    ax.set_ylim(0, None)
    ax.set_xlabel("m")
    ax.set_ylabel("Pisano period π(m)")
    ax.set_title(f"Pisano periods π(m), 2 ≤ m ≤ {M_MAX:,}")
    ax.legend(loc="upper left")
    fig.tight_layout()
    fig.savefig("pisano_scatter.png", dpi=150)
    plt.close(fig)

    results = {
        "convention": "F_1 = F_2 = 1",
        "anchors": [{"m": m, "value": pisano(m), "expected": e} for m, e in PISANO_ANCHORS],
        "table_range": [2, M_MAX],
        "table_size": len(table),
        "evenness": {"claim": "pi(m) even for every m > 2", "checked": len(table) - 1,
                     "exceptions": odd_exceptions},
        "ratio_max": {"value": float(rmax), "exact": f"{rmax.numerator}/{rmax.denominator}",
                      "m": max_ms, "pi": [table[m] for m in max_ms]},
        "ratio_min": {"value": float(rmin), "exact": f"{rmin.numerator}/{rmin.denominator}",
                      "m": min_ms, "pi": [table[m] for m in min_ms]},
        "lifting": {"p_max": P_MAX, "primes_checked": len(lifting),
                    "exception_count": len(exceptions), "exceptions": exceptions,
                    "rows": lifting},
        "scatter_png": "pisano_scatter.png",
        "table": {str(m): v for m, v in table.items()},
    }
    with open("pisano_results.json", "w") as f:
        json.dump(results, f, indent=1)
    print(f"Evenness exceptions: {odd_exceptions}")
    print(f"max pi(m)/m = {rmax} at m = {max_ms}; min = {rmin} at m = {min_ms}")
    print("Wrote pisano_results.json and pisano_scatter.png")


if __name__ == "__main__":
    main()
