# Round 2: verification of the 81-run argument (Theorem 8, Lemmas 6–7)

Prepared 23 November 2026, for Franklin. Nothing has been sent to De Jesús.

## Bottom line

* **Every stage reproduces.** All five rows of Theorem 8's head reproduce exactly: my H equals the printed H in every row, and every printed λ and ceiling is on the safe side of my rigorous value. This holds whether I chain from my own exact ceilings or from the printed ceiling of the row above. The lower bound d > 1.28·10¹⁷ and the tail for d ≥ 2⁶⁵ also reproduce. The thinnest margin is row 1, where the binding height bound sits only **0.0013 bits** below 2⁷¹ when chained from the printed ceiling.
* **No lemma violations.** I stressed every proof step of Lemmas 6 and 7 that can be tested on data. That covers all 499,999 odd seeds 3 ≤ n ≤ 10⁶, and the least two eligible realizers of all 3,066,528 first-crossing words of length ≤ 31: about 8×10⁷ lemma checks, plus 3.5×10⁸ checks of Lemma 7 on arbitrary sets of starts. There were **0 violations**.
* **The boundary.** The lemmas' headline conclusions assume a realizer that fails to descend with n > B. No such object exists in any range that can be searched, so those conclusions are vacuous on data. What I tested is every inequality in their proofs that does not need that assumption, and Lemma 7 in full, because its hypothesis concerns heights only.
* **Tests:** `independent/tests` has **41 tests, 41 passed**: 28 from round 1 and 13 new.

## 0. Sources and versions

| item | identification |
|---|---|
| manuscript used | Hexagon 2611.00459v2, downloaded from https://hexagonmath.org/pdf/2611.00459v2. 12 pages; sha256 `35d0c88ecbe8ef738dd64de6b5c2c17699a43472667ab275c933122ef6e41557`, md5 `7b138ae0…f5`; created 15 Nov 2026 17:42 UTC |
| relation to the repo | The word-level text is **identical** to the repo's `manuscript/note.pdf`, which is v3 (md5 `b977d11b…`), except for one added stamp line, `hexagon:2611.00459v2`. The bytes differ: 312,669 vs 312,906 bytes. |
| version guide | `docs/VERSION_GUIDE.md`, fetched over HTTPS from the repo's current HEAD into `round2/sources/`. The round-1 clone was left untouched and not pulled. |
| checker | `scripts/verify_81_runs.py`, sha256 `ca338694ac39ff93…`, run in round 1 with 31/31 passed. I read its source only **after** my code was finished, so that I could describe what it checks. |

Hexagon and Zenodo were blocked by this environment's proxy. I created a personal environment, `collatz-box-universes`, that allows hexagonmath.org and zenodo.org, and moved this session onto it.

**Where the guide and the manuscript disagree.** I found no disagreement in the mathematics. The guide is accurate on every point I could check:
* The guide says Hexagon's **v2 webpage abstract says 75 while the v2 PDF says 81**. Confirmed: the HTML abstract reads "at most 75 … at least 76", and the PDF's abstract and Theorem 8 read 81/82.
* The guide says the v2 PDF is 12 pages and states 81. Confirmed.
* The guide says the r2 package files are historical and must not be described as Hexagon v2. Agreed, and this corrects round 1. Round 1 called the 9-page `packages/…-r2.pdf` "v2", using the README's Zenodo numbering, and it is not Hexagon's v2.

Small points the guide does not mention:
1. Hexagon's v2 page gives its provenance DOI as **10.5281/zenodo.24231556**, which is Zenodo **v1**, a 75-run version. That is the DOI quoted in round 1's brief.
2. The guide says the GitHub `manuscript/note.pdf` matches Zenodo v3. It does not say that the Hexagon v2 PDF is a different file with the same text. I confirmed the text is the same.

## 1. Argument map (Step 1)

Notation: s is the number of odd runs; B = 28·10¹⁸; Λ = k ln 2 − d ln 3; α = log₂3; G_t = Σ_{j<t} α^j; mᵢ = (1 − (2/3)^ℓᵢ)/ρ_{tᵢ} is run i's contribution to M_w; and e = q ln 3 − p ln 2 for a convergent p/q < α.

**Lemma 6 (splitting)** is analytic. Hypotheses: a first-crossing word with s ≤ 81, a realizer n that fails, n > B (used in its proof), and 0 < λ < Λ.
* (4): n + 1 < 1 + 81/λ.
* If moreover λ > r/B with r ≥ 1, then s > r, and the r noninitial runs with the largest mᵢ start at x with x + 1 < 1 + (81 − r)(1 + 81/B)/(λ − r/B). This is (5).
* Proof steps: (a) each mᵢ < 1, so M_w < s; (b) M_w < r + (s − r)·m*; (c) ρ_{tᵢ} < 1/mᵢ; (d) xᵢ = ρ_{tᵢ}(n + Mᵢ) with Mᵢ ≤ M_w < 81; (e) n > B.

