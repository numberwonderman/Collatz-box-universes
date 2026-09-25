#!/usr/bin/env python3
"""
pslq_collatz_constants.py -- feed constants derived from generalized_collatz.py
into the PSLQ relation finder (pslq_relations.py).

generalized_collatz() returns integer orbits, so the constants below are
real numbers *built from* those orbits in a way that can be computed to any
precision (a PSLQ test needs 100+ correct digits; a float is useless):

  cycle_drift_5x1   Mean log-growth per odd step around the 5x+1 cycle
                    13 -> 33 -> 83:  (1/L) * sum log(b + c/a_i).
                    The cycle equation prod(b + c/a_i) = 2^K forces this to be
                    (K/L)*log 2 -- a positive control on real orbit data.

  parity_5x1_from7  Halving pattern of the (apparently divergent) 5x+1 orbit
                    of 7, encoded as  x = sum_i 2^(-s_i),  s_i = total halvings
                    after i odd steps.  Each orbit step adds exact bits, so
                    precision is limited only by how long we iterate.  No
                    relation is expected.

Run:  python3 pslq_collatz_constants.py [--dps 100]
"""

import argparse

from mpmath import mp, mpf

from generalized_collatz import generalized_collatz
from pslq_relations import constant, identify, print_report


def halvings(seq, b, c):
    """Number of halvings k_i between consecutive odd terms:
    b*a_i + c = 2^k_i * a_{i+1}."""
    ks = []
    for a, nxt in zip(seq, seq[1:]):
        q = (b * a + c) // nxt
        ks.append(q.bit_length() - 1)
    return ks


@constant("cycle_drift_5x1")
def _(dps):
    b, c = 5, 1
    seq, start = generalized_collatz(13, b, c)
    cycle = seq[start:]
    return mp.fsum(mp.log(b + mpf(c) / a) for a in cycle) / len(cycle)


@constant("parity_5x1_from7")
def _(dps):
    b, c = 5, 1
    bits_needed = int(dps * 3.33) + 64
    steps = 64
    while True:
        seq, start = generalized_collatz(7, b, c, max_iterations=steps)
        if start is not None:
            raise ValueError("orbit of 7 under 5x+1 cycled; constant is rational")
        ks = halvings(seq, b, c)
        if sum(ks) > bits_needed:
            break
        steps *= 2
    x, s = mpf(0), 0
    for k in ks:
        s += k
        x += mpf(2) ** -s
    # Truncation error < 2^-s, which is below 10^-dps by construction.
    return x


def main():
    ap = argparse.ArgumentParser(description="PSLQ on generalized_collatz constants")
    ap.add_argument("--dps", type=int, default=100)
    ap.add_argument("--maxcoeff", type=int, default=1000)
    args = ap.parse_args()

    print("PSLQ backend: mpmath.pslq\n")
    with mp.workdps(40):
        from pslq_relations import evaluate
        v = evaluate(["cycle_drift_5x1", "parity_5x1_from7"], 30)
        for k, x in v.items():
            print(f"{k:18s} = {mp.nstr(x, 30)}")
    print()

    lib = ["pi", "e", "log2", "log3", "zeta3", "catalan", "euler_gamma", "pi^2"]
    rep = identify("cycle_drift_5x1", lib, args.dps, args.maxcoeff)
    print_report("cycle_drift_5x1 vs standard library (expect (7/3)*log2)",
                 rep, target="cycle_drift_5x1")

    rep = identify("parity_5x1_from7", lib, args.dps, args.maxcoeff)
    print_report("parity_5x1_from7 vs standard library (expect nothing)",
                 rep, target="parity_5x1_from7")

    small = ["pi", "log2", "log3", "sqrt2", "sqrt3"]
    rep = identify("parity_5x1_from7", small, args.dps, args.maxcoeff,
                   squares=True, products=True)
    print_report("parity_5x1_from7 vs small library + squares/products/ratios "
                 "(expect nothing)", rep, target="parity_5x1_from7")


if __name__ == "__main__":
    main()
