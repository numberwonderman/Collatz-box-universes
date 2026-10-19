# Grechuk Ch. 9 reconnaissance

These are data runs on three of the quieter problems in Grechuk, *Landscape of 21st Century
Mathematics* (2nd ed.), Chapter 9. They give counts, lists and checks of known results. Nothing
here is a proof.

Re-run everything with `python3 markoff_unicity.py`, `python3 dn_sets.py` and `python3 apollonian.py`.
It takes about 10 seconds and needs only Python 3 and gcc.

## Status check (October 2026)

| Problem | Status found |
|---|---|
| 9.8 Markoff unicity | Still open. It is proved for Markoff numbers that are prime powers or twice prime powers (Baragar, Button, Schmutz; Lang–Tan; Zhang). |
| 9.7 D(n)-sets | No D(n)-quadruple exists when n ≡ 2 (mod 4). For n = 1 there is no quintuple (He–Togbé–Ziegler 2019), and the same holds for n = 4 (Bliznac Trebješanin–Filipin 2019). Every other n ≢ 2 (mod 4) has a known quadruple except n ∈ {−4, −3, −1, 3, 5, 8, 12, 20}, where existence is open. The best general bound is M(n) ≤ (2+o(1)) log\|n\| (Yip 2025). |
| 9.72 Apollonian curvatures | The local-global conjecture is **false** in general. Haag, Kertzer, Rickards and Stange (Annals 2024) found quadratic and quartic reciprocity obstructions, and a revised conjecture replaces it. |

## 1. Markoff unicity (`markoff_unicity.py` → `markoff_counts.csv`)

**Correction to the draft prompt:** the Vieta move for x²+y²+z² = 3xyz is
(x, y, z) → (x, y, **3**xy − z). The move xy − z belongs to the x²+y²+z² = xyz form, whose
tree starts at (3,3,3). Starting from (1,1,1), that move gives 0 on the first step.

With the bound 10⁶:
- (a) The search checked **40** distinct Markoff numbers.
- (b) **Every one of them had exactly one triple.**
- (c) The largest is **925765**, from the triple (34, 9077, 925765).

The list matches OEIS A002559. The check costs almost nothing, so you can pass a larger bound.
`python3 markoff_unicity.py 1000000000000000000000000000000` checks 893 Markoff numbers up to
10³⁰ in under a second, and all are unique. Running it this way overwrites the CSV.

## 2. D(n)-sets (`dn_sets.py`, `dn_sets.c` → `dn_summary.csv`, `dn_sets_found.csv`)

**Grechuk's sextuple {99, 315, 9920, 32768, 44460, 19534284} is a D(2985984)-set.** All 15
products plus n are perfect squares. Note that 2985984 = 12⁶. The full working is in `dn_report.txt`.

**Search:** the search covered n = 1..64 with n ≢ 2 (mod 4), which is 48 values. It found
every pair a < b ≤ 10⁵ with ab + n a square by sieving k² − n. It then listed all 4- and
5-cliques of that graph.
- The search is **exhaustive inside the box**, so the bound was never hit partway through.
- "None found" therefore means only "none with all elements ≤ 10⁵". Each such result is
  marked **inconclusive** in the summary. The exception is size 5 for n = 1 and n = 4, where
  a theorem rules quintuples out.
- The C code was checked against a brute-force search for 18 values of n with N = 400. It
  also recovers the two known D(256) quintuples {1,33,105,320,18240} and {5,21,64,285,6720}.

**Results:**
- **Size 4:** quadruples were found for every n except **3, 5, 8, 12 and 20**. Those five
  are inconclusive, and they are exactly the n for which existence is open in the literature.
- **Size 5:** no quintuple was found for any n ≤ 64. For n = 1 and n = 4 this agrees with the
  theorems. For the other n it is inconclusive.
- The number of quadruples per n ranges from 1 to 449. All of them are in `dn_sets_found.csv`.

## 3. Apollonian curvatures (`apollonian.py` → `apollonian_curvatures.txt`, `apollonian_missing_1_500.txt`)

The root is (−1, 2, 2, 3). The script walks the Apollonian tree with Descartes reflections
c → 2(a+b+d) − c and keeps every circle with curvature ≤ 10⁵.

| cutoff | circles | distinct curvatures |
|---|---|---|
| 10² | 169 | 34 |
| 10³ | 3 329 | 325 |
| 10⁴ | 67 167 | 3 300 |
| 10⁵ | 1 359 171 | 33 274 |

**Sanity check:** circle counts grow by about 10^1.305 per decade. That matches the packing's
Hausdorff dimension δ ≈ 1.30568, as expected from Kontorovich–Oh.

The positive curvatures fall in the residue classes **{2, 3, 6, 11, 14, 15, 18, 23} mod 24**,
which is the expected set of 8 classes.
- **340 integers in 1..500 do not occur.** Of these, 333 are explained by the mod-24 classes.
- **7 sit in an admissible class but are still missing:** 78, 159, 207, 243, 246, 342 and 435.
- Up to 10⁵ there are **61** admissible-class integers that are missing. They thin out quickly,
  and the largest is **97287**.

Up to 10⁵ there is no sign of an infinite family, such as squares, among the missing numbers.
I have not checked whether Haag, Kertzer, Rickards and Stange list (−1, 2, 2, 3) as an
obstructed packing. Read their tables before drawing a conclusion. I recall 97287 being reported as the largest
exception for this packing in earlier, much larger computations, but that should be checked
against Fuchs–Sanden or HKRS before relying on it.