**Lemma 7 (restart)** is analytic. If the initial start and the r selected starts all have x + 1 < 2^H, then d < H(G_{81−r} + r).
* Proof steps: (a) Lemma 5 restarted locally, so a segment of t runs starting below 2^H has fewer than H·G_t odd steps; (b) Σⱼ G_{tⱼ} ≤ G_{s−r} + r over compositions of s into r + 1 parts, by convexity of G; (c) s ≤ 81 and G is increasing.

**Theorem 8: the finite and numerical claims**

| # | stage | inputs | claim | hands on |
|---|---|---|---|---|
| L | lower bound | convergent I = (9 881 527 843 552 324, 6 234 549 927 241 963); e_I ∈ (5.22, 5.24)·10⁻¹⁸; Λ < 81/B | d > (0.69 − q·81/B)/5.24·10⁻¹⁸ > **1.28·10¹⁷** | the target the head must contradict |
| 0 | head row 0 | ceiling d < **2⁶⁵**; convergent II (q = 50 247 984 153 525 417 450), e_II ∈ (6.71, 6.72)·10⁻²¹; r = 0 | λ ≥ 8.8606·10⁻²¹, H = 73, d < 73·G₈₁ = **1.9886·10¹⁸** | that ceiling |
| 1 | head row 1 | ceiling 1.9886·10¹⁸; convergent III (q = 4 242 721 909 926 539 673), e_III ∈ (1.24, 1.25)·10⁻¹⁹; r = 2 | λ ≥ 1.0491·10⁻¹⁹, H = 71, d < 71(G₇₉ + 2) = **7.6987·10¹⁷** | that ceiling |
| 2 | head row 2 | ceiling 7.6987·10¹⁷; III; r = 3 | λ ≥ 1.4074·10⁻¹⁹, H = 71, d < **4.8572·10¹⁷** | that ceiling |
| 3 | head row 3 | ceiling 4.8572·10¹⁷; III; r = 4 | λ ≥ 1.4909·10⁻¹⁹, H = 74, d < **3.1940·10¹⁷** | that ceiling |
| 4 | head row 4 | ceiling 3.1940·10¹⁷; convergent IV (q = 267 118 416 222 671 843), e_IV ∈ (1.64, 1.65)·10⁻¹⁸; r = 7 | λ ≥ 6.3202·10⁻¹⁹, H = 68, d < **7.3709·10¹⁶** | contradicts L |
| T | tail | d ≥ 2⁶⁵; Rhin Λ ≥ k^−13.3; k ≤ 2d | n < 81(2d)^13.3, log₂(n + 1) < 7 + 13.3·log₂(2d); G₈₁ < **2.7241·10¹⁶**; G₈₁(7 + 13.3·67) = **2.44647·10¹⁹ < 2⁶⁵**; the bound fails at j = 64; holds for all j ≥ 65 by induction | excludes d ≥ 2⁶⁵ |

Each row has the same structure:
1. λ = (ln 2 − d†·e)/q, from qΛ + d·e ≥ ln 2.
2. λ > r/B, which Lemma 6 requires.
3. H is the least integer with max((4), (5)) ≤ 2^H.
4. The new ceiling is H(G_{81−r} + r), by Lemma 7.

Only the ceiling passes to the next row. The **"five stages" are head rows 0–4.** Stage L is the target, and T is the separate range d ≥ 2⁶⁵.

The step and odd-input bounds k ≥ 10 439 860 591 and d ≥ 6 586 818 670 use the same Farey sandwich as v2. Round 1 recomputed them, and the result is unchanged.

## 2. The five stages compared (Step 2)

The code is `independent/fcverify/thm8.py`, with output in `round2/logs/thm8.log`. It uses my round-1 log enclosures, which come from the series Σ1/(k2ᵏ) and Σ1/(k3ᵏ) and are about 10⁻¹⁹² wide, and exact `Fraction` arithmetic throughout. "Printed chain" means each row starts from the manuscript's printed ceiling of the row above. "His checker" is `verify_81_runs.py`'s printed output.

