# Chapter 9 map: all 100 problems

This is a working index of Grechuk, *Landscape of 21st Century Mathematics* (2nd ed., 2026),
Chapter 9, "One Hundred Open Problems". It is written in my own words and does not quote the
chapter. For each problem it gives three things:
- **Book status:** a short summary of what the chapter says is known.
- **Later news:** anything I found that is newer than the book.
- **Compute:** whether a home computation gives real numbers to look at.
  - **D**: data is cheap, and published values exist to check it against.
  - **P**: only small cases are reachable, or the run needs serious tooling.
  - **—**: no meaningful computation is possible.

**How far the "later news" was checked:** I searched for news on only a handful of problems
(listed under "Checked after the book" below). An empty cell means **not checked**. It does
**not** mean "still open".

## Checked after the book (October 2026)

| # | What happened | Confidence |
|---|---|---|
| 9.74(a) | **Erdős's unit-distance conjecture was disproved.** It said the square grid is optimal up to n^{1+o(1)}. An OpenAI model found planar point sets with about n^{1+δ} unit distances; the δ ≈ 0.014 figure comes from secondary reports. It was announced in May 2026, with a companion paper at arXiv 2605.20695. The exact answer to 9.74(a) is still open, between n^{1.014} and the n^{4/3} upper bound. | Several independent reports, and checked by outside mathematicians |
| 9.56 | **Navier–Stokes:** OpenAI announced a claimed solution in September 2026, as a 166-page AI-drafted manuscript. | **Contested**; not settled |
| 9.49 | **Lonely runner:** the book says it is known for n ≤ 10. A September 2026 preprint targets 11–13 runners. | Preprint only |
| 9.7, 9.8, 9.72 | These are covered in `README.md`. No change was found for any of them. | |

## 9.1 Number theory

| # | Problem | Book status (paraphrased) | Compute |
|---|---|---|---|
| 9.1 | Schinzel's hypothesis H | Wide open. It contains twin primes and the Bunyakovsky and Landau cases. | P (count prime values of polynomials against Bateman–Horn predictions) |
| 9.2 | Cramér: lim inf / lim sup of G(X)/log²X | Far from settled; the conjectured value is 2e^{−γ} ≈ 1.1229 | **D** (maximal prime gaps) |
| 9.3 | Goldbach | Weak Goldbach is proved; even Goldbach is open | D (verification and the "comet"; learning only) |
| 9.4 | Infinitely many even perfect numbers / any odd one | Open. The even case is Mersenne primes | — (the GIMPS project owns this) |
| 9.5 | (Effective) abc | Open | **D** (high-quality abc triples) |
| 9.6 | Generalized Fermat / Beal equation | Wide open in general | P |
| 9.7 | Largest Diophantine D(n)-sets | M(1) = 4 and M(4) = 4 are proved. Dujella's set S is open except −1 and −4, where M = 3 was proved in 2022. Largest known set has 6 elements | **done** (see `README.md`) |
| 9.8 | Markoff unicity | Open | **done** (see `README.md`) |
| 9.9 | Hilbert's 10th problem over Q | Open. Only some degree and variable-count cases are settled | — |
| 9.10 | Perfect powers in linear recurrences | Known for Fibonacci and Lucas/Lehmer; contains the Skolem problem | P |
| 9.11 | Chowla conjecture | Open even for k = 2. The log-averaged k = 2 case is known | **D** (Liouville correlation sums) |
| 9.12 | Littlewood's conjecture | Open. Known for almost all pairs | **D** (inf n·‖nα‖·‖nβ‖ for √2, √3, …) |
| 9.13 | Wirsing–Schmidt | Best known is about 0.765n, against the conjectured n | — |
| 9.14 | Schanuel's conjecture | Open already for n = 2 (e and π) | — |
| 9.15 | Birch–Swinnerton-Dyer | Known for analytic rank 0 or 1 and for a positive proportion of curves | P (needs PARI/Sage) |
| 9.16 | Unbounded elliptic-curve rank? | Record is rank ≥ 29 (Elkies–Klagsbrun) | — |
| 9.17 | Integral points ≤ C·\|Δ\|^ε | Known for ε > 0.1117… | P |
| 9.18 | Artin's primitive root conjecture | No single a is proved to work. Heath-Brown: at most 2 prime exceptions | **D** (density vs Artin's constant) |
| 9.19 | Generalized Sato–Tate / Langlands | About as hard as completing the Langlands program | — |
| 9.20 | Are irrational algebraic numbers absolutely normal? | No algebraic irrational is known to be normal in any base | D (digit statistics; learning only) |
| 9.21 | Minkowski's conjecture | Known for n ≤ 10 | — |

