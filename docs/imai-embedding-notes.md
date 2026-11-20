# Imai dyadic circular embedding: extracted definitions and implementation notes

Source: Yusuke Imai, *Geometric Extensions of Dyadic Circular Embeddings to the
Integers* (2026), HAL Id hal-05858260, version 1, deposited 9 Nov 2026, CC BY 4.0.
<https://hal.science/hal-05858260v1>. Local copy: `docs/imai-2026-dyadic-circular-embeddings.pdf`.

Page numbers below are the paper's printed page numbers. The PDF has a HAL cover
sheet, so PDF page = printed page + 1.

Implementation: `js/imaiDyadicCircle.js` (logic), `dyadic-circle-imai.html` (view),
`js/tests/imaiDyadicCircle.test.js` (tests).

---

## 1. The dyadic circular embedding (Section 2, pp. 2–3)

> For a positive integer n, let
> (2.1) k(n) = ⌊log₂ n⌋.
> The angular coordinate is defined as
> (2.2) θ(n) = π (n − 2^{k(n)}) / 2^{k(n)}.

> The corresponding point on the unit circle is
> (2.4) P(n) = (cos θ(n), sin θ(n)).

Its relation to the original natural-number (Aberkane-style) representation:

> (2.6) θ_nat(n) = 2π (n − 2^{k(n)}) / 2^{k(n)}, 2^{k(n)} ≤ n < 2^{k(n)+1}.
> For every positive integer n, Eq. (2.2) is exactly half of Eq. (2.6):
> (2.7) θ(n) = ½ θ_nat(n).

Stated consequences (p. 3):

> (2.8) θ(2n) = θ(n). Consequently, the circular position of a positive integer is determined by its odd part.
> For 2^k ≤ n < 2^{k+1}, we have (2.9) θ(2^k + n) = ½ θ(n).

So every positive integer lies on the upper half circle, θ ∈ [0, π). Powers of two
sit at θ = 0.

## 2. Signed extension: the antipodal rule (Section 2, p. 2)

> For negative integers, we introduce an antipodal shift:
> (2.3) θ(−n) = θ(n) + π, n > 0.
> This construction assigns each negative integer to the antipodal position of its
> positive counterpart. Consequently, (2.5) P(−n) = −P(n).

Negative integers therefore lie on the lower half circle. The integer 0 is never
embedded. The paper works on ℤ \ {0} throughout.

## 3. The maps and the drawing rule (Sections 1 and 3, pp. 2, 4)

> (1.2) T_m(n) = n/2 if n ≡ 0 (mod 2); m n if n ≡ 1 (mod 2), where m is an odd positive integer.
> This family isolates the multiplicative operation by an odd integer from the
> additive term in the standard Collatz map.

**The odd step has no additive term.** The paper says so explicitly (p. 4):

> The case m = 3 is directly related to the multiplicative component of the standard
> Collatz map. However, the map considered here does not include the additive term +1
> in the odd branch. It should therefore be regarded as a related integer
> transformation rather than the standard Collatz map itself.

Drawing rule (p. 4):

> For each nonzero integer n, we connect the point P(n) to P(T_m(n)). The geometric
> representation of the map is therefore given by the collection of line segments
> (3.1) 𝓛_m = {[P(n), P(T_m(n))] : n ∈ ℤ \ {0}}.
> Since m is odd, the map satisfies (3.2) T_m(−n) = −T_m(n). Together with the
> antipodal embedding, this implies (3.3) P(T_m(−n)) = −P(T_m(n)).

Fig. 2 (p. 5) shows 𝓛_m for m = 3, 5, 7, …, 19, with positive and negative integers
in different colours (blue and red).

Section 4 (pp. 4–6) adds a second drawing: the circle–number-line correspondence.

> (4.1) Q(n) = (n, 0) … (4.2) P_R(n) = R (cos θ(n), sin θ(n)) … (4.3) 𝒮_R(n) = [P_R(n), Q(n)].