| row | r | conv. | λ: manuscript | λ: mine (printed chain) | λ: his checker | H: ms / mine / his | new ceiling: manuscript | mine (printed chain) | mine (exact chain) | his checker (his target) | bits of slack in H |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | II | 8.8606e-21 | 8.860608e-21 | 8.860608e-21 | 73 / 73 / 73 | 1.9886e18 | 1.984875e18 | 1.984875e18 | 1.988555e18 (≤ 2.044e18) | 0.047 |
| 1 | 2 | III | 1.0491e-19 | 1.049168e-19 | 1.049181e-19 | 71 / 71 / 71 | 7.6987e17 | 7.684766e17 | 7.684766e17 | 7.698649e17 (≤ 7.81e17) | **0.0013** (exact chain: 0.0060) |
| 2 | 3 | III | 1.4074e-19 | 1.407423e-19 | 1.407424e-19 | 71 / 71 / 71 | 4.8572e17 | 4.848548e17 | 4.848548e17 | 4.857192e17 (≤ 4.93e17) | 0.025 |
| 3 | 4 | III | 1.4909e-19 | 1.490951e-19 | 1.490951e-19 | 74 / 74 / 74 | 3.1940e17 | 3.188350e17 | 3.188350e17 | 3.193959e17 (≤ 3.20e17) | 0.61 |
| 4 | 7 | IV | 6.3202e-19 | 6.320235e-19 | 6.320485e-19 | 68 / 68 / 68 | 7.3709e16 | 7.358449e16 | 7.358449e16 | 7.370870e16 (≤ 7.38e16) | 0.61 |
| L | – | I | > 1.28e17 | 1.291307e17 exact; 1.282375e17 in the printed form | 1.291307e17 | – | – | – | – | – | – |
| T | – | – | 2.44647e19 < 2⁶⁵ | 2.441940e19 | (G₈₁ ≤ 2.724048e16) | – | – | – | – | – | – |