## 9.2 Combinatorics

| # | Problem | Book status | Compute |
|---|---|---|---|
| 9.22 | Van der Waerden number growth | Hunter (2025) gives a lower bound; the upper bound is a tower | P (small W(r,k) are known exactly) |
| 9.23 | Algorithm for Ramsey families / partition regularity | Open even for {x, y, xy, x+y} and for x²+y²=z² | P |
| 9.24 | Unit fractions summing to 1 | Best is f(N) = (log N)^{4/5+o(1)} (Liu–Sawhney); the target is C·log log N | P |
| 9.25 | r_k(N), progression-free sets | Major recent progress for k = 3 | P (small exact values) |
| 9.26 | Density Hales–Jewett bounds | Upper bound is far from optimal | — |
| 9.27 | Sum-product, max(\|kA\|, \|A^k\|) | Open even for k = 2 | P |
| 9.28 | Distinct covering system with all moduli odd? | The lcm must be divisible by 2, 9 or 15 | P (hard search) |
| 9.29 | Hadwiger's conjecture | Known for t ≤ 6 | — |
| 9.30 | Chromatic number of R^d | Plane: 5 to 7. R³: 6 to 15 | P (SAT on unit-distance graphs) |
| 9.31 | Concentration of χ(G(n,p)) | Two-point concentration for p = d/n; wide open in general | P (simulation) |
| 9.32 | List colouring conjecture | Open | P |
| 9.33 | Graph reconstruction (Kelly–Ulam) | Open | **D** (verify by brute force for small n) |
| 9.34 | Which d-regular G maximizes hom(G,H)^{1/\|V\|} | Partial results | P |
| 9.35 | Ramsey numbers R(k,m), r(k,m) | Recent exponential improvements | P |
| 9.36 | Explicit Ramsey graphs | Partial | — |
| 9.37 | Erdős–Hajnal | Known for all H with ≤ 5 vertices | — |
| 9.38 | Tutte's 3-, 4- and 5-flow conjectures | Partial progress on 3-flow | P |
| 9.39 | Hypergraph removal lemma bounds | Open even for graphs | — |
| 9.40 | Minimum number of copies of H | g_r(n,e) known asymptotically; exact values open even for triangles | P |
| 9.41 | Connective constant of self-avoiding walks | Exact only for the honeycomb lattice (√(2+√2)) | **D** (square-lattice SAW counts, μ ≈ 2.638) |
| 9.42 | Meander asymptotics | Conjectured R² ≈ 12.26, α ≈ −3.42 | **D** (exact m(N) for small N) |
| 9.43 | Sunflower conjecture | f(w,r) ≤ (C·r·log w)^w | — |

## 9.3 Analysis

