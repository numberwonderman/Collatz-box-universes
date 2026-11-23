"""Round 2: independent recomputation of Theorem 8 (the 81-run theorem) of
De Jesús, Hexagon 2611.00459v2 (12 pp.; text identical to repo manuscript/note.pdf = v3).

Reuses only this project's own round-1 code (fcverify.bounds: log enclosures from the
series sum 1/(k 2^k), sum 1/(k 3^k); continued fraction of log2 3).  Nothing from the
companion repository is imported or copied.  All decisions use exact Fractions.

The argument (manuscript §3), restated as what is computed here:

  S = 81 (run budget).  B = 28e18 (Rozier--Terracol, taken as given).
  LOWER  : convergent I, d > (ln2 - q_I S/B)/e_I            (needs Lambda < S/B)
  ROW    : given a ceiling d <= D, a convergent p/q < alpha and r >= 0:
             lambda = (ln2 - D e)/q                       (q Lambda + d e >= ln 2)
             require lambda > r/B                           (Lemma 6 hypothesis)
             initial start   : n + 1 < 1 + S/lambda         (Lemma 6, (4))
             selected starts : x + 1 < 1 + (S-r)(1+S/B)/(lambda - r/B)   (Lemma 6, (5)), r >= 1
             H = least integer with both bounds <= 2^H      (so x + 1 < 2^H at all r+1 starts)
             new ceiling d < H (G_{S-r} + r)                (Lemma 7)
  HEAD   : start from D = 2^65, run the five rows, final ceiling must be < LOWER.
  TAIL   : d >= 2^65: Rhin Lambda >= k^-13.3 (taken as given), k <= 2d, n < S (2d)^13.3,
           log2(n+1) < 7 + 13.3 log2(2d) < 7 + 13.3 (j+2) for 2^j <= d < 2^{j+1};
           Lemma 5 from the seed: d <= G_S log2(n+1); closes iff G_S (7 + 13.3(j+2)) < 2^j
           for all j >= 65 (checked at j = 65 plus the doubling induction, and directly
           for 65 <= j < 3000).
"""
from __future__ import annotations

from fractions import Fraction as F

from . import bounds as b

S_RUNS = 81
B = b.B

CONV = {
    "I": (9_881_527_843_552_324, 6_234_549_927_241_963),
    "II": (79_641_170_620_168_673_833, 50_247_984_153_525_417_450),
    "III": (6_724_555_128_221_608_268, 4_242_721_909_926_539_673),
    "IV": (423_372_672_964_960_618, 267_118_416_222_671_843),
}

# The manuscript's table: (r, H, lambda >=, new bound on d, convergent used)
PRINTED_ROWS = [
    (0, 73, F("8.8606e-21"), F("1.9886e18"), "II"),
    (2, 71, F("1.0491e-19"), F("7.6987e17"), "III"),
    (3, 71, F("1.4074e-19"), F("4.8572e17"), "III"),
    (4, 74, F("1.4909e-19"), F("3.1940e17"), "III"),
    (7, 68, F("6.3202e-19"), F("7.3709e16"), "IV"),
]
PRINTED_E = {"I": (F("5.22e-18"), F("5.24e-18")), "II": (F("6.71e-21"), F("6.72e-21")),
             "III": (F("1.24e-19"), F("1.25e-19")), "IV": (F("1.64e-18"), F("1.65e-18"))}
PRINTED_LOWER = F("1.28e17")
PRINTED_G81 = F("2.7241e16")
PRINTED_TAIL_65 = F("2.44647e19")
HEAD_START = F(2 ** 65)


def lower_bound_d(S: int = S_RUNS) -> F:
    """Rigorous lower bound for d from convergent I (exact enclosures)."""
    L2, U2, L3, U3 = b.ln_enclosures()
    p, q = CONV["I"]
    e_lo, e_hi = b.e_enclosure(p, q)
    return (L2 - F(q * S, B)) / e_hi


def lower_bound_d_printed_form(S: int = S_RUNS) -> F:
    """The manuscript's displayed form (0.69 - q 81/B)/5.24e-18."""
    q = CONV["I"][1]
    return (F("0.69") - F(q * S, B)) / F("5.24e-18")


def row(D: F, conv: str, r: int, S: int = S_RUNS) -> dict:
    L2, U2, L3, U3 = b.ln_enclosures()
    p, q = CONV[conv]
    e_lo, e_hi = b.e_enclosure(p, q)
    lam = (L2 - D * e_hi) / q                       # rigorous lower bound on Lambda
    lam_centre = (((L2 + U2) / 2) - D * ((e_lo + e_hi) / 2)) / q
    out = dict(r=r, conv=conv, q=q, D=D, lam=lam, lam_centre=lam_centre,
               lam_gt_r_over_B=lam > F(r, B))
    if lam <= 0 or lam <= F(r, B):
        out.update(ok=False)
        return out
    init = 1 + S / lam
    sel = 1 + (S - r) * (1 + F(S, B)) / (lam - F(r, B)) if r >= 1 else F(0)
    top = max(init, sel)
    H = b.ceil_log2(top)
    G = b.G_upper(S - r)
    out.update(init_bound=init, sel_bound=sel, H=H, G=G, new=H * (G + r), ok=True,
               # how far the binding height bound sits below 2^H, in bits
               log2_slack=H - _log2(top), binding="selected" if sel > init else "initial")
    return out


def _log2(x: F) -> float:
    import math
    return math.log2(x.numerator) - math.log2(x.denominator)


def head(chain: str = "exact", rows=PRINTED_ROWS, start: F = HEAD_START, S: int = S_RUNS):
    """chain='exact': each row uses the previous row's rigorous new ceiling.
       chain='printed': each row uses the manuscript's printed ceiling of the row above."""
    D, out = start, []
    for i, (r, H_p, lam_p, new_p, conv) in enumerate(rows):
        R = row(D, conv, r, S)
        R.update(printed_H=H_p, printed_lam=lam_p, printed_new=new_p)
        out.append(R)
        if not R["ok"]:
            break
        D = R["new"] if chain == "exact" else new_p
    return out


def tail(S: int = S_RUNS, split: int = 65, coeff=F("13.3"), const: int = 7):
    G = b.G_upper(S)
    f = lambda j: G * (const + coeff * (j + 2))
    return dict(G=G, at_split=f(split), closes_at_split=f(split) < 2 ** split,
                prev_fails=not f(split - 1) < 2 ** (split - 1),
                induction_ok=coeff * G <= f(split),
                direct_ok=all(f(j) < 2 ** j for j in range(split, 3000)),
                log_step_ok=(S + 1) <= 2 ** const)


def theorem8(S: int = S_RUNS, chain: str = "exact") -> dict:
    h = head(chain, S=S)
    low = lower_bound_d(S)
    final = h[-1].get("new")
    t = tail(S)
    head_ok = all(R["ok"] for R in h) and len(h) == 5 and final is not None and final < low
    return dict(rows=h, lower=low, final=final, head_ok=head_ok, tail=t,
                closes=head_ok and t["closes_at_split"] and t["induction_ok"] and t["log_step_ok"])
