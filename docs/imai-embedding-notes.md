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

---

## Other geometries (Nov 2026)

Imai asked whether the dyadic circular embedding could be generalised to other
geometries. This section builds two:

- a **cylinder**, which keeps the dyadic block visible as height;
- a **sphere**, where the antipodal rule is a symmetry of the space itself.

Where the code lives:

- Module: `js/imaiGeometries.js` (tests: `js/tests/imaiGeometries.test.js`).
- Browser: the **Cylinder** and **Sphere** modes of `dyadic-circle-imai.html`.
- Renders: `scripts/imai-geometries.mjs` writes to `docs/geometries/`, about 7 s.
  Chords are rasterised in Node; headless Chromium only adds titles, axes and
  legends.
- Every count quoted below is in `docs/geometries/geometry-numbers.json`.

θ(n), k(n) and T(n) = n/2 | mn + c are reused from `js/imaiDyadicCircle.js`. m = 3
throughout.

### Definitions

**Cylinder.**

- Placement: C(n) = (cos θ(n), h(n), sin θ(n)), with h(n) = sign(n) · k(|n|). The
  unit circle lies in the XZ plane and y is vertical.
- Chords [C(n), C(T(n))] are straight 3D segments.
- In the unrolled view, u = θ/2π is the horizontal axis and h the vertical. Positives
  fill u ∈ [0, ½) at h ≥ 0, negatives u ∈ [½, 1) at h ≤ 0.

**Sphere.**

- For n > 0 in block k: longitude λ = θ(n) ∈ [0, π), latitude
  lat = π/2 − (k + 1)π / (2(K + 2)), with K the largest block in the rendered range.
- S(n) = (cos lat cos λ, sin lat, cos lat sin λ).
- For n < 0, S(n) = −S(−n), computed as the antipode, not from a formula.

### What holds, and corrections to the brief

All of the following are tested.

**Doubling on the cylinder** is a pure vertical step at fixed angle: θ(2n) = θ(n), and
h(2n) = h(n) + 1 for n > 0, or −1 for n < 0. The circle's invisible identification
θ(2n) = θ(n) becomes a visible unit move. Every even-step chord is a vertical unit
segment in the unrolled view.

**C(−n) is C(n) turned by π about the vertical axis with height negated.** That is
exactly C(−n) = −C(n). So the antipodal rule is already native on the cylinder, not
only on the sphere.

**Even steps (correction).** The brief expected even steps to "drop exactly 1 level".
That is true for n > 0. For n < 0, halving *raises* h by 1, because h = −k(|n|) moves
toward 0. Both are exact, and there are no exceptions: n/2 never leaves [−N, N]. Only
odd-step images can leave the range.

**Sphere checks.** |S(n)| = 1 and S(−n) = −S(n) hold exactly (bitwise negation) for
1 ≤ |n| ≤ 4096. Doubling keeps longitude and moves exactly one band, π/(2(K + 2)),
toward the equator, on both hemispheres.

**Distinctness.** For 1 ≤ |n| ≤ 4095, no two integers share a point, on either the
sphere or the cylinder (8190 points each, no coincidences).

- The closest pairs are adjacent integers in the top block: S(−3633) and S(−3632) at
  distance 0.00152 on the sphere, and C(−3434) and C(−3433) at 0.00153 on the cylinder.
- By construction: λ fixes the odd part, because θ(o) = π(o − 2^k)/2^k is a reduced
  dyadic fraction for odd o. The band fixes k. Odd part and k fix n. That is also
  checked directly for 1 ≤ n ≤ 4095.

**Out-of-range images on the sphere (caveat).** With K fixed by the rendered range,
the images of odd steps (3n or 3n + 1) often land one or two blocks above K. The same
formula then puts block K + 1 exactly on the equator and block K + 2 *south* of it.

- At N = 1023 (K = 9), c = 1: 171 positive chords end on the equator and 171 end in
  the southern hemisphere.
- At N = 4095: 683 and 683.

So "northern hemisphere = positive" holds for the points in range, but a third of
positive chords cross into the south. The renders keep these chords. The browser mode
says so in its caption.

### Chord height changes Δh = h(T(n)) − h(n), |n| ≤ 4095, m = 3