| # | Problem | Book status | Compute |
|---|---|---|---|
| 9.44 | **Collatz** | The book cites its Theorem 3.1 as the best progress | **D**: this repository's home turf |
| 9.45 | Strong Furstenberg intersection | Partial (dimension results) | — |
| 9.46 | MLC: is the Mandelbrot set locally connected? | Open | — |
| 9.47 | Convergence of polynomial ergodic averages | Many special cases known | — |
| 9.48 | Billiards in irrational polygons | Weak mixing exists for every n ≥ 3; whether any polygon is mixing is open | P (simulation) |
| 9.49 | Lonely runner | Known for n ≤ 10 (see the later-news table) | **D** (verify small speed sets) |
| 9.50 | Lehmer's conjecture (Mahler measure) | Known for odd-coefficient polynomials | **D** (search for small Mahler measures; Lehmer's 1.17628…) |
| 9.51 | Riemann Hypothesis | Open. Lagarias gives an elementary equivalent | **D** (check σ(n) < H_n + e^{H_n}·log H_n numerically) |
| 9.52 | Grothendieck constant K_G | 1.67696 ≤ K_G < 1.7822 | — |
| 9.53 | Common point of Fréchet differentiability | Known for some spaces | — |
| 9.54 | Finitely many relative equilibria (Smale 6)? | Settled for n = 4, and for n = 5 with generic masses | P |
| 9.55 | Hilbert's 16th problem, second part | Not even known whether H(2) is finite; H(2) ≥ 4 | — |
| 9.56 | Navier–Stokes | Millennium problem (see the later-news table) | — |
| 9.57 | Hearing the shape of a drum | Settled for nearly circular ellipses | — |
| 9.58 | Hot spots conjecture (simply connected domains) | Known for triangles and for some Lipschitz domains | P (FEM) |
| 9.59 | Pólya's conjectures on eigenvalues | Known for disks and balls; Neumann case for n = 2 | P |
| 9.60 | Kakeya conjecture dimension f(n) | f(3) = 3 is now proved; open for n ≥ 4 | — |
| 9.61 | Square peg problem | Known for smooth curves | — |
| 9.62 | Falconer distance set problem | c(2) ≤ 5/4; open in general | — |

## 9.4 Algebra

| # | Problem | Book status | Compute |
|---|---|---|---|
| 9.63 | Possible growth functions of groups | Settled for semigroups | — |
| 9.64 | Babai's diameter conjecture | Known for some families; alternating groups partial | P (diameters of small groups) |
| 9.65 | Profinite rigidity | Partial | — |
| 9.66 | Structure of sets with small doubling | Partial | — |
| 9.67 | Zero-divisor and idempotent conjectures | The unit conjecture was disproved; these two remain open | P |
| 9.68 | Counting number fields N_n(X) | Linear growth is known for n ≤ 5 | P (tables exist) |
| 9.69 | Inverse Galois problem | Open | — |

## 9.5 Geometry and topology

| # | Problem | Book status | Compute |
|---|---|---|---|
| 9.70 | Sphere packing density δ*(B_d) | Known for d = 3, 8 and 24 | P |
| 9.71 | Kissing numbers | d = 4 is settled; the rest are bounds | P |
| 9.72 | Apollonian curvatures | The local-global conjecture is disproved | **done** (see `README.md`) |
| 9.73 | Happy ending: is ES(n) = 2^{n−2}+1? | Lower bound proved; near-matching upper bound | P (ES(6) = 17 was settled by SAT) |
| 9.74 | Unit distances / distinct distances | (b) is nearly solved in the plane. For (a), see the later-news table | P |
| 9.75 | Equiangular lines N(d) | Large-d progress for a fixed angle | P |
| 9.76 | Kelvin's problem | p*(2) settled (hexagons); p*(3) open | — |
| 9.77 | Optimal multi-bubbles | Several (n, d) cases known; (4, 3) is open | — |
| 9.78 | log-Brunn–Minkowski | Known for d = 2 | — |
| 9.79 | Duality for entropy numbers | Known when one body is a ball | — |
| 9.80 | Banach's isometric subspace problem | Resolved for n = 3 (2023); n = 133 and n = 4k+3 were the gaps before that | — |
| 9.81 | Rationality of hypersurfaces | Many cases are settled; (3, 5) is open | — |
| 9.82 | Speed of knot equivalence | Lackenby announced quasi-polynomial unknotting, unpublished | P |
| 9.83 | Algorithm for unknotting number | Hard even for small knots | P |
| 9.84 | Algorithm for sliceness | The Conway knot and one other are done | — |
| 9.85 | Embedded minimal surfaces (g, r) | r ≤ 2 understood; Hoffman–Meeks conjecture open | — |
| 9.86 | Minimal surfaces of genus g in S³ | N(1) = 1 | — |
| 9.87 | Smooth 4-dimensional Poincaré | Open | — |

