"""Tests for fcverify.core.  The small cases were worked out by hand from the paper's
definitions (T(n) = (3n+1)/2 or n/2; rho_j = 3^{d_j}/2^j; first k with rho_k < 1)."""
import itertools
import math

import pytest

from fcverify import core
from fcverify.scan import enumerate_words, check_seed


# ---- hand-computed orbits ---------------------------------------------------------
# n = 3:  3 o -> 5 (rho 3/2), 5 o -> 8 (9/4), 8 e -> 4 (9/8), 4 e -> 2 (9/16 < 1)
#         word 1100, k = 4, d = 2, T^4(3) = 2; 16*2 = 9*3 + C  =>  C = 5.
# n = 7:  7 o 11 o 17 o 26 e 13 o 20 e 10 e -> 5
#         rho: 3/2, 9/4, 27/8, 27/16, 81/32, 81/64, 81/128 < 1
#         word 1110100, k = 7, d = 4, end 5; C = 128*5 - 81*7 = 73
#         runs (0,3), (4,1); formula (2): (1-8/27)/1 + (1-2/3)/(27/16) = 57/81 + 16/81 = 73/81
# n = 59 (paper Example 4): 59 o 89 o 134 e 67 o 101 o 152 e 76 e -> 38
#         word 1101100, end 38, C = 128*38 - 81*59 = 85
HAND = [
    # n, word, k, d, C, end
    (3, "1100", 4, 2, 5, 2),
    (5, "10", 2, 1, 1, 4),
    (7, "1110100", 7, 4, 73, 5),
    (59, "1101100", 7, 4, 85, 38),
]


@pytest.mark.parametrize("n,word,k,d,C,end", HAND)
def test_hand_orbits(n, word, k, d, C, end):
    c = core.first_crossing(n)
    assert (c.word, c.k, c.d, c.end) == (word, k, d, end)
    assert core.correction(word) == (k, d, C)
    assert 2 ** k * end == 3 ** d * n + C           # eq. (1)
    assert core.correction_by_runs_times_3d(word) == C   # eq. (2)
    assert c.descends


def test_hand_runs():
    assert core.runs("1110100") == [(0, 3), (4, 1)]
    assert core.runs("1100") == [(0, 2)]
    assert core.runs("0") == []
    assert core.num_runs("1101100") == 2
    assert core.num_runs("110110110000") == 3


def test_run_formula_value_for_7():
    from fractions import Fraction as F
    # M_w for n = 7 from (2), done by hand above
    assert F(core.correction_by_runs_times_3d("1110100"), 81) == F(57, 81) + F(16, 81)


def test_first_crossing_word_predicate():
    assert core.is_first_crossing_word("1100")
    assert not core.is_first_crossing_word("110")        # rho_3 = 9/8 >= 1
    assert not core.is_first_crossing_word("10100")      # crossed already at step 2
    assert core.is_first_crossing_word("0")


def test_example4_classes():
    # paper Example 4: 1101100 -> 59 mod 128; 11011001 -> 187 mod 256;
    # 110110011 -> 187 mod 512; T^8(187) = 179, T^8(443) = 422
    assert core.word_class("1101100") == 59
    assert core.word_class("11011001") == 187
    assert core.word_class("110110011") == 187
    x, y = 187, 443
    for _ in range(8):
        x, y = core.T(x), core.T(y)
    assert (x, y) == (179, 422)
    assert core.least_eligible_realizer("1101100") == 59
    # 59 - T^7(59) = ((2^7 - 3^4)*59 - 85)/2^7 = 21
    assert ((2 ** 7 - 3 ** 4) * 59 - 85) // 2 ** 7 == 21


def test_word_class_matches_brute_force():
    """For every word of length <= 10, the class built from the word equals the set of
    n in [0, 2^k) whose first k parities spell it (brute force)."""
    for k in range(1, 11):
        seen = {}
        for n in range(1 << k):
            x, bits = n, []
            for _ in range(k):
                bits.append("1" if x & 1 else "0")
                x = core.T(x)
            seen["".join(bits)] = seen.get("".join(bits), []) + [n]
        assert len(seen) == 1 << k                     # bijection words <-> classes
        for w, ns in seen.items():
            assert ns == [core.word_class(w)]


def test_descent_criterion_can_fail():
    """The class test is not vacuous: at n = 1 (excluded by n >= 2) the inequality fails,
    matching T^2(1) = 1 which is not < 1.  The eligible realizer r(w) = 5 passes."""
    k, d, C = core.correction("10")
    assert (k, d, C) == (2, 1, 1)
    assert not 1 * (2 ** k - 3 ** d) > C
    assert core.least_eligible_realizer("10") == 5
    assert core.class_descends("10")


def test_criterion_agrees_with_orbits_on_class_members():
    """r(w)(2^k-3^d) > C <=> T^k(n) < n checked pointwise on several members of each class."""
    for w, r, d, C in enumerate_words(16):
        k = len(w)
        for t in range(4):
            n = r + t * (1 << k)
            if n < 2:
                continue
            x = n
            for _ in range(k):
                x = core.T(x)
            assert (x < n) == (n * (2 ** k - 3 ** d) > C)


def test_enumeration_matches_brute_force():
    """enumerate_words(K) yields exactly the first-crossing words of length <= K."""
    K = 12
    brute = {"".join(b) for k in range(1, K + 1) for b in itertools.product("01", repeat=k)
             if core.is_first_crossing_word("".join(b))}
    got = {}
    for w, r, d, C in enumerate_words(K):
        got[w] = (r, d, C)
    assert set(got) == brute
    for w, (r, d, C) in got.items():
        assert r == core.word_class(w)
        assert core.correction(w) == (len(w), d, C)


def test_family_110():
    # Prop. 9: prefix (110)^h has least realizer 8^h - 5, h = 1..5
    for h in range(1, 6):
        assert core.word_class("110" * h) == 8 ** h - 5
    # h = 12: k = 39, three appended zeros, completed least seed 343 597 383 675
    w = "110" * 12 + "000"
    assert core.is_first_crossing_word(w) and len(w) == 39 and w.count("1") == 24
    assert core.least_eligible_realizer(w) == 343_597_383_675
    assert core.word_class("110" * 12) == 68_719_476_731
    c = core.first_crossing(343_597_383_675)
    assert c.word == w and c.end == 176_518_460_300


def test_lemma5_and_squares_small():
    for n in range(3, 4000, 2):
        c = core.first_crossing(n)
        assert core.lemma5_run_bounds_hold(n, c.word)
        s = core.num_runs(c.word)
        G = sum(math.log2(3) ** i for i in range(s))
        assert c.d <= G * math.log2(n + 1) + 1e-9
        for l in core.initial_square_lengths(c.word):
            assert 4 ** l < 3 ** l * (n + 1)


def test_check_seed_clean_on_small_range():
    for n in range(3, 3000, 2):
        *_, bad, _ = check_seed(n)
        assert bad == []


def test_first_crossing_detects_planted_bad_data():
    """check_seed flags inconsistent data: corrupting the word changes C and breaks eq. (1)."""
    c = core.first_crossing(7)
    k, d, C = core.correction(c.word)
    _, _, C_bad = core.correction("1101100")
    assert 2 ** k * c.end == 3 ** d * 7 + C
    assert 2 ** k * c.end != 3 ** d * 7 + C_bad
