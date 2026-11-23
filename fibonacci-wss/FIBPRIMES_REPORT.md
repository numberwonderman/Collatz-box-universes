# Fibonacci primes F_p, p ≤ 2,000

Convention: F_1 = F_2 = 1. Every number below is read from `fibprimes_results.json`.

## Checks

- Fibonacci-prime tests (`pytest tests/test_fibprimes.py`): **11 passed, 0 failed** (`11 passed in 0.12s`).
- Full suite (`pytest tests`): **565 passed, 0 failed** (`565 passed in 54.13s`).
- Anchor: F_17 = 1597 is prime: holds.
- Anchor: F_23 = 28657 is prime: holds.
- Anchor: F_29 = 514229 is prime: holds.
- Anchor: F_19 = 4181 = 37 x 113 is composite: holds.
- Anchor: F_5 = 5 divides F_20 = 6765 = 5 x 1353: holds.

## Primality test used

- Small numbers: n < 3.317e24: Miller-Rabin with prime bases 2..41 (proven deterministic in this range); after trial division by the first 20 primes.
- Large numbers: Miller-Rabin with the first 20 prime bases as a compositeness filter (a witness proves compositeness); every survivor proven prime by PARI/GP isprime (APRCL) and an ECPP certificate from primecert verified by primecertisvalid.
- PARI/GP version: 2.19.1 (bundled with cypari2).
- How each F_n was decided: n < 2: 1; trial division: 5; deterministic Miller-Rabin (bases 2..41): 25; Miller-Rabin witness: 264; PARI isprime (APRCL) + verified ECPP certificate: 9.
- Every composite verdict rests on an explicit divisor or Miller–Rabin witness, and every prime verdict on a proof. Nothing is only a probable prime.

## Part 1: the hunt

Tested 304 indices (every prime p <= 2000 plus n = 4; F_2 = 1 is not prime). F_n is prime for these **21** indices:

3, 4, 5, 7, 11, 13, 17, 23, 29, 43, 47, 83, 131, 137, 359, 431, 433, 449, 509, 569, 571

| n | digits of F_n |
|---:|---:|
| 3 | 1 |
| 4 | 1 |
| 5 | 1 |
| 7 | 2 |
| 11 | 2 |
| 13 | 3 |
| 17 | 4 |
| 23 | 5 |
| 29 | 6 |
| 43 | 9 |
| 47 | 10 |
| 83 | 17 |
| 131 | 28 |
| 137 | 29 |
| 359 | 75 |
| 431 | 90 |
| 433 | 91 |
| 449 | 94 |
| 509 | 107 |
| 569 | 119 |
| 571 | 119 |

## Part 2: the factor structure

For each of the **77** prime indices p ≤ 500 with F_p composite, the smallest prime factor q was found by trial division by every prime below 1,000,000 or, failing that, by a full PARI factorisation into proven primes. Trial division covers all primes, not only those ≡ ±1 (mod p), so the check does not assume the result it tests.

- Violations (q not ≡ ±1 mod p): **0**.
- q ≡ +1 (mod p): 28; q ≡ −1 (mod p): 49.

First 10 composite cases:

| p | digits of F_p | smallest prime factor q | q mod p | class |
|---:|---:|---:|---:|:---:|
| 19 | 4 | 37 | 18 | −1 |
| 31 | 7 | 557 | 30 | −1 |
| 37 | 8 | 73 | 36 | −1 |
| 41 | 9 | 2789 | 1 | +1 |
| 53 | 11 | 953 | 52 | −1 |
| 59 | 12 | 353 | 58 | −1 |
| 61 | 13 | 4513 | 60 | −1 |
| 67 | 14 | 269 | 1 | +1 |
| 71 | 15 | 6673 | 70 | −1 |
| 73 | 15 | 9375829 | 1 | +1 |

The first case is F_19, with q = 37 ≡ −1 (mod 19).

Composite cases with the largest smallest prime factor:

| p | digits of F_p | digits of q | q | class | how found | seconds |
|---:|---:|---:|---|:---:|---|---:|
| 467 | 98 | 38 | 73330281865487664068079924400662001093 | −1 | complete factorisation into proven primes (GMP-ECM) | 1732.03 |
| 397 | 83 | 36 | 135263838653434038307643992992133441 | +1 | complete factorisation into proven primes (GMP-ECM) | 200.09 |
| 277 | 58 | 27 | 505471005740691524853293621 | +1 | complete factorisation into proven primes (GMP-ECM) | 14.56 |
| 251 | 53 | 15 | 582416774750273 | −1 | complete factorisation into proven primes (GMP-ECM) | 0.18 |
| 271 | 57 | 15 | 449187076348273 | −1 | complete factorisation into proven primes (GMP-ECM) | 0.26 |

The full table is under `part2.rows` in the results file.

## Part 3: the gaps

| from | to | gap |
|---:|---:|---:|
| 3 | 4 | 1 |
| 4 | 5 | 1 |
| 5 | 7 | 2 |
| 7 | 11 | 4 |
| 11 | 13 | 2 |
| 13 | 17 | 4 |
| 17 | 23 | 6 |
| 23 | 29 | 6 |
| 29 | 43 | 14 |
| 43 | 47 | 4 |
| 47 | 83 | 36 |
| 83 | 131 | 48 |
| 131 | 137 | 6 |
| 137 | 359 | 222 |
| 359 | 431 | 72 |
| 431 | 433 | 2 |
| 433 | 449 | 16 |
| 449 | 509 | 60 |
| 509 | 569 | 60 |
| 569 | 571 | 2 |

- Largest gap in range: **222** (137 → 359).
- Fibonacci primes with index ≤ 2,000: **21**; with index ≤ 500: **18**.
  These counts include n = 4 (F_4 = 3).

## Reproduce

```
pip install cypari2 pytest
apt-get install gmp-ecm         # optional but much faster; PARI factor is the fallback
python run_fibprimes.py          # writes fibprimes_results.json
python make_fibprimes_report.py  # runs the tests, records pass counts, writes FIBPRIMES_REPORT.md
```
