"""Print the Step 2 recomputation of Theorem 8 (Hexagon 2611.00459v2)."""
from fractions import Fraction as F

from . import bounds as b
from . import thm8 as t


def sci(x, p=6):
    return f"{float(x):.{p}e}"


def main():
    fails = 0

    def check(name, ok, detail=""):
        nonlocal fails
        fails += not ok
        print(f"  [{'OK' if ok else 'FAIL'}] {name}" + (f"  -- {detail}" if detail else ""))

    print("Inputs taken as given: B = 28e18 (Rozier-Terracol Cor. 5.4); Rhin Lambda >= k^-13.3.\n")
    cv = b.convergents(60)
    print("== the four convergents and their e = q ln3 - p ln2 ==")
    for name, (p, q) in t.CONV.items():
        lo, hi = b.e_enclosure(p, q)
        plo, phi = t.PRINTED_E[name]
        check(f"{name}: convergent index {cv.index((p, q)) if (p, q) in cv else '??'}, p/q < alpha, "
              f"e in printed ({sci(plo, 2)}, {sci(phi, 2)})",
              (p, q) in cv and lo > 0 and plo < lo < hi < phi, f"e = {sci(lo, 9)}")

    print("\n== lower bound from convergent I (needs Lambda < 81/B) ==")
    low, lowp = t.lower_bound_d(), t.lower_bound_d_printed_form()
    check("exact enclosures: d > d_low > 1.28e17", low > t.PRINTED_LOWER, sci(low))
    check("printed form (0.69 - q 81/B)/5.24e-18 > 1.28e17", lowp > t.PRINTED_LOWER, sci(lowp))
    check("0.69 < ln 2", F("0.69") < b.ln_enclosures()[0])

    G81 = b.G_upper(81)
    check("G_81 < 2.7241e16", G81 < t.PRINTED_G81, sci(G81))

    for chain in ("exact", "printed"):
        print(f"\n== head, chained from the {'my exact ceilings' if chain == 'exact' else 'printed ceiling of the row above'} ==")
        print("  row  r  conv   ceiling in        lambda (mine)    printed    H mine/pr  new ceiling (mine)  printed     bits of slack  binding")
        rows = t.head(chain)
        for i, R in enumerate(rows):
            print(f"  {i}   {R['r']:>2}  {R['conv']:<4}  {sci(R['D'], 5):>12}  {sci(R['lam'], 6):>14}  "
                  f"{sci(R['printed_lam'], 4):>11}   {R['H']:>2}/{R['printed_H']:<2}   {sci(R['new'], 6):>14}  "
                  f"{sci(R['printed_new'], 4):>11}   {R['log2_slack']:.4f}        {R['binding']}")
        for i, R in enumerate(rows):
            check(f"row {i}: lambda > r/B (Lemma 6 hypothesis)", R["lam_gt_r_over_B"],
                  f"{sci(R['lam'], 4)} vs {sci(F(R['r'], b.B), 4)}")
            check(f"row {i}: H = printed H", R["H"] == R["printed_H"])
            if chain == "printed":
                # printed lambda is a truncation of the true lambda from the printed ceiling
                check(f"row {i}: printed lambda <= recomputed lambda (safe rounding)",
                      R["printed_lam"] <= R["lam"])
            check(f"row {i}: printed new ceiling >= recomputed (safe rounding)",
                  R["printed_new"] >= R["new"], f"{sci(R['printed_new'], 5)} >= {sci(R['new'], 6)}")
        check(f"{chain} chain: final ceiling < d_low (contradiction)", rows[-1]["new"] < low,
              f"{sci(rows[-1]['new'])} < {sci(low)}")

    print("\n== the 'three of the five rows' remark after Lemma 6: sign of lambda - (r+1)/B ==")
    for i, R in enumerate(t.head("printed")):
        v = R["lam"] - F(R["r"] + 1, b.B)
        print(f"  row {i} (r={R['r']}): {'negative' if v < 0 else 'positive'} ({sci(v, 3)})"
              + ("   [r = 0 row has no selected starts]" if R["r"] == 0 else ""))

    print("\n== tail d >= 2^65 ==")
    T = t.tail()
    check("log step: 81 x^13.3 + 1 <= 2^7 x^13.3", T["log_step_ok"])
    check("G_81 (7 + 13.3*67) < 2^65", T["closes_at_split"], f"{sci(T['at_split'], 5)} (printed {sci(t.PRINTED_TAIL_65, 5)})")
    check("printed 2.44647e19 < 2^65", t.PRINTED_TAIL_65 < 2 ** 65)
    check("j = 64 fails, so 2^65 is the first dyadic split", T["prev_fails"])
    check("induction step valid (13.3 G_81 <= left side)", T["induction_ok"])
    check("checked directly for 65 <= j < 3000", T["direct_ok"])
    print("  note: 2.7241e16 * 898.1 = " + sci(t.PRINTED_G81 * F("898.1"), 5)
          + "; the printed 2.44647e19 matches G_81 ~ 2.724048e16 instead (both are < 2^65).")

    th = t.theorem8()
    check("Theorem 8 closes for s <= 81 (head + tail)", th["closes"])
    print(f"\n{fails} failures")
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
