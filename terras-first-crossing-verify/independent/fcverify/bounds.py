"""Independent recomputation of the finite arithmetic behind Theorem 6 of the v2 paper
(the 76-run / 10 439 860 591-step / 6 586 818 670-odd-input bounds).

Logarithm enclosures use a different series from the companion repository:
    ln 2     = sum_{k>=1} 1/(k 2^k)          tail after N terms < 1/((N+1) 2^N)
    ln (3/2) = sum_{k>=1} 1/(k 3^k)          tail after N terms < 1/(2 (N+1) 3^N)
    ln 3     = ln 2 + ln(3/2)
Every decision below is an exact comparison of Python Fractions.

External inputs taken AS GIVEN (not recomputed, cannot be recomputed here):
  * B = 28 * 10^18  -- Rozier--Terracol, Cor. 5.4: chi(n) = tau(n) for 2 <= n <= B.
  * Rhin's estimate in the form Lambda = k ln2 - d ln3 >= k^{-13.3} (as used in
    Rozier--Terracol, Prop. 6.3).
"""
from __future__ import annotations

from fractions import Fraction as F
from functools import lru_cache

B = 28 * 10 ** 18
PREC = 640                    # dyadic rounding of the enclosures: 2^-640
NTERMS = 700                  # series terms


def _round_down(x: F) -> F:
    return F((x.numerator << PREC) // x.denominator, 1 << PREC)


def _round_up(x: F) -> F:
    return F(-((-x.numerator << PREC) // x.denominator), 1 << PREC)


@lru_cache(maxsize=None)
def ln_enclosures() -> tuple[F, F, F, F]:
    """Return (L2, U2, L3, U3) with L2 < ln 2 < U2 and L3 < ln 3 < U3."""
    N = NTERMS
    s2 = sum(F(1, k * 2 ** k) for k in range(1, N + 1))
    t2 = F(1, (N + 1) * 2 ** N)
    s32 = sum(F(1, k * 3 ** k) for k in range(1, N + 1))
    t32 = F(1, 2 * (N + 1) * 3 ** N)
    L2, U2 = _round_down(s2), _round_up(s2 + t2)
    L32, U32 = _round_down(s32), _round_up(s32 + t32)
    return L2, U2, L2 + L32, U2 + U32


def alpha_enclosure() -> tuple[F, F]:
    """alpha = log2 3 = ln3/ln2."""
    L2, U2, L3, U3 = ln_enclosures()
    return L3 / U2, U3 / L2


def continued_fraction(n_terms: int = 60) -> list[int]:
    """Partial quotients of alpha certified by agreement of both enclosure endpoints."""
    lo, hi = alpha_enclosure()
    out = []
    while len(out) < n_terms:
        a, b = lo.numerator // lo.denominator, hi.numerator // hi.denominator
        if a != b:
            break
        out.append(a)
        lo, hi = lo - a, hi - a
        if lo == 0 or hi == 0:
            break
        lo, hi = 1 / hi, 1 / lo          # x -> 1/x reverses order
    if len(out) < n_terms:
        raise RuntimeError(f"precision only gave {len(out)} partial quotients")
    return out


def convergents(n_terms: int = 60) -> list[tuple[int, int]]:
    """(p_i, q_i), i = 0, 1, ..., with p_0/q_0 = a_0/1."""
    cf = continued_fraction(n_terms)
    p_prev, q_prev, p, q = 1, 0, cf[0], 1
    out = [(p, q)]
    for a in cf[1:]:
        p_prev, q_prev, p, q = p, q, a * p + p_prev, a * q + q_prev
        out.append((p, q))
    return out


def e_enclosure(p: int, q: int) -> tuple[F, F]:
    """e = q ln3 - p ln2."""
    L2, U2, L3, U3 = ln_enclosures()
    return q * L3 - p * U2, q * U3 - p * L2


# ----------------------------------------------------------------------------------
# The Farey sandwich
# ----------------------------------------------------------------------------------

def simplest_in_open_interval(x: F, y: F) -> F:
    """The fraction of least denominator strictly between x < y (x, y > 0)."""
    assert x < y
    fl = x.numerator // x.denominator
    if fl + 1 < y:                       # an integer fits strictly inside
        return F(fl + 1)
    if x == fl:                          # x integer: interval (fl, y) with y <= fl+1
        return fl + 1 / simplest_in_open_interval(1 / (y - fl), _BIG)
    return fl + 1 / simplest_in_open_interval(1 / (y - fl), 1 / (x - fl))


_BIG = F(10) ** 400                      # stands in for +infinity in the recursion


def least_crossing_fraction() -> tuple[F, F]:
    """A failure needs alpha < k/d and (k/d) ln2 - ln3 < 1/(3n) < 1/(3B)
    (paper (4)), i.e. k/d in the open interval (alpha, alpha + 1/(3B ln 2)).
    Return the least-denominator fraction for an INNER and an OUTER rational
    enclosure of that interval; if both agree, it is certified."""
    L2, U2, L3, U3 = ln_enclosures()
    a_lo, a_hi = L3 / U2, U3 / L2
    inner = simplest_in_open_interval(a_hi, (L3 + F(1, 3 * B)) / U2)
    outer = simplest_in_open_interval(a_lo, (U3 + F(1, 3 * B)) / L2)
    return inner, outer


# ----------------------------------------------------------------------------------
# The run argument of Theorem 6, for a general run count s
# ----------------------------------------------------------------------------------

def G_upper(s: int) -> F:
    """Upper bound for G_s = sum_{j<s} alpha^j using the upper enclosure of alpha.
    (Rounded outward to keep the Fractions small.)"""
    _, a_hi = alpha_enclosure()
    a_hi = _round_up(a_hi)
    tot, pw = F(0), F(1)
    for _ in range(s):
        tot += pw
        pw = _round_up(pw * a_hi)
    return tot


def ceil_log2(x: F) -> int:
    """Least integer m with x <= 2^m (x > 0)."""
    m = 0
    while F(1 << m) < x:
        m += 1
    return m


PAIR_I = (9_881_527_843_552_324, 6_234_549_927_241_963)
PAIR_II = (6_724_555_128_221_608_268, 4_242_721_909_926_539_673)
SPLIT_EXP = 61     # the paper's split d < 2^61 / d >= 2^61


def run_argument(s: int, pair_I=PAIR_I, pair_II=PAIR_II, split=SPLIT_EXP) -> dict:
    """Re-derive Theorem 6's contradiction for words with at most s odd runs, using exact
    rational enclosures instead of the paper's rounded displays.  Returns the intermediate
    quantities and whether each branch closes.

    Logic (paper §3, from Proposition 1, (3), (4), Lemma 5):
      failure, n > B, s runs   =>  0 < Lambda < s/n < s/B.
      For p/q < alpha: q*Lambda + d*e = (qk - pd) ln2 >= ln2  (qk - pd is a positive integer)
      pair I : d > (ln2 - q s/B)/e_I                                  =: d_low
      head (d < 2^split), pair II : Lambda >= (ln2 - d e_II)/q_II > (ln2 - 2^split e_II)/q_II
               => n < s/Lambda,  L = log2(n+1) <= m,  d <= G_s L <= G_s m  (Lemma 5)
               closes iff G_s m < d_low
      tail (d >= 2^split), Rhin: Lambda >= k^{-13.3}, k <= 2d:
               n < s (2d)^{13.3};   with 2^c >= s+1:   n + 1 < 2^c (2d)^{14}
               so log2(n+1) < c + 14 log2(2d) < c + 14 (j+2) when 2^j <= d < 2^{j+1}
               closes iff G_s (c + 14(j+2)) < 2^j for every j >= split, which holds for all
               j >= split as soon as it holds at j = split (the left side grows by 14 G_s,
               which is at most the left side, while 2^j doubles).
    """
    L2, U2, L3, U3 = ln_enclosures()
    G = G_upper(s)
    pI, qI = pair_I
    pII, qII = pair_II
    eI_lo, eI_hi = e_enclosure(pI, qI)
    eII_lo, eII_hi = e_enclosure(pII, qII)
    assert eI_lo > 0 and eII_lo > 0, "pairs must satisfy p/q < alpha"
    d_low = (L2 - F(qI * s, B)) / eI_hi
    lam_low = (L2 - (1 << split) * eII_hi) / qII
    head_ok = lam_low > 0
    m = ceil_log2(s / lam_low + 1) if head_ok else None
    head_d_up = G * m if head_ok else None
    head_closes = bool(head_ok and head_d_up < d_low)
    # the head also needs d_low itself to be consistent with the split: nothing else.
    c = ceil_log2(F(s + 1))
    tail_at_split = G * (c + 14 * (split + 2))
    tail_closes = tail_at_split < (1 << split) and 14 * G <= tail_at_split
    return dict(s=s, G_upper=G, d_low=d_low, lambda_low=lam_low, log2_bound=m,
                head_d_upper=head_d_up, head_closes=head_closes,
                c=c, tail_lhs_at_split=tail_at_split, tail_closes=tail_closes,
                closes=head_closes and tail_closes)


def max_s_closing(limit: int = 200) -> int:
    best = 0
    for s in range(1, limit + 1):
        if run_argument(s)["closes"]:
            best = s
        else:
            break
    return best
