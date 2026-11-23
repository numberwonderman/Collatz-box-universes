"""Round 2 tests: Theorem 8 rows, Lemma 6 / Lemma 7 machinery.  Hand cases from the
definitions: m_i = (1-(2/3)^{l_i})/rho_{t_i}, x_i = rho_{t_i}(n + M_i), H = least integer
with x + 1 < 2^H, G_t = sum_{j<t} alpha^j."""
import math
from fractions import Fraction as F

from fcverify import core, lemmas as L, thm8 as t, bounds as b

ALPHA = math.log2(3)


# ---- hand-worked Lemma 6/7 data -------------------------------------------------------
# n = 7, word 1110100 (round 1): runs (t,l) = (0,3), (4,1)
#   m_1 = (1 - 8/27)/1 = 19/27 ; rho_4 = 27/16, m_2 = (1/3)/(27/16) = 16/81
#   sum = 57/81 + 16/81 = 73/81 = C/3^4 (C = 73)
#   prefix 1110: C_4 = 19 (0 -> 1 -> 5 -> 19 -> 19), M_2 = 19/27,
#   x_2 = (27/16)(7 + 19/27) = (27/16)(208/27) = 13 = T^4(7)   (7, 11, 17, 26, 13)
#   Lemma 7, r = 1: starts 7, 13; 8 < 2^4 and 14 < 2^4 so H = 4; d = 4 < 4 (G_1 + 1) = 8
#   Lemma 7, r = 0: H = 4; d = 4 < 4 G_2 = 4 (1 + alpha) ~ 10.34
def test_hand_n7():
    R = L.run_data(7, "1110100")
    assert [(r[0], r[1], r[2]) for r in R] == [(0, 3, 7), (4, 1, 13)]
    assert R[0][3] == F(19, 27) and R[1][3] == F(16, 81)
    assert R[1][4] == F(27, 16) and R[1][5] == F(19, 27)
    assert R[1][4] * (7 + R[1][5]) == 13
    assert sum(r[3] for r in R) == F(73, 81)
    assert (7 + 1).bit_length() == 4 and (13 + 1).bit_length() == 4
    assert 4 < 4 * (1 + 1) and 4 < 4 * (1 + ALPHA)
    out = L.check_realizer(7, "1110100")
    assert out["bad"] == [] and out["s"] == 2


# n = 59, word 1101100: runs (0,2), (3,2)
#   m_1 = 1 - 4/9 = 5/9 ; rho_3 = 9/8, m_2 = (5/9)/(9/8) = 40/81 ; sum = 85/81 (C = 85)
#   prefix 110: C_3 = 5, M_2 = 5/9, x_2 = (9/8)(59 + 5/9) = 67 = T^3(59)
def test_hand_n59():
    R = L.run_data(59, "1101100")
    assert [(r[0], r[1], r[2]) for r in R] == [(0, 2, 59), (3, 2, 67)]
    assert R[0][3] == F(5, 9) and R[1][3] == F(40, 81)
    assert sum(r[3] for r in R) == F(85, 81)
    assert L.check_realizer(59, "1101100")["bad"] == []


def test_checker_detects_a_non_realizer():
    """Passing a seed that does NOT realize the word must be flagged (L6b: x_i mismatch)."""
    out = L.check_realizer(9, "1110100")
    assert any(key == "L6b" for key, *_ in out["bad"])


def test_composition_hand():
    G = lambda t: sum(ALPHA ** j for j in range(t))
    # s = 3, r = 1: (1,2),(2,1) both equal G_2 + 1 = 2 + alpha
    assert abs(G(1) + G(2) - (G(2) + 1)) < 1e-12
    # s = 4, r = 1: (2,2) gives 2 + 2 alpha <= G_3 + 1 = 2 + alpha + alpha^2
    assert G(2) + G(2) < G(3) + 1
    assert list(L.compositions(4, 2)) == [[1, 3], [2, 2], [3, 1]]
    assert L.check_compositions(10)[1] == 0


def test_G_enclosure():
    lo, hi = L.G_enc(81)
    assert lo < hi and hi - lo < F(1, 10 ** 100)
    assert abs(float(lo) - (ALPHA ** 81 - 1) / (ALPHA - 1)) / float(lo) < 1e-12
    assert hi < t.PRINTED_G81


# ---- Theorem 8 -----------------------------------------------------------------------
def test_convergents_I_to_IV():
    cv = b.convergents(60)
    idx = {name: cv.index(pq) for name, pq in t.CONV.items()}
    assert idx == {"I": 32, "II": 40, "III": 36, "IV": 34}
    for name, (p, q) in t.CONV.items():
        lo, hi = b.e_enclosure(p, q)
        plo, phi = t.PRINTED_E[name]
        assert 0 < plo < lo < hi < phi


def test_row0_by_hand():
    # lambda ~ (ln2 - 2^65 * 6.71987e-21)/5.0248e19 ~ 8.8606e-21; 81/lambda ~ 9.14e21,
    # log2 ~ 72.95, so H = 73; new ceiling 73 * G_81 ~ 73 * 2.719e16 ~ 1.985e18
    lam = (math.log(2) - 2 ** 65 * 6.719870644e-21) / 5.024798415352542e19
    assert abs(lam - 8.8606e-21) < 1e-24
    assert math.ceil(math.log2(1 + 81 / lam)) == 73
    R = t.row(F(2 ** 65), "II", 0)
    assert R["H"] == 73 and abs(float(R["lam"]) - lam) / lam < 1e-6
    assert abs(float(R["new"]) - 73 * (ALPHA ** 81 - 1) / (ALPHA - 1)) / float(R["new"]) < 1e-9


def test_all_rows_reproduce_both_chains():
    for chain in ("exact", "printed"):
        rows = t.head(chain)
        assert len(rows) == 5
        for R in rows:
            assert R["ok"] and R["lam_gt_r_over_B"]
            assert R["H"] == R["printed_H"]
            assert R["new"] <= R["printed_new"]
        assert rows[-1]["new"] < t.lower_bound_d()


def test_printed_lambdas_are_truncations():
    for R in t.head("printed"):
        assert R["printed_lam"] <= R["lam"] < R["printed_lam"] + F("0.0001e-19") * 10


def test_lower_bound():
    assert t.lower_bound_d() > F("1.28e17")
    assert t.lower_bound_d_printed_form() > F("1.28e17")


def test_tail():
    T = t.tail()
    assert T["closes_at_split"] and T["prev_fails"] and T["induction_ok"] and T["direct_ok"]
    assert T["log_step_ok"]


def test_row_rejects_bad_input():
    # a ceiling so large that lambda <= 0 must be rejected
    assert not t.row(F(10) ** 25, "II", 0)["ok"]
    # lambda > r/B fails for absurdly large r
    assert not t.row(F("3.194e17"), "IV", 10 ** 6)["ok"]


def test_theorem8_closes():
    assert t.theorem8()["closes"]
