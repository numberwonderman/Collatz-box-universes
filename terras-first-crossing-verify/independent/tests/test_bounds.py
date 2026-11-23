"""Tests for fcverify.bounds (Theorem 6 arithmetic of the v2 paper)."""
import math
from decimal import Decimal, getcontext
from fractions import Fraction as F

from fcverify import bounds as b


def test_ln_enclosures_contain_true_values():
    L2, U2, L3, U3 = b.ln_enclosures()
    assert L2 < U2 and L3 < U3
    assert U2 - L2 < F(1, 10 ** 150) and U3 - L3 < F(1, 10 ** 150)
    # third, unrelated route: Decimal.ln at 120 digits
    getcontext().prec = 120
    d2, d3 = Decimal(2).ln(), Decimal(3).ln()
    tol = Decimal(10) ** -110
    assert Decimal(L2.numerator) / Decimal(L2.denominator) <= d2 + tol
    assert Decimal(U2.numerator) / Decimal(U2.denominator) >= d2 - tol
    assert Decimal(L3.numerator) / Decimal(L3.denominator) <= d3 + tol
    assert Decimal(U3.numerator) / Decimal(U3.denominator) >= d3 - tol


def test_first_convergents_by_hand():
    # log2 3 = 1.58496...: 1, 2, 3/2, 8/5, 19/12, 65/41, 84/53, 485/306
    assert b.convergents(10)[:8] == [(1, 1), (2, 1), (3, 2), (8, 5), (19, 12), (65, 41),
                                     (84, 53), (485, 306)]
    assert b.continued_fraction(10)[:6] == [1, 1, 1, 2, 2, 3]


def test_paper_convergents_and_mediant():
    cv = b.convergents(50)
    a, bb = 9_809_721_694, 6_189_245_291
    u, v = 630_138_897, 397_573_379
    assert cv[20] == (a, bb) and cv[19] == (u, v)
    assert bb * u - a * v == 1
    assert cv[21] == (a + u, bb + v) == (10_439_860_591, 6_586_818_670)
    assert b.PAIR_I in cv and b.PAIR_II in cv


def test_sandwich_certifications():
    L2, U2, L3, U3 = b.ln_enclosures()
    a, bb = 9_809_721_694, 6_189_245_291
    u, v = 630_138_897, 397_573_379
    assert bb * L3 - a * U2 > 0                       # a/b < alpha
    assert F(u, v) * L2 - U3 > F(1, 3 * b.B)          # (u/v) ln2 - ln3 > 1/(3B)


def test_least_denominator_fraction_is_the_paper_bound():
    inner, outer = b.least_crossing_fraction()
    assert inner == outer == F(10_439_860_591, 6_586_818_670)


def test_simplest_fraction_small_cases():
    assert b.simplest_in_open_interval(F(1, 3), F(1, 2)) == F(2, 5)
    assert b.simplest_in_open_interval(F(3, 10), F(7, 20)) == F(1, 3)
    assert b.simplest_in_open_interval(F(5, 2), F(7, 2)) == 3
    assert b.simplest_in_open_interval(F(3), F(7, 2)) == F(10, 3)   # 7/2 itself excluded


def test_simplest_fraction_brute_force():
    import itertools
    for (p1, q1), (p2, q2) in itertools.product([(1, 7), (2, 9), (5, 11), (3, 4)], repeat=2):
        x, y = F(p1, q1), F(p2, q2)
        if not x < y:
            continue
        got = b.simplest_in_open_interval(x, y)
        q = next(q for q in range(1, 200) if any(x < F(p, q) < y for p in range(0, 200)))
        assert got.denominator == q and x < got < y


def test_e_enclosures_match_paper():
    lo, hi = b.e_enclosure(*b.PAIR_I)
    assert F(522, 100) * F(1, 10 ** 18) < lo < hi < F(524, 100) * F(1, 10 ** 18)
    lo, hi = b.e_enclosure(*b.PAIR_II)
    assert F(124, 100) * F(1, 10 ** 19) < lo < hi < F(125, 100) * F(1, 10 ** 19)


def test_G75():
    G = b.G_upper(75)
    assert G < F(172, 100) * 10 ** 15
    alpha = math.log2(3)
    assert abs(float(G) - (alpha ** 75 - 1) / (alpha - 1)) / float(G) < 1e-12
    assert b.G_upper(1) == 1


def test_run_argument_75_closes_and_76_does_not():
    r75 = b.run_argument(75)
    assert r75["closes"]
    assert r75["d_low"] > F(126, 100) * 10 ** 17
    assert r75["lambda_low"] > F(9, 10 ** 20)
    assert r75["log2_bound"] == 70
    assert r75["head_d_upper"] < F(1204, 1000) * 10 ** 17
    assert not b.run_argument(76)["closes"]
    assert b.max_s_closing() == 75


def test_tail_holds_far_beyond_split():
    G = b.G_upper(75)
    for j in range(61, 3000):
        assert G * (7 + 14 * (j + 2)) < 2 ** j
    assert not G * (7 + 14 * (60 + 2)) < 2 ** 60      # 61 is the least split that works


def test_tail_log_step():
    # n < 75 x^{13.3} with x = 2d >= 2 implies n + 1 < 2^7 x^{14}: 75 x^13.3 + 1 <= 76 x^14 < 128 x^14
    assert 75 + 1 < 2 ** 7
