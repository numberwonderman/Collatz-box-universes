import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from wss.fib import (ANCHORS, fib_mod, fib_pair_mod, legendre5, naive_fib,
                     primes_below, wss_residue)

NAIVE = [naive_fib(n) for n in range(202)]


def test_naive_base_values():
    assert NAIVE[:10] == [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]


@pytest.mark.parametrize("n", range(201))
def test_fast_doubling_exact_vs_naive(n):
    # Modulus larger than F_n: fast doubling must return the exact integer.
    m = NAIVE[200] * 10 + 7
    assert fib_mod(n, m) == NAIVE[n]
    assert fib_pair_mod(n, m) == (NAIVE[n], NAIVE[n + 1])


@pytest.mark.parametrize("m", [1, 2, 3, 4, 9, 10, 49, 121, 169, 997, 10**6 + 3])
def test_fast_doubling_mod_vs_naive(m):
    for n in range(201):
        assert fib_mod(n, m) == NAIVE[n] % m


@pytest.mark.parametrize("p,n,m,expected", ANCHORS)
def test_anchor(p, n, m, expected):
    assert m == p * p
    assert n == p - legendre5(p)
    assert fib_mod(n, m) == expected
    assert wss_residue(p) == expected


def test_large_n_consistency():
    # F_{a+b} = F_a F_{b+1} + F_{a-1} F_b, checked mod a large p^2 at n ~ 10^6.
    m = 999983 ** 2
    a, b = 600_001, 400_000
    lhs = fib_mod(a + b, m)
    rhs = (fib_mod(a, m) * fib_mod(b + 1, m) + fib_mod(a - 1, m) * fib_mod(b, m)) % m
    assert lhs == rhs


def test_legendre5():
    assert [legendre5(p) for p in (2, 3, 7, 11, 13, 19, 29)] == [-1, -1, -1, 1, -1, 1, 1]
    with pytest.raises(ValueError):
        legendre5(5)


def test_primes_below():
    assert primes_below(30) == [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
    assert len(primes_below(10**6)) == 78498


@pytest.mark.parametrize("p", [2, 3, 7, 101, 1063, 123863, 508771])
def test_wss_residue_vs_exact_bigint(p):
    # Independent check: exact big-integer F_n reduced mod p^2.
    assert wss_residue(p) == naive_fib(p - legendre5(p)) % (p * p)


def test_large_n_consistency_near_1e7():
    # Addition identity at n ~ 10^7 modulo the square of the largest prime < 10^7.
    m = 9999991 ** 2
    a, b = 6_000_001, 3_999_990
    lhs = fib_mod(a + b, m)
    rhs = (fib_mod(a, m) * fib_mod(b + 1, m) + fib_mod(a - 1, m) * fib_mod(b, m)) % m
    assert lhs == rhs


def test_prime_count_below_1e7():
    assert len(primes_below(10**7)) == 664579


@pytest.mark.parametrize("p", [1000003, 2000003])
def test_wss_residue_vs_exact_bigint_new_band(p):
    assert wss_residue(p) == naive_fib(p - legendre5(p)) % (p * p)