* **The four convergents.** I, II, III and IV are convergents 32, 40, 36 and 34 of log₂3 (counting p₀/q₀ = 1/1), and all lie below α. My e-enclosures sit inside the printed intervals: e_I = 5.228127e-18, e_II = 6.719871e-21, e_III = 1.247181e-19, e_IV = 1.641584e-18.
* **G₈₁.** My rigorous upper bound is 2.719007·10¹⁶. The manuscript's 2.7241·10¹⁶ is looser and still valid; his checker gets 2.724048·10¹⁶ from α < 317/200.
* **λ > r/B** holds in every row. The tightest is row 3: 1.4910e-19 against 1.4286e-19.
* **Printed λ values** are truncations, never above my value. **Printed ceilings** are always at or above my rigorous bound. The rounding always goes the safe way.
* **Final contradiction:** 7.358449e16 < 1.291307e17 in both chains.
* **Tail:** the bound closes at j = 65 and fails at j = 64. I also checked j = 65..2999 directly, and the log step 81x^13.3 + 1 ≤ 2⁷·x^13.3.
* **Minor presentation points** (neither affects validity):
  1. 2.7241e16 × 898.1 = 2.44651e19, but the printed tail value is 2.44647e19, which matches G₈₁ = 2.724048e16 (the checker's value) rather than the printed G₈₁. Both are below 2⁶⁵.
  2. The remark after Lemma 6 says that moving m₍ᵣ₎ makes λ − (r+1)/B "negative for three of the five rows". I found it negative in rows 1–3 (−2.2e-21, −2.1e-21, −2.9e-20) and positive in row 4. Row 0 has r = 0 and no selected starts. The count is three only if you exclude row 0.
* **What `verify_81_runs.py` checks, and how that differs from this recomputation.**
  * It picks the best convergent per row automatically. Those happen to be the manuscript's.
  * It checks H ≤ a looser target (75, 72, 72, 74, 68), not that H equals the printed values (73, 71, 71, 74, 68).
  * It chains its own computed ceilings.
  * It checks the printed-ceiling chain only for row 4.
  * It uses (1 + 81/B)·81/λ for the initial start, which is more conservative than (4).

  So its 31/31 does not by itself confirm the printed table row by row. The comparison above does.

## 3. Lemma stress results (Step 3)

The code is `independent/fcverify/lemmas.py` and `scan_lemmas.py`, with output in `round2/logs/lemmas_N1e6_K31.{log,json}`.

Data sets:
* **(A)** every odd seed 3 ≤ n ≤ 10⁶ with its first-crossing word. This is the round-1 data, with up to 41 runs.
* **(B)** every first-crossing word of length ≤ 31: 3,066,528 words, up to 11 runs. Each is tested at its least eligible realizer r(w) and at r(w) + 2ᵏ, giving 6,133,056 realizers.
* **(C)** every composition of s ≤ 18 into r + 1 parts.

| check | what it tests | (A) tested / violations | (B) tested / violations |
|---|---|---|---|
| L6a | 0 < mᵢ < 1 for every run, and Σmᵢ = M_w exactly | 499,999 / **0** | 6,133,056 / **0** |
| L6b | xᵢ = ρ_{tᵢ}(n + Mᵢ) with Mᵢ ≤ M_w, for every run | 871,075 / **0** | 42,729,386 / **0** |
| L6c | ρ_{tᵢ} < 1/mᵢ | 871,075 / **0** | 42,729,386 / **0** |
| L6d | M_w < r + (s − r)·m*, for every 1 ≤ r ≤ s − 1 | 371,076 / **0** | 36,596,330 / **0** |
| L6e | the height bound in failure-free form: when M_w > r ≥ 1, each of the r selected starts has xᵢ < (n + M_w)(s − r)/(M_w − r). Lemma 6's (5) is a weakening of exactly this, because a failure has nΛ < M_w. | 120,911 / **0** | 10,135,934 / **0** |
| L7 | Lemma 7 itself: initial start plus the top r noninitial starts, H least with x + 1 < 2^H, then d < H(G_{s−r} + r), for every r from 0 to s − 1 | 871,075 / **0** | 42,729,386 / **0** |
| L7s | the sharper per-segment step: each segment has fewer than H_j·G_{t_j} odd steps, using its own start's height | 871,075 / **0** | 42,729,386 / **0** |
| L7x | Lemma 7 for **every** subset of noninitial starts, not only the top r. Run for s ≤ 10 in (A) and s ≤ 8 in (B). | 2,456,414 / **0** | 349,054,252 / **0** |
| COMP | Σ G_{tⱼ} ≤ G_{s−r} + r, rigorous enclosures, all compositions with s ≤ 18 | 262,143 / **0** (C) | |

**No case violates a lemma statement or a proof step.** The checks can detect errors: a pytest case feeds a non-realizer and confirms L6b flags it. The class-level descent of the same data was confirmed in round 1, so nothing here is a counterexample-shaped object.

What these runs cannot test:
* **The failure-conditional conclusions of Lemma 6:** (4), "s > r", and (5) with λ < Λ and n > B. No failing realizer exists to test them on. Their failure-free core (L6a–L6e) is what I tested.
* **The largest run count reached:** 41 in (A) and 11 in (B), against the 81 the theorem covers. The lemmas' proofs do not depend on s beyond s ≤ 81, and L7/COMP test the s-dependence directly up to the s available.

## 4. Boundary (Step 4)

**Recomputed independently:**
* all of Theorem 8's numerics: the four convergents and their e-enclosures, the lower bound L, G₈₁ and G_{81−r} for r = 2, 3, 4, 7, and all five head rows (λ, the λ > r/B condition, the heights (4) and (5), H, and the Lemma 7 ceiling), in both chainings;
* the final contradiction, and the tail at j = 65, including the failure at j = 64, the induction step, a direct check of j < 3000, and the log step;
* the Farey bounds on k and d, which are unchanged from round 1.

**Proof steps checked for logic and tested on data, not computable in general:**
* Lemma 6, which is analytic. I followed the proof line by line, including the counting with m₍ᵣ₎ in the second group, the bound ρ < 1/m, and xᵢ = ρ(n + Mᵢ) with Mᵢ ≤ M_w. I found no gap.
* Lemma 7, which is analytic. Lemma 5 restarted locally, plus convexity of G for the composition bound. I found no gap.
* Neither lemma is a computation, so I did not force one onto it. Section 3 is evidence on finite data, not a proof.

**Taken as given:**
* the Rozier–Terracol verified range B = 28·10¹⁸ (Cor. 5.4), which gives n > B;
* Rhin's estimate Λ ≥ k^−13.3 in the form of Rozier–Terracol Prop. 6.3, used only in the tail d ≥ 2⁶⁵;
* the elementary facts that Λ < e^Λ − 1, and that k = ⌈dα⌉ ≤ 2d.

**Not in scope this round:**
* Corollary 9;
* Propositions 12–14, including the NFB reciprocal-sum restriction;
* whether 81 is optimal for this method. The manuscript (Remark 10) leaves that question open, and I did not search over convergents and choices of r.

This is a finite exact recomputation plus a reading of the proofs. It is not a referee's review and not a machine-checked proof.

## Files

* Code: `independent/fcverify/thm8.py`, `lemmas.py`, `scan_lemmas.py`, `report_thm8.py` (round-1 modules reused: `core.py`, `bounds.py`, `scan.py`)
* Tests: `independent/tests/test_round2.py` (13 tests) plus the 28 from round 1, all 41 passing (`round2/logs/pytest.log`)
* Logs: `round2/logs/thm8.log`, `round2/logs/lemmas_N1e6_K31.{log,json}`
* Sources: `round2/sources/VERSION_GUIDE.md` and text extracts of the Hexagon PDF. The PDF and HTML themselves are kept locally, pinned by sha256, and not committed.
