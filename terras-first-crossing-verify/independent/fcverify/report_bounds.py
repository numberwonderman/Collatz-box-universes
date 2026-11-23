"""Print the Step 3(b) recomputation of Theorem 6's finite arithmetic."""
from fractions import Fraction as F

from . import bounds as b


def sci(x):
    return f"{float(x):.6e}"


def main():
    fails = 0

    def check(name, ok, detail=""):
        nonlocal fails
        fails += not ok
        print(f"  [{'OK' if ok else 'FAIL'}] {name}" + (f"  -- {detail}" if detail else ""))

    L2, U2, L3, U3 = b.ln_enclosures()
    print("External inputs taken as given: B = 28e18 (Rozier-Terracol Cor. 5.4);")
    print("Rhin: Lambda >= k^-13.3 (as in Rozier-Terracol Prop. 6.3).\n")
    print("== log enclosures (series sum 1/(k 2^k), sum 1/(k 3^k)) ==")
    check("widths", U2 - L2 < F(1, 10 ** 150) and U3 - L3 < F(1, 10 ** 150),
          f"ln2 width {sci(U2 - L2)}, ln3 width {sci(U3 - L3)}")

    cf = b.continued_fraction(50)
    cv = b.convergents(50)
    print("\n== continued fraction of log2 3 (p_0/q_0 = 1/1) ==")
    print("  partial quotients a_0..a_29:", cf[:30])
    for i in (19, 20, 21):
        print(f"  convergent {i}: {cv[i][0]}/{cv[i][1]}")

    a, bb = cv[20]
    u, v = cv[19]
    print("\n== Farey sandwich (Theorem 6, 'The two large integers') ==")
    check("(a,b) = convergent 20 = (9809721694, 6189245291)", (a, bb) == (9809721694, 6189245291))
    check("(u,v) = convergent 19 = (630138897, 397573379)", (u, v) == (630138897, 397573379))
    check("a/b < alpha", bb * L3 - a * U2 > 0)
    check("(u/v) ln2 - ln3 > 1/(3B)", F(u, v) * L2 - U3 > F(1, 3 * b.B),
          f"margin {sci(F(u, v) * L2 - U3 - F(1, 3 * b.B))}")
    check("b u - a v = 1", bb * u - a * v == 1)
    check("a_21 = 1, so the mediant is convergent 21", cf[21] == 1 and cv[21] == (a + u, bb + v))
    inner, outer = b.least_crossing_fraction()
    check("least-denominator fraction in (alpha, alpha + 1/(3B ln2)) is certified",
          inner == outer, f"{inner}")
    check("k >= 10 439 860 591 and d >= 6 586 818 670",
          inner == F(10_439_860_591, 6_586_818_670))

    print("\n== the run argument (Theorem 6, 'Excluding at most 75 runs' + 'The tail') ==")
    pI, pII = b.PAIR_I, b.PAIR_II
    check("pair I is a convergent of alpha", pI in cv, f"index {cv.index(pI)}")
    check("pair II is a convergent of alpha", pII in cv, f"index {cv.index(pII)}")
    eI = b.e_enclosure(*pI)
    eII = b.e_enclosure(*pII)
    check("e_I in (5.22, 5.24)e-18", F(522, 10 ** 20) < eI[0] < eI[1] < F(524, 10 ** 20), sci(eI[0]))
    check("e_II in (1.24, 1.25)e-19", F(124, 10 ** 21) < eII[0] < eII[1] < F(125, 10 ** 21), sci(eII[0]))
    r = b.run_argument(75)
    check("G_75 < 1.72e15", r["G_upper"] < F(172, 100) * 10 ** 15, sci(r["G_upper"]))
    check("pair I: d > 1.26e17 (exact: d > d_low)", r["d_low"] > F(126, 100) * 10 ** 17, sci(r["d_low"]))
    check("2^61 < 2.31e18", 2 ** 61 < F(231, 100) * 10 ** 18)
    check("pair II, d < 2^61: Lambda > 9e-20", r["lambda_low"] > F(9, 10 ** 20), sci(r["lambda_low"]))
    check("n < 75/Lambda gives n+1 <= 2^70", r["log2_bound"] == 70)
    check("head: d <= 70 G_75 < 1.204e17 < d_low (contradiction)", r["head_closes"]
          and r["head_d_upper"] < F(1204, 1000) * 10 ** 17, sci(r["head_d_upper"]))
    check("tail at j = 61: G_75 (7 + 14*63) < 2^61", r["tail_closes"],
          f"{sci(r['tail_lhs_at_split'])} < {sci(2 ** 61)}")
    check("tail inequality also checked directly for 61 <= j < 3000",
          all(r["G_upper"] * (7 + 14 * (j + 2)) < 2 ** j for j in range(61, 3000)))

    print("\n== how far the same argument (same pairs, same split 2^61) reaches ==")
    for s in (74, 75, 76, 77):
        rs = b.run_argument(s)
        print(f"  s = {s}: head {'closes' if rs['head_closes'] else 'FAILS '}"
              f" (d <= {sci(rs['head_d_upper'])} vs d > {sci(rs['d_low'])}),"
              f" tail {'closes' if rs['tail_closes'] else 'FAILS '}")
    ms = b.max_s_closing()
    check("largest s for which it closes is 75 (so the counterexample bound is >= 76 runs)", ms == 75,
          f"max s = {ms}")

    print(f"\n{fails} failures")
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