Each circular point is joined to its integer on the real axis. Segments are coloured
by dyadic interval 2^k ≤ |n| < 2^{k+1}. A Gaussian density (4.4)
G_N(x, y) = Σ_{−N≤n≤N, n≠0} exp[−d_n(x, y)² / (2ε²)] is computed with R = N.

## 4. The continuous scaling parameter (Section 6, pp. 7–10)

> (6.3) θ_α(n) = α θ_nat(n) … (6.4) P_α(n) = (cos θ_α(n), sin θ_α(n)) …
> (6.6) 𝒞_α(n) = [P_nat(n), P_α(n)].
> (6.7) α = 1 ⇒ θ_α(n) = θ_nat(n), (6.8) α = ½ ⇒ θ_α(n) = ½ θ_nat(n).
> Thus, the latter case reproduces the angular positions of positive odd integers in
> the signed-integer embedding introduced in Section 2.

Signed version (p. 9):

> (6.9) θ_α(n) = α θ_nat(|n|) for n > 0; α θ_nat(|n|) + π for n < 0.
> (6.10) P_{α,R}(n) = R (cos θ_α(n), sin θ_α(n)) … (6.12) 𝒮_{α,R}(n) = [P_{α,R}(n), Q(n)].

**Recovering the signed embedding.** At α = ½, (6.9) is exactly (2.2) together with
(2.3). This is tested for every 1 ≤ |n| ≤ 1024. Fig. 5 uses positive odd n and
α = 0.1, …, 1.0. Fig. 6 uses −1023 ≤ n ≤ 1023 with R = 1023.

## 5. Worked examples and figures used as test fixtures

The paper has no numerical worked examples. Its concrete data are the labelled
points in Fig. 1 (p. 3) and the stated identities. The fixtures in
`js/tests/imaiDyadicCircle.test.js` are:

| Fixture | Source | Values |
|---|---|---|
| k(n) | (2.1), p. 2 | k(1)=0, k(3)=1, k(7)=2, k(1024)=10, … |
| Signed positions, positive odd 1–15 | Fig. 1(b), p. 3 | 1→0, 3→π/2, 5→π/4, 7→3π/4, 9→π/8, 11→3π/8, 13→5π/8, 15→7π/8 |
| Signed positions, negative odd −1 to −15 | Fig. 1(b), p. 3 | −1→π, −3→3π/2, −5→5π/4, −7→7π/4, −9→9π/8, −11→11π/8, −13→13π/8, −15→15π/8 |
| Natural positions, odd 1–31 | Fig. 1(a), p. 3; (2.6) | 1→0, 3→π, 5→π/2, 7→3π/2, 17→π/8, 31→15π/8, … |
| θ = θ_nat / 2 | (2.7), p. 3 | n = 1…2048 |
| θ(2n) = θ(n) | (2.8), p. 3 | n = 1…2048 |
| θ(2^k + n) = θ(n)/2 | (2.9), p. 3 | k = 0…10, every n in the interval |
| α = ½ / α = 1 special cases | (6.7)–(6.9), pp. 8–9 | 1 ≤ \|n\| ≤ 1024 |
| T_m odd, central symmetry | (3.2), (3.3), p. 4 | m = 3…19, n ≤ 300; chord set at N = 255 |

The Fig. 1 angles were read off the figure. The figure is consistent with (2.2) and
(2.6) at every labelled point. The figure's arrows were **not** used as fixtures,
because the text does not say which map they depict.

---

## Ambiguities and the readings implemented

1. **Odd-step rule versus the requested 3n+1 tests.** The paper's map is T_m(n) = m n
   on odd n, with no +1 (eq. 1.2, p. 4). The 3n+1 negative cycles requested for
   testing (−1, −5, −17) do not exist for T_3: T_3 with c = 0 has no nonzero cycle,
   which is also tested. *Implemented:* the odd step is m n + c. The default is c = 0,
   the paper's map. c = 1 (the "Collatz 3n+1 preset") gives the standard map, and the
   cycle tests use m = 3, c = 1. With c ≠ 0, the symmetries (3.2)–(3.3) no longer hold.
