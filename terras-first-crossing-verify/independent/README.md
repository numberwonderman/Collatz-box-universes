# Independent recomputation (Step 3)

Written from the definitions in the v2 paper (`packages/terras-first-crossing-note-r2.pdf`
in the clone). None of this imports, copies or paraphrases the repo's code. The repo's
verifier sources were not opened while this was written; only their printed output was read.
Standard library only. Every decision uses exact integer or `Fraction` arithmetic. Floats
appear only in one display-only ratio.

| file | what it does |
|---|---|
| `fcverify/core.py` | `T`, the first-crossing word, odd runs, `C_w` (eq. 1), `M_w` from the run formula (eq. 2), the word's residue class (Remark 2), `r(w)`, the class descent test, the Lemma 5 per-run inequalities, initial squares |
| `fcverify/bounds.py` | ln 2 and ln 3 enclosures from the series `Σ 1/(k·2^k)` and `Σ 1/(k·3^k)` (his verifier uses artanh instead), the continued fraction and convergents of log₂3, the Farey sandwich, the least-denominator fraction in the crossing interval, and Theorem 6's run argument for general `s` |
| `fcverify/scan.py` | the scan of odd `n ≤ N` (pointwise checks P1–P7 plus MAIN), the class-level check W1 on every distinct word met, and an exhaustive enumeration of every first-crossing word of length `≤ K` |
| `tests/` | pytest, including orbits worked by hand (n = 3, 5, 7, 59), brute-force cross-checks of the word↔class bijection and the enumeration, and a test that the descent test can actually fail (n = 1) |

```sh
cd independent
python3 -m pytest -q tests
python3 -m fcverify.scan --N 1000000 --K 37 --jobs 4 --json ../logs/scan_N1e6_K37.json
python3 -m fcverify.report_bounds > ../logs/bounds.log
```
