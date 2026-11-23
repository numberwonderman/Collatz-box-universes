import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from wss.fib import naive_fib
from wss.fibprimes import (COMPOSITE_ANCHOR, DIVISIBILITY_ANCHOR, PRIME_ANCHORS,
                           fib, mr_witness, prove_prime, smallest_prime_factor)


def test_big_fib_matches_naive_up_to_300():
    for n in range(301):
        assert fib(n) == naive_fib(n), n


@pytest.mark.parametrize("n,value", PRIME_ANCHORS)
def test_prime_anchor(n, value):
    assert fib(n) == value
    assert prove_prime(value)[0]
    # independent: trial division up to sqrt
    assert all(value % d for d in range(2, int(value ** 0.5) + 1))


def test_f19_composite_anchor():
    n, value, (a, b) = COMPOSITE_ANCHOR
    assert fib(n) == value == a * b == 37 * 113
    assert prove_prime(a)[0] and prove_prime(b)[0]
    assert not prove_prime(value)[0]
    assert smallest_prime_factor(value)[0] == 37
    assert 37 % 19 == 18  # 37 ≡ -1 (mod 19)


def test_divisibility_anchor():
    d, n, fn, cof = DIVISIBILITY_ANCHOR
    assert fib(d) == 5 and fib(n) == fn == 5 * cof
    assert fib(n) % fib(d) == 0


def test_divisibility_d_divides_n_up_to_120():
    for n in range(1, 121):
        for d in range(1, n + 1):
            if n % d == 0:
                assert fib(n) % fib(d) == 0, (d, n)


def test_prove_prime_small_range_vs_sieve():
    from wss.fib import primes_below
    ps = set(primes_below(20000))
    assert all(prove_prime(n)[0] == (n in ps) for n in range(20000))


def test_known_carmichael_and_strong_pseudoprimes_rejected():
    # 3215031751 is a strong pseudoprime to bases 2, 3, 5, 7; 3825123056546413051 to bases 2..23.
    for n in (561, 3215031751, 3825123056546413051):
        assert not prove_prime(n)[0]
    assert mr_witness(3215031751, [2, 3, 5, 7]) is None


def test_large_known_prime_and_composite():
    assert prove_prime(fib(83))[0]  # F_83 is a known Fibonacci prime (beyond the MR-deterministic range)
    assert prove_prime(2 ** 127 - 1)[0]
    assert not prove_prime((2 ** 127 - 1) * (2 ** 61 - 1))[0]


def test_full_factor_known_cases():
    from wss.fibprimes import full_factor
    assert full_factor(4181)[0] == [37, 113]
    assert full_factor(2 ** 4 * 3 ** 2 * 1000003)[0] == [2, 2, 2, 2, 3, 3, 1000003]
    # F_73 = 9375829 * 86020717 (smallest factor above the trial-division bound)
    assert full_factor(fib(73))[0] == [9375829, 86020717]
    assert smallest_prime_factor(fib(73))[0] == 9375829