2. **Which chords are drawn.** (3.1) ranges over all nonzero n and places no limit on
   T(n). The task spec asked for chords whose image is in the displayed range.
   *Implemented:* "only chords with |T(n)| ≤ N" is on by default, per the spec. It can
   be switched off, and the "Paper T₃ preset" switches it off. **Fig. 2 is reproduced
   only with it off.** With the filter on, m = 15 and m = 17 shrink to a few chords,
   while the paper shows full bands (see `docs/imai-Tm-chords-m3-to-m19.png`, rendered
   with the filter off at N = 1023).
3. **Range of Fig. 2.** The paper does not state N for Fig. 2. The pattern shapes are
   essentially independent of N once N is a few hundred. N = 1023 was used.
4. **Even steps.** By (2.8), θ(n/2) = θ(n), so every even-step chord has zero length.
   This holds for every α, since θ_nat is also invariant under doubling. Fig. 2
   therefore shows only odd-step chords. The implementation keeps even chords but marks
   them `degenerate` and does not draw them.
5. **Circle radius in Section 4.** R = N is stated only for the density maps (p. 5).
   For Figs. 3(a), 3(b) and 4, the number line visibly spans the diameter, so R = N was
   used everywhere. This choice affects exact self-similarity (see observations below).
6. **Fig. 4 caption.** It says "Only the upper half-plane is shown", but the figure
   shows both halves. Both halves are drawn.
7. **Density map ε.** The Gaussian width ε in (4.4) is not given, and the density maps
   of Fig. 3(c) were **not** implemented. Only line-segment overlap is shown, with
   additive transparency.
8. **α = 1 is not injective across signs.** At α = 1, positive integers already fill
   the whole circle, so −n + π collides with positive points. For example,
   P₁(−1) = P₁(3) = (−1, 0). Among odd |n| ≤ 255 there are 120 such (−odd, +odd)
   coincidences. The paper's description "antipodal placement of negative integers"
   at α = 1 is accurate, but the embedding then no longer separates the signs. This
   is reported as an observation, not changed.
9. **The scaling control.** α fits the existing control pattern as a single slider,
   so it is exposed (0 to 1, default ½). It applies to all three drawing modes:
   chords, number line and scaling segments.

---

## Findings at two dyadic scales (observations, not proofs)

Nothing below is a pass/fail test. These are visual and numerical observations from
renders of this implementation.

**Fig. 2 (T_m chords, m = 3…19).** With the image filter off at N = 1023, every one
of the nine panels matches the paper's figure in its band shapes, crossing points
and the thick rims for m = 7, 9 and 13
(`docs/imai-Tm-chords-m3-to-m19.png`). m = 15 and 17 give the thin crossing bands
the paper shows, and m = 11 gives the single wide lens.

**Fig. 4 (N = 15 versus N = 31, circle–number-line correspondence).** See
`docs/imai-number-line-N15-vs-N31.png`.

- At N = 15, the segment for 3, from the top of the circle to (3, 0), stands alone.
  Segments from 5–7 and 9–15 form fan or bell shapes that open toward their own
  stretch of the axis. This agrees with the paper's description.