## 9.6 Probability

| # | Problem | Book status | Compute |
|---|---|---|---|
| 9.88 | Self-avoiding walk end-to-end distance, Cn^{3/4}? | Predicted by physics, unproved | **D** (exact enumeration or pivot algorithm) |
| 9.89 | Bernoulli convolutions | Dimension case settled for transcendental λ | P |
| 9.90 | Critical percolation on Z^d | Known for d ≥ 11; 3 ≤ d ≤ 10 open | P (simulation) |
| 9.91 | p_c < p_u (Benjamini–Schramm) | Partial | — |

## 9.7 Algorithms and complexity

| # | Problem | Book status | Compute |
|---|---|---|---|
| 9.92 | P vs NP | Open | — |
| 9.93 | One-way functions | Open | — |
| 9.94 | P vs BPP | Strong evidence for equality | — |
| 9.95 | Unique Games Conjecture | Partial progress (Theorem 7.28) | — |
| 9.96 | 3-SUM and APSP hypotheses | Open | — |
| 9.97 | Graph isomorphism in P? | Fastest known algorithm is Theorem 7.3 (Babai's quasi-polynomial one) | — |
| 9.98 | Strongly polynomial LP (Smale 9) | Open | — |
| 9.99 | Matrix multiplication exponent | Steady small improvements | — |
| 9.100 | Factoring | Number field sieve; Shor's algorithm on a quantum computer | — |

---

# Next starter prompts

These are in the same spirit as the first three prompts. They ask for data, not proofs.

## Prompt 4: Maximal prime gaps (Problem 9.2)

Sieve primes up to 10¹⁰ with a segmented sieve, or as far as runs in reasonable time.
1. Record every maximal gap: a gap larger than all earlier gaps.
2. For each one, report the gap g, the prime p where it starts, and the ratio g / log²p.
3. Compare the list with the published table of maximal prime gaps (OEIS A002386 / A005250).
4. Plot the ratio against log p, with a reference line at 2e^{−γ} ≈ 1.1229. Report the largest
   ratio found.

## Prompt 5: Lagarias's RH criterion (Problem 9.51)

1. For every n up to 10⁸, check σ(n) < H_n + exp(H_n)·log(H_n). Use exact rational or
   high-precision arithmetic for n ≤ 10⁴, then floats with error bounds.
2. Report the n with the smallest margin, both the absolute gap and the ratio.
3. Report the record-setters, which should be colossally abundant numbers.
4. Check those record-setters against OEIS A004490.

## Prompt 6: Self-avoiding walks on Z² (Problems 9.41 and 9.88)

1. Count self-avoiding walks on the square lattice exactly for n = 1..20 or more (OEIS A001411).
2. Estimate the connective constant μ from ratios c_{n+1}/c_n and from c_n^{1/n}, and compare
   with μ ≈ 2.63816.
3. From the same enumeration, compute the mean squared end-to-end distance. Fit its exponent
   and compare with the predicted 2ν = 3/2.
4. Report how the estimates converge as n grows.

## Prompt 7: Meanders (Problem 9.42)

1. Compute the meander numbers m(N) exactly for N up to about 14 by brute force or transfer
   matrix. Check them against OEIS A005315.
2. Fit ratios m(N+1)/m(N) to estimate R², and compare with the conjectured ≈ 12.26.
3. Report how far the small-N data is from the predicted exponent α ≈ −3.42.

## Prompt 8: Small Mahler measures (Problem 9.50)

1. Enumerate reciprocal integer polynomials of degree ≤ 14 or so, with coefficients in {−1, 0, 1}.
2. Compute their Mahler measures and list every one with 1 < M(P) < 1.3.
3. Confirm that Lehmer's polynomial (degree 10, M ≈ 1.17628) is the smallest found.
4. Compare with Mossinghoff's published list of small Salem numbers.

**Collatz (9.44) note:** this repository is itself a Collatz project. The book's Theorem 3.1,
which it calls the best progress to date, is the reference to put next to the box-universe work.
