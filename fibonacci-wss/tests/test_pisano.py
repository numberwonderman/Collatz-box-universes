import os
import random
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from wss.fib import fib_mod, primes_below
from wss.pisano import PISANO_ANCHORS, pisano


@pytest.mark.parametrize("m,expected", PISANO_ANCHORS)
def test_pisano_anchor(m, expected):
    assert pisano(m) == expected


def test_pisano_matches_definition_via_fast_doubling():
    # Independent check: pi(m) is the least k > 0 with F_k = 0 and F_{k+1} = 1 mod m.
    for m in range(2, 151):
        k = pisano(m)
        assert fib_mod(k, m) == 0 and fib_mod(k + 1, m) == 1 % m
        for j in range(1, k):
            assert not (fib_mod(j, m) == 0 and fib_mod(j + 1, m) == 1)


_rng = random.Random(20261123)
EVEN_SAMPLE = list(range(3, 201)) + sorted(_rng.sample(range(201, 5001), 100))


@pytest.mark.parametrize("m", EVEN_SAMPLE)
def test_pisano_even_for_m_gt_2(m):
    assert pisano(m) % 2 == 0


@pytest.mark.parametrize("p", [p for p in primes_below(60)])
def test_period_lifts_small_primes(p):
    assert pisano(p * p) == p * pisano(p)