| | n > 0, odd | n < 0, odd | n > 0, even | n < 0, even |
|---|---|---|---|---|
| c = 0 (Imai's T₃) | +1: 683, +2: 1365 | −1: 683, −2: 1365 | −1: 2047 | +1: 2047 |
| c = 1 (3n + 1) | +1: 677, +2: 1371 | −1: 683, −2: 1365 | −1: 2047 | +1: 2047 |
| images outside ±N | 1365 (c = 0), 1366 (c = 1) | 1365 | 0 | 0 |

At N = 1023 the same pattern holds: odd n > 0 gives +1: 171, +2: 341 for c = 0, and
+1: 166, +2: 346 for c = 1. Even steps give ∓1 for all 511 n of each sign.

- **Odd steps split exactly ⅓ / ⅔.** For c = 0, Δh = +1 exactly when the dyadic
  position x = n/2^k − 1 is below ⅓, and +2 otherwise. This is the same x < ⅓ break as
  the fractal probe's chord function g(x), now readable as height.
- **The +1 of Collatz** changes the climb for exactly 6 positive n:
  n = 1, 5, 21, 85, 341, 1365, where 3n + 1 = 4^i jumps one extra block. For
  negatives, |3n + 1| = 3|n| − 1 never crosses a power of two that 3|n| does not
  already cross, so the c = 1 negatives match c = 0.
- **Leaving the range.** No Δh value is caused by leaving the range; leaving is
  tabulated separately. Two thirds of odd chords (|3n| > N) end outside ±N.

### Renders (`docs/geometries/`)

| File | What |
|---|---|
| `cylinder-unrolled-m3-c0-N1023.png`, `cylinder-unrolled-m3-c1-N1023.png` | Unrolled cylinder, labelled axes. Odd steps coloured by sign, even steps grey. |
| `cylinder-projected-m3-c1-N1023.png` | Oblique orthographic view (yaw 0.55, pitch 0.42). Height drawn at 0.127 per level so the barrel fits; far side dimmed; rings at h = 0, ±9, ±11. |
| `sphere-front-m3-c1-N1023.png`, `sphere-back-m3-c1-N1023.png` | Orthographic views from +z and −z, tilted 20°. Chords coloured by sign; far side dimmed. |
| `sphere-fate-front-m3-c1-N4095.png` | As requested: fate colouring, front view. |
| `sphere-fate-back-m3-c1-N4095.png` | Added: the back view, where the n < 0 chords face the viewer. The front view mostly shows n > 0, which all reach 1 and are all one colour. |

Display notes:

- Front and back orthographic views of straight chords through a ball are mirror
  images except for depth. The far side is dimmed (weight 0.15 → 1), and the 3D views
  get a display-only gamma lift (0.5), which weakens that depth cue somewhat.
- Unrolled chords are drawn straight between unrolled endpoints. They are not the
  unrolled images of the 3D chords.

### Fates on the sphere

Fates were counted for all |n| ≤ 4095:

- All 4095 positive n reach 1.
- Negatives split −1: 1350, −5: 1313, −17: 1432.

What the sphere adds over the circle is separation by block, so fate shares were
checked per latitude band:

- Every band from k = 4 to k = 11 splits close to ⅓ each. For example, band 11 has
  −1: 664, −5: 664, −17: 720, and band 10 has 330 / 330 / 364.
- −17 is slightly ahead in the higher bands.

Within a band, the probability that an odd negative n has the same fate as its
longitude neighbour (by circle order) is:

| band k | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|
| same fate as neighbour | 0.07 | 0.29 | 0.14 | 0.38 | 0.40 | 0.43 | 0.46 |

The baseline for independent fates is about 0.33. The low bands have only 8 to 64
points, so their values are noisy. The fate views look like an even blend of the
three negative colours, as on the circle. Splitting the circle into bands did not
reveal arcs, caps or zones of one fate.

### What each geometry shows that the circle hides, and what it does not

**The cylinder** is the clear gain.

- The circle puts n and 2n on the same point. That hides every even step, and it
  stacks all dyadic blocks on top of each other. On the cylinder, the even steps
  become a visible ladder of vertical unit moves, and each odd step becomes a
  readable climb of +1 or +2 levels.
- The ⅓ / ⅔ split of those climbs, and its six exceptions under 3n + 1, can be read
  straight off the unrolled view. The circle drew the same chords as one flat family.
- Collatz dynamics shows up as a walk on this lattice: up 1 or 2 levels per odd step,
  down 1 per even step. That is the familiar picture of an orbit's height, now drawn
  on the dyadic geometry.
- It does **not** change the angular story. Every block still draws the same family of
  chords, now in separate layers. The cylinder doubles the information shown, but the
  new information is the block index, which can be computed directly from n.

**The sphere** makes the antipodal rule a symmetry of the space, S(−n) = −S(n). It
gives every integer a distinct point, with blocks in bands. But:

- The cylinder already has C(−n) = −C(n), so antipodality is not new to the sphere.
- Positives use only half the longitudes, λ ∈ [0, π), so half of each hemisphere is
  empty of points.
- Out-of-range images break the hemisphere-by-sign picture for a third of the chords.
- The banding is a re-drawing of the cylinder's heights on curved bands. It carries no
  extra arithmetic information.

The sphere is the more striking picture. It is not the more informative one, and for
the interleaved fates of negative integers under 3n + 1 it shows nothing new. Fates
stay mixed in every band. Whatever structure they have is not organised by dyadic
position or block at this resolution, on either surface.

---

## Fate correlation F(r) and other multipliers (Nov 2026)

This section follows two suggestions from Yusuke Imai (reply of 20 Nov 2026):

- Study **F(r)**, the probability that n and n + 2r reach the same periodic orbit,
  as a function of r.
- Compare the fate partition for other odd multipliers, especially **m = 2^k ± 1**.

**Status: exploratory.** These are measurements, not proofs.

Where things are:

- Code: `js/imaiFateCorrelation.js` (tests: `js/tests/imaiFateCorrelation.test.js`)
  and `scripts/imai-fate-correlation.mjs` (about 4 s).
- A slow robustness check: `scripts/imai-fate-bigint-check.mjs` (about 8 min).
- Outputs, all in **`docs/fate-correlation/`**:
  - `fate-correlation.json`: every F(r) row with pair counts, baselines, block
    tables and the per-m tables;
  - `bigint-check.json`;
  - `fate-correlation-m3.png` and `fate-correlation-m3-by-block.png`.

**Map and fates.**

- The map is T(n) = n/2 for even n and m·n + 1 for odd n. That is the existing T_m
  of `js/imaiDyadicCircle.js` with additive term c = 1, for every m.
- With c = 0 (Imai's T_m) there is nothing to study: an odd n maps to the odd number
  mn, so no nonzero orbit ever reaches a cycle (this was tested earlier).
- L(n) is the cycle that n reaches, labelled by its element of least |value|. It
  comes from the existing `trajectoryFate` with a **step cap of 2000**.
- An orbit that hits the cap or exceeds 2⁵³ is "unsettled". It gets no fate, and any
  pair involving it is skipped. `trajectoryFate` now also reports which of the two
  happened (`reason: 'cap' | 'overflow'`). Its fates are unchanged.

### F(r) for 3n + 1 on negative odd n

**Range.** There are two samples:

| sample | n | settled within 2000 steps | fates |
|---|---|---|---|
| \|n\| ≤ 16,383 | 8,192 | all | −1: 2,673, −5: 2,667, −17: 2,852 |
| \|n\| ≤ 262,143 | 131,072 | all | −1: 43,180, −5: 42,190, −17: 45,702 |

In both samples the baseline Σp² is 0.3337, within 0.0004 of the equal-shares value
⅓, so the two dashed lines in the plot nearly coincide.

**Sanity check.** F(1) = 0.4293 over 8,191 pairs in the smaller sample. This
reproduces the fractal probe's 43%, and it is a unit test.

Selected values of F(r). The ± is a naive binomial standard error; it ignores overlap
between pairs, so it understates the true uncertainty.

| r | 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 |
|---|---|---|---|---|---|---|---|---|
| \|n\| ≤ 16,383 (±0.005) | 0.429 | 0.408 | 0.396 | 0.377 | 0.358 | 0.346 | 0.322 | 0.318 |
| \|n\| ≤ 262,143 (±0.0014) | 0.470 | 0.448 | 0.426 | 0.410 | 0.393 | 0.381 | 0.370 | 0.357 |

**What the curve does.**

- **It decays, without settling at the baseline within r ≤ 128.** F(r) falls steadily
  from r = 1, fastest over the first few r.
- **In the larger sample** it is still 0.357 at r = 128, about 17 standard errors
  above Σp². Every r from 1 to 128 lies more than 2 standard errors above the
  baseline.
- **In the smaller sample** it crosses the baseline near r ≈ 40. From r = 60 on it
  sits slightly *below* it: 35 values of r are more than 2 naive standard errors
  below, with F ≈ 0.32 against 0.334. This dip does not appear in the larger sample.
  I can't separate it from range effects (pairs straddling dyadic blocks near the top
  of a small range) or from the understated error bars, so it is reported, not
  interpreted.
- **No isolated spikes.** In the larger sample, all 18 values of r flagged as local
  peaks (beyond 2 standard errors of both neighbours) are even, and all 15 flagged
  dips are odd. That is a parity pattern, not a set of special r values.
- **The pattern follows the 2-adic valuation of r.** Compare F(r) with the mean of
  F(r ± 1) and F(r ± 2), then average by v₂(r) in the larger sample:

  | v₂(r) | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
  |---|---|---|---|---|---|---|---|
  | mean residual | −0.0017 | −0.0004 | +0.0020 | +0.0030 | +0.0038 | +0.0070 | +0.0081 |
  | number of r | 62 | 31 | 16 | 8 | 4 | 2 | 1 |

  The residual rises steadily: pairs whose distance 2r is divisible by a higher power
  of two are slightly more likely to share a fate. A plausible mechanism is that n and
  n + 2r agree modulo 2^(v₂(r)+1), and by Terras's theorem the first parity steps of
  an orbit are fixed by n modulo a power of two. So such pairs follow the same early
  path for longer. **This is a hypothesis, not a proof.**

  The effect is under one percentage point. The v₂ ≥ 5 groups contain only 1 or 2
  values of r. In the smaller sample the residuals show no trend at all (noise of
  about ±0.005 swamps it). So this pattern needs the larger sample to be seen at all.

**F grows with |n|, so it is not a function of r alone.** Within single dyadic blocks
(larger sample; both |n| and |n| + 2r in [2^k, 2^(k+1))), F at fixed r rises with the
block:

| block k | r = 1 | r = 4 | r = 16 | r = 64 |
|---|---|---|---|---|
| 13 | 0.437 | 0.413 | 0.377 | 0.330 |
| 17 | 0.479 | 0.434 | 0.400 | 0.381 |

Each block's baseline is 0.3337 to 0.3338, so the rise is not a drift in shares.

- Doubling both the block and r (the same *relative* distance on the dyadic circle)
  changes F by 0.009 on average.
- Keeping r and moving up one block changes it by 0.011.
- So the correlation length grows with |n|, somewhere between not at all and in
  proportion to |n|. These data cannot pin the rate down.
- In the top block, F falls by about 0.015 per doubling of r, steadily from r = 1 to
  r = 64 (`fate-correlation-m3-by-block.png`). That is an observation over one
  decade of r, not a decay law.

### Other multipliers m = 2^k ± 1 (c = 1)

The maps used were T(n) = n/2 | mn + 1 for m = 5, 7, 9, 15 and 17. Sample: the odd n
with 1 ≤ |n| ≤ 16,383, each sign separately (8,192 per side), cap 2000.

**No −1 / −5 / −17 cycles were assumed.** The cycles below are the ones actually
reached:

| m | negative odd n: settled | cycles reached (negative) | positive odd n: settled | cycles reached (positive) |
|---|---|---|---|---|
| 3 = 2²−1 = 2¹+1 | 8,192 / 8,192 | −1 (length 2): 2,673; −5 (5): 2,667; −17 (18): 2,852 | 8,192 / 8,192 | 1 (length 3): all |
| 5 = 2²+1 | 586 / 8,192 | −1 (length 3: −1, −4, −2): 586 | 349 / 8,192 | 1 (length 7): 113; 13 (10): 197; 17 (10): 39 |
| 7 = 2³−1 | 0 | none | 18 / 8,192 | 1 (length 4: 1, 8, 4, 2): 18 |
| 9 = 2³+1 | 5 / 8,192 | −1 (length 4: −1, −8, −4, −2): 5 | 0 | none |
| 15 = 2⁴−1 | 0 | none | 8 / 8,192 | 1 (length 5): 8 |
| 17 = 2⁴+1 | 2 / 8,192 | −1 (length 5): 2 | 0 | none |

**The unsettled orbits overflow; they do not just hit the cap.** All of them exceed
2⁵³, none reaches 2000 steps. `bigint-check.json` continues every one in BigInt for
up to 5000 steps:

- **No orbit settled after passing 2⁵³.**
- After 5000 steps the unsettled orbits had reached 342 to 810 bits (m = 5) and up to
  about 3,800 bits (m = 17).
- That is consistent with a typical growth factor of about m/4 per odd step plus two
  halvings, which exceeds 1 for every m ≥ 5. None is assigned a fate.
- Limitation: above 64 bits the check does not keep a visited set, so a cycle made
  entirely of numbers above 2⁶⁴ would be missed.

**The 2^k ± 1 structure is visible, but only in the trivial cycles.** Under mn + 1,
the start n = ±1 reaches a power of two in one step exactly when m = 2^j ∓ 1:

- For m = 2^j − 1 (7, 15), the only cycle found is 1 → 2^j → … → 1, on the positive
  side.
- For m = 2^j + 1 (5, 9, 17), the only negative cycle is −1 → −2^j → … → −1.
- m = 3 is both 2² − 1 and 2¹ + 1, so it has the trivial cycle on each side.
- Only m = 3 has more than one negative cycle. Only m = 3 and m = 5 (positive side:
  1, 13, 17) have more than one cycle on any side.

**What F(r) looks like for the other m.**

- On the negative side, F(r) is trivially 1 for m = 5, 9 and 17: one cycle, every
  settled pair agrees. It is undefined for m = 7 and 15: nothing settles.
- The only multi-cycle partition outside m = 3 is m = 5 on the positive side, but
  only 349 of 8,192 n settle there. So each r has about 18 pairs where both members
  settle. Its F(r), stored in the JSON, ranges from 0.08 to 0.85 over r ≤ 64 against
  Σp² = 0.436: too few pairs to read.
- As the closest available analogue, the JSON gives the **co-settling** probability
  S(r) = P[n + 2r settles | n settles]:
  - for m = 5, negative side: S(1) = 0.126 and S averages 0.081 over r ≤ 64, against
    a settled share of 0.072;
  - for m = 5, positive side: S averages 0.053, against 0.043.
- So whether an orbit settles is mildly clustered among neighbours, as fate is for
  m = 3. With so few settled n this is weak evidence.

### Did the correlations decay, oscillate, or persist, and did any other multiplier look different?

**For m = 3 they decay, with a slight 2-adic modulation, and they are still above
baseline at r = 128 in the larger sample.**

- F(r) falls from 0.43–0.47 at r = 1 toward the ⅓ baseline, steadily rather than
  abruptly, with no oscillation. In the top block it drops by about 0.015 per doubling
  of r.
- On top of the decay there is a small, consistent preference for even r, increasing
  with the 2-adic valuation of r (about +0.007 for r = 32 and 96, +0.008 for r = 64).
  r = 128 is the edge of the range and gets no residual. That fits
  trajectories that share their early parity steps. It shows up as a parity pattern,
  not as spikes at powers of two.
- The correlation is not a function of r alone. At fixed r it is stronger for larger
  |n|, and it scales partly with relative (dyadic) distance. In the smaller range the
  curve even dips slightly below baseline for large r, which the larger range does not
  reproduce.

**Every other multiplier tested looks completely different**, though not in the way
the question anticipated:

- For m = 5, 7, 9, 15 and 17 with c = 1, at least 92.8% of orbits on each side grow past
  2⁵³ and are still growing after 5000 steps (bits climbing into the hundreds or
  thousands).
- Negative n have at most one cycle (−1, for m = 2^j + 1), so a fate partition to
  correlate barely exists.
- The m = 2^k ± 1 structure appears only in which side carries the trivial cycle
  ±1 → ±2^j.
- So m = 3 is special here simply because it is the only one of these maps under which
  orbits typically shrink. A meaningful cross-m comparison of F(r) would need maps
  that settle, for example accelerated maps (mn + 1)/2^v with the right growth rate,
  or a different additive term. That is a separate study and was not attempted.