- At N = 31, the angular structure is preserved exactly. The segment for 2n at N = 31
  has the same angle as the segment for n at N = 15 (difference about 4×10⁻¹⁵ after
  scaling). New odd integers add segments between the old ones, and new cusp-like
  bells appear near the right end of the upper axis and the left end of the lower
  axis. This agrees with the refinement rule of Section 5 (p. 7: "the original
  integers are mapped to even integers, while odd integers are inserted between
  them").
- **The rescaling is only approximate with R = N.** Scaling the N = 15 picture by
  31/15 does not land the line endpoints exactly on the N = 31 endpoints. Q(2n) = 2n,
  while (31/15)·n differs from it by up to 1 unit, about 3% of R. With R = 2^j
  (R = 16 → 32), the old configuration is reproduced exactly (maximum gap 0). The
  paper's "original segments are retained under scaling" is exact only for
  power-of-two radii. Under R = N it holds to within one unit on the axis.
- The counting statement (5.1)–(5.4), M_j = 2^j − 1 segments for
  I_j = {2^j+1, …, 2^{j+1}−1}, excludes the power of two 2^j itself. Its segment runs
  along the axis from (R, 0) to (2^j, 0), so it is invisible. The count is consistent
  with what is drawn.

**Fig. 3 (high-density patterns).** At N = 1023 with additive transparency,
segment overlap concentrates near the axis in the right half of the upper
half-plane, and point-symmetrically in the left half of the lower half-plane. This
matches the dark regions of Fig. 3(b). A quantitative comparison with the density
maps of Fig. 3(c) was not attempted (see ambiguity 7).

**Fig. 5 (angular scaling).** At α = 0.3, the segments C_α(n) form a fan converging
to a cusp inside the upper half of the disc, with a crescent toward the right rim.
This is qualitatively like the paper's α = 0.3 panel. At α = 1, all segments
collapse to points (this is tested).

**Collatz 3n+1 on negatives (c = 1, not in the paper).** At N = 511 the view finds
exactly four cycles inside the range: 1→4→2, −1→−2, the 5-cycle through −5, and the
18-cycle through −17 (`docs/imai-dyadic-circle-collatz-N511.png`). Under the
embedding, each even element shares its point with its odd part. The 18-cycle
therefore visits only 7 distinct circle points, one per odd element (−17, −25, −37,
−55, −41, −61, −91). The 5-cycle visits 2 points (−5 and −7), and the 2-cycle visits
1 (the point θ = π). The loop is closed, but on the circle the 2-cycle is a single
point.

---

## Fractal probe (Nov 2026)

**Status: exploratory.** These are pictures and one rough measurement, made in
response to Yusuke Imai's question: "Do you think that generalized Collatz maps
represented on the dyadic circle could generate interesting fractal structures?"
Nothing here is a proof.

- Code: `js/imaiFractalProbe.js` (pure functions, tested in
  `js/tests/imaiFractalProbe.test.js`), the "Fractal probe" mode of
  `dyadic-circle-imai.html`, and `scripts/imai-fractal-probe.mjs`.
- Outputs: `docs/fractal-probe/`. Every number below is in
  `docs/fractal-probe/probe-numbers.json`.
- To regenerate, run `node scripts/imai-fractal-probe.mjs` from the repo root
  (about 22 s).

All renders use the map chords [P(n), P(T(n))] for **every** n with 1 ≤ |n| ≤ N, as in
eq. (3.1) and Fig. 2. There is no |T(n)| ≤ N filter. Even-step chords have zero length
and are left out. Images are 1024 × 1024 and cover [−1.05, 1.05]².

### What was rendered

**1. Density.** Files: `density-m3-c{0,1}-N{1023,4095,16383}.png`.

- These use the kernel of eq. (4.4), G = Σ exp(−d²/2ε²). The paper applies that
  kernel to the circle–number-line segments S_R(n). **Here it is applied to the map
  chords**, which is a deliberate change.
- ε = 4/N in unit-circle units. That is the paper's R = N with a fixed ε = 4, so the
  renders are comparable across scales. Each map (c = 0, c = 1) uses one shared
  log(1 + G) colour scale across its three N.
- At 1024 px, ε falls below half a pixel for N ≥ 4095 (0.48 px and 0.12 px). There the
  code switches to the pixel average of the same Gaussian line (chord length per pixel
  × √(2π)ε). A point-sampled Gaussian would alias at that size. Both modes integrate to
  the same total, which is tested. So in practice the N = 4095 and N = 16383 images are
  line-length densities.
- **The renders were done in a Node script, not the browser.** N = 16383 also works in
  the browser view (under 1 s at 512 px).

**2. Self-similarity.** Files: `selfsim-m3-c{0,1}-N4095.png`. There are four panels:

- (a) the full chord set for N = 2¹² − 1;
- (b) the chords from the top block 2¹¹ ≤ |n| < 2¹² only, with θ → 2θ;
- (c) (a) in grey with (b) overlaid in orange;
- (d) (a) with the top block overlaid **without** doubling.

Comparison on log line density at 1024 px (IoU = intersection over union of the masks
at 0.5):

| map | full vs top block, θ doubled | full vs top block, θ unchanged | top block vs block below, θ unchanged |
|---|---|---|---|
| c = 0 | corr 0.006, IoU 0.000 | corr 0.997, IoU 0.976 | corr 0.967, IoU 0.921 |
| c = 1 | corr 0.007, IoU 0.000 | corr 0.989, IoU 0.813 | corr 0.966, IoU 0.835 |

**The doubled overlay does not match at all. The undoubled one matches almost
exactly.** The reason is exact, not a numerical accident:

- Write n = 2^k(1 + x) with x ∈ [0, 1). Then θ(n) = πx.
- 3n = 2^k · 3(1 + x) with 3(1 + x) ∈ [3, 6). So θ(3n) = g(x), where
  g(x) = π(3(1 + x)/2 − 1) for x < 1/3 and π(3(1 + x)/4 − 1) otherwise.
- That is the same function in every block (tested for all odd n ≤ 4095).

So every block draws the **same one-parameter family of chords**, x ↦ [P(πx), P(g(x))],
sampled on a grid twice as fine as the block below. The relation (2.9),
θ(2^k + n) = θ(n)/2, is true, but it maps block k onto the *lower half* of block k + 1.
It does not map block k onto the whole picture, so doubling angles throws the top block
off the full set. For c = 1, the +1 moves each image by at most π/2^k. The exceptions are
n = 5, 21, 85, 341, 1365 (3n + 1 a power of two), whose image jumps to θ = 0 (tested).

**Block crossings** (N = 4095, both c = 0 and c = 1): every chord leaves its dyadic
block, for every k from 0 to 11. The counts are 2·2^k chords out of 2·2^k in each block,
half of them odd steps. That is forced by the map, since an odd step 3n (+1) climbs one
or two blocks and an even step n/2 drops one. So block crossing does not explain the
failed doubled overlay; the sampling argument above does.

**3. Colour probes** (N = 4095, m = 3, c = 1).

`colour-block-m3-c1-N4095.png` colours chords by the dyadic block of n:

- All blocks lie on the same curves, so the hues mix everywhere.
- The top block (half of all chords) dominates.
- No block owns a region of its own.

`colour-fate-m3-c1-N4095.png` colours chords by where n ends up within 500 steps:

- Colours: 1-cycle blue, −1 green, −5 amber, −17 red.
- Every n with |n| ≤ 4095 settles within 500 steps.
- All 4095 positive n reach 1.
- Negative n split as follows: −1: 1350, −5: 1313, −17: 1432.
- The lower half shows a mixed, roughly even blend of the three negative colours, with
  no arcs or bands of a single fate.

A check at N = 16383 (odd negatives only, run in a one-off script, not saved):

- Neighbouring odd n and n − 2 share a fate 43% of the time, against 33% if fates were
  independent.
- Sorting the top block by angle instead gives 44%.
- Each of eight equal angle bins splits about ⅓ / ⅓ / ⅓, within ±0.05.

So fate is slightly correlated between neighbours, but it is not organized by position
on the circle.

**4. Box counting (exploratory).** The headline number comes from:

- the N = 16383 density render for m = 3, c = 0;
- normalised as log(1 + G) / log(1 + max G);
- **thresholded at 0.5**: pixels at or above half the maximum log-density are set. The
  mask is `boxcount-mask-m3-c0-N16383-t0.5.png`, 6.5% of pixels.
- boxes of 2, 4, 8, 16, 32, 64 and 128 px on the 1024 px grid.

| N | c | threshold | pixels set | slope (box dimension) | R² | local slopes, small → large boxes |
|---|---|---|---|---|---|---|
| 16383 | 0 | 0.3 | 31.6% | 1.80 | 0.999 | 1.95 1.91 1.84 1.79 1.70 1.55 |
| **16383** | **0** | **0.5** | **6.5%** | **1.54** | **0.995** | 1.86 1.75 1.55 1.43 1.43 1.22 |
| 16383 | 0 | 0.7 | 1.0% | 1.17 | 0.997 | 1.46 1.27 1.13 1.00 1.05 1.30 |
| 4095 | 0 | 0.5 | 6.4% | 1.53 | 0.995 | |
| 1023 | 0 | 0.5 | 15.9% | 1.69 | 0.997 | |
| 16383 | 1 | 0.5 | 6.7% | 1.53 | 0.995 | |

**Caveats.**

- **The number depends heavily on the threshold:** 1.80, 1.54 and 1.17 at thresholds
  0.3, 0.5 and 0.7.
- The local slopes drift steadily with box size instead of settling. So the high R² is
  misleading: there is no single power law here.
- The mask is thick bands (dimension 2 at small boxes) bent along curves (dimension 1 at
  large boxes). A fit over a range that mixes the two will report something in between.
  That is what a smooth density with sharp edges looks like, not a fractal.
- Between N = 4095 and N = 16383 the numbers barely move (1.53 vs 1.54). That is
  consistent with the picture having converged.
- The box-counting code itself is tested on a filled square (2), lines (1), a point (0)
  and a Sierpiński carpet (1.893, exact).

### Did anything visibly self-similar or fractal-like show up, and where?

**Self-similar, yes, but in a simple way. Fractal, no, not in these renders.**

- The chord pictures are self-similar across dyadic scales in the sense the
  computation predicts. Every block draws the same continuous family of chords
  [P(πx), P(g(x))], just sampled more finely. The top block alone reproduces the full
  picture (correlation 0.997), and adding blocks only fills it in.
- That limit is a smooth line density whose bright curves are envelopes (caustics) of
  a piecewise-linear chord family. It has no detail at every scale. The density renders
  at N = 1023, 4095 and 16383 look the same apart from sharpness.
- The box-counting slope (about 1.5 at threshold 0.5) depends on the threshold and is
  not a stable power law. It reflects bands and curves, not a fractal.
- For the paper's T_m (c = 0) this is structural. Because θ(3n) depends only on the
  dyadic position x, an odd multiplier just reparametrises one circle map. The paper's
  maps are a sampling of a single smooth chord diagram.
- The +1 of the Collatz map (c = 1) breaks this only by O(2^−k) shifts. It adds visible
  hatching at small N that fades as N grows. The jumps where 3n + 1 is a power of two
  (n = 5, 21, 85, …) are one chord per dyadic block, a set too sparse to show.
- The one place that could plausibly hold fractal structure is **dynamics, not
  single-step geometry**: which cycle a negative n eventually falls into under 3n+1.
  Those fates are finely interleaved around the circle, with no arcs or regions at this
  resolution. Their boundary in the 2-adic or dyadic-position sense is the natural next
  thing to probe, for example by colouring each x ∈ [0, 1) by the fate of 2^k(1 + x)
  for a large k and measuring how that colouring refines as k grows. That would ask
  whether the basin partition converges to something with a fractal boundary. These
  renders do not answer it.
- Answer to Imai's question, as far as this probe goes: the one-step chord diagrams
  are not fractal. Fate colourings over many steps might be, and are the better
  candidate.
