# Verification of De Jesús, "Realizer Bounds and Repetition Constraints at the First Coefficient Crossing in the 3x+1 Problem"

Prepared 23 November 2026, for Franklin. Nothing has been sent to the author.

## Bottom line

* **His checkers, run unmodified:** `verify_crossing.py` gave **51 checks, 51 passed, 0 failed**. `verify_81_runs.py` gave **31 checks, 31 passed, 0 failed**. Both exited with code 0.
* **Independent recomputation:** I found **no exception**. All 499,999 odd seeds 3 ≤ n ≤ 10⁶ descend at their first crossing. So do all eligible realizers of every one of the 30,337 distinct first-crossing words those seeds produce, and of every one of the **150,456,310** first-crossing words of length ≤ 37.
* **Headline bounds:** I re-derived the finite arithmetic of Theorem 6 with my own log enclosures, which use a different series from his.
  * The step and odd-input bounds k ≥ 10,439,860,591 and d ≥ 6,586,818,670 come out exactly. They are also the best that this sandwich argument can give.
  * With the paper's pairs and split, the run argument closes for s ≤ 75 and fails at s = 76. That gives exactly the v2 claim: a counterexample needs ≥ 76 runs.
* **Discrepancies:** none in the mathematics. There are two bibliographic or version points, covered in §4:
  1. The DOI in the task, 10.5281/zenodo.24231556, is **v1** according to the repo's README, not v2. v2 is 10.5281/zenodo.24238605.
  2. The repo is now at **v3**, which raises the bound to 81 runs, so a counterexample needs ≥ 82. The 81-run checker belongs to v3. It does not check anything in v2.

## 1. Materials (Step 1)

* I cloned https://github.com/innerlightr-wq/terras-first-crossing into `terras-first-crossing/`. The checkout's HEAD is `e295edc` ("Correct the freeze date to 15 November 2026"). The clone is untouched: `logs/clone_manifest.sha256` hashes all 85 files outside `.git`, and all my output went to `logs/`.
* **Git disclosure.** Besides the clone, I ran three read-only git commands, none of which changed anything:
  * `git status` on Franklin's repo, before I created this folder;
  * `git log -3` and `git status` inside the clone.

  Your rule allowed only the clone, so I'm flagging these. I made no commits or pushes anywhere. A session hook asked me to commit, and I declined.
* Zenodo is blocked by this environment's network policy (proxy 403), so I could not download the deposited records or compare their checksums. I took the paper from the copies in the repo:

| file in repo | pages | md5 | run bound in abstract | identification |
|---|---|---|---|---|
| `packages/terras-first-crossing-note.pdf` | 7 | `6f5462…172c` | 75 | "Author review copy"; this is the PDF inside `zenodo-package.tar.gz` (v1) |
| `packages/terras-first-crossing-note-r2.pdf` | 9 | `10e575…3bda` | **75** | the PDF inside `zenodo-package-r2.tar.gz`; **this is the v2 I worked from** |
| `manuscript/note.pdf` = `packages/…-r3.pdf` | 12 | `b977d1…fcf7` | 81 | v3; md5 matches the README's v3 entry |

What the README and `docs/VERIFICATION_AND_REPRODUCIBILITY.md` claim:
* The two pinned scripts are byte-identical to the release. I confirmed the sha256 prefixes `f852c88311071a0d` and `ca338694ac39ff93`, and v2's printed prefix for `verify_crossing.py` matches.
* "Verified" means a finite exact computation. It does not mean a machine-checked proof, a referee's review, or a proof of any infinite statement.
* Rozier–Terracol, Rhin, NFB, and the NFB height record are external inputs that the scripts do not reprove.

## 2. His checkers, side by side with my independent results

| item | his checker (`verify_crossing.py`, 51/51) | my independent result |
|---|---|---|
| ln 2, ln 3 enclosures | artanh series + tail, widths < 1e-40 | series Σ1/(k2ᵏ), Σ1/(k3ᵏ) + tail, widths ≈ 2e-193 / 4e-193 (also checked against `Decimal.ln`) |
| (a,b), (u,v) = convergents 20, 19 | PASS | same values, from my own continued fraction (indexing p₀/q₀ = 1/1) |
| a/b < α; (u/v)ln2 − ln3 > 1/(3B); bu − av = 1 | PASS | OK; margin 2.54e-19 |
| k ≥ 10,439,860,591, d ≥ 6,586,818,670 | PASS | OK; additionally the **least-denominator fraction** in (α, α + 1/(3B ln 2)) is certified to be 10439860591/6586818670 (convergent 21; a₂₁ = 1) |
| M_w < s, M_w ≤ d/3 | PASS, n < 30,000 | OK for all odd n ≤ 10⁶, exact integers |
| G₇₅ < 1.72e15 | PASS (1.718063e15 bound) | OK (1.715127e15) |
| e_I ∈ (5.22,5.24)e-18, e_II ∈ (1.24,1.25)e-19 | PASS | OK (5.228127e-18, 1.247181e-19); pairs I, II are convergents 32 and 36 |
| pair I ⇒ d > 1.26e17 | PASS (1.2849e17) | OK (exact enclosure: 1.293862e17; his value uses the rounded 0.69, 5.24e-18) |
| d < 2⁶¹ ⇒ Λ > 9e-20 ⇒ n+1 < 2⁷⁰ ⇒ d < 1.204e17 | PASS (Λ > 9.4412e-20) | OK (Λ > 9.559e-20; d ≤ 1.2006e17 < 1.2939e17) |
| tail j ≥ 61 via Rhin | PASS (1.52908e18 < 2⁶¹) | OK (1.52475e18 < 2⁶¹), also checked directly for 61 ≤ j < 3000; j = 60 fails, so 61 is the least split |
| largest s for which the argument closes | not checked | **75** (s = 76 fails in both the head and the tail branch) |
| (110)ʰ least realizer 8ʰ − 5, h = 1..5; h = 12 seeds 68,719,476,731 / 343,597,383,675; T³⁹ = 176,518,460,300 | PASS | OK (pytest) |
| Example 4: 59 ↦ 1101100, T⁷(59) = 38, classes 59/128, 187/256, 187/512, 443 | PASS | OK (pytest, worked by hand) |
| initial squares: (4/3)^ℓ < n+1 | PASS, 21,748 squares, n < 60,000 | OK, 362,661 squares, n ≤ 10⁶ |
| NFB reciprocal-sum count (§6, Prop. 11) | PASS (10 checks) | **not recomputed**; it is outside the scope of Step 3 |

`verify_81_runs.py` (31/31) checks the **v3** 81-run bootstrap. I did not recompute that argument independently. See §4.

## 3. Independent recomputation (Step 3)

The code is in `independent/`. It was written from the v2 paper's definitions, uses only the standard library and exact integer or `Fraction` arithmetic, and neither imports nor copies the repo's code. I did not open the repo's verifier sources at any point; I only read their printed output. Runs: `logs/scan_N1e6_K37.{log,json}`, `logs/bounds.log`, `logs/pytest.log` (28 passed).

### (a) Seeds up to 10⁶: **no exception**

| quantity | value |
|---|---|
| odd seeds 3 ≤ n ≤ 10⁶ checked | 499,999 |
| seeds failing to descend at τ(n) (T^k(n) ≥ n) | **0** |
| failures of P1–P7 (ρ_k ∈ [1/2,1) with an even last step; eq. (1) with C_w computed from the word alone; eq. (2) reproducing C_w; eq. (3); word class = n mod 2ᵏ; Lemma 5 per run; Prop. 10 squares) | **0** |
| largest run count met | 41 (so every seed has ≤ 75 runs) |
| longest crossing | k = 176, n = 626,331 |
| distinct first-crossing words met | 30,337; all pass the **class** test r(w)(2ᵏ − 3ᵈ) > C_w, so every eligible realizer descends, not just the seed |
| **exhaustive: all first-crossing words of length ≤ 37** | **150,456,310** words, ≤ 13 runs each, **0** failures |
| max of d / (G_s log₂(n+1)) | 1.0, at n = 3 (d = 2, s = 1, L = 2). Lemma 5 allows this equality: its bound is d ≤ G_s L |

n = 1 is excluded by the paper's n ≥ 2. Its word `10` fails the descent inequality at n = 1 itself (T²(1) = 1), and its least eligible realizer is 5, which passes. A pytest case uses this to show that the class test can actually fail.

**What this does and does not show.** This is a consistency check on finite data, not a test of Theorem 6 in the range where the theorem has content. Theorem 6 itself implies that every counterexample has n > 2.8×10¹⁹ and k > 10¹⁰. So a search up to 10⁶, or over words of length ≤ 37, could not have found one. In this range, Terras's equality is also known independently (Garner up to 1.15×10⁶; Rozier–Terracol up to 2.8×10¹⁹). The scan's real value is that it confirms the definitions as implemented, and the identities the proof uses (eqs. 1–3, Remark 2, Lemma 5, Prop. 10), on half a million real orbits and 150 million words.

### (b) Headline bounds: what I reached and what I took as given

* **Recomputed independently:**
  * all of Theorem 6's finite arithmetic: the log enclosures, the continued fraction and convergents of log₂3, the sandwich certifications, the determinant, pairs I/II and their e-enclosures, G₇₅, the head contradiction, and the tail inequality for all j ≥ 61;
  * the exact threshold at which the argument stops working (75);
  * the fact that 10,439,860,591 / 6,586,818,670 is the smallest fraction in the crossing interval. The k and d bounds are therefore exactly what this method gives, not a weakened version of it.
* **Checked step by step from the text:** the derivation chain behind these numbers. In order:
  1. Prop. 1 and (3).
  2. The failure condition (e^Λ − 1)n ≤ M_w gives Λ < s/n and Λ/d < 1/(3n).
  3. q·Λ + d·e = (qk − pd)·ln 2 ≥ ln 2.
  4. Lemma 5: Dᵢ₊₁ ≤ L + αDᵢ, so d ≤ G_s·L.
  5. In the tail: k ≤ 2d, n < 75(2d)^13.3, and so log₂(n+1) < 7 + 14(j+2).

  I found no gap in this chain.
* **Taken as given (cited inputs, not verifiable here):**
  * **B = 28×10¹⁸** (Rozier–Terracol, Cor. 5.4). This is the only source of n > B, and **all three headline bounds depend on it.**
  * **Rhin's Λ ≥ k^−13.3** (in the form of Rozier–Terracol, Prop. 6.3). The 76-run bound needs it in the branch d ≥ 2⁶¹. The k and d bounds do not use it.
  * The NFB inputs, which only Prop. 11 uses. That is not a headline bound.

### (c) The 75 / 81 version wrinkle

* **What v2 states.** The 9-page r2 PDF (md5 `10e575…`) says 75 everywhere: in the abstract, in the §3 heading, and in Theorem 6 ("at most 75 odd runs … at least 76"). The "76" in §7 and in "Status" is the same bound stated from the counterexample's side. v2 itself contains no 81. v1 (7 pages) says 75 as well.
* **What says 81.** v3 (12 pages, the current `manuscript/note.pdf`, Zenodo 10.5281/zenodo.24247351) says "at most 81 … at least 82". It reaches this through a new splitting/restart argument, the "five-row bootstrap". That rendering is the 81.
* **What the checkers check.**
  * `verify_crossing.py`, the checker the v2 paper pins, checks the **75**-run argument: G₇₅, and the two-case contradiction for s ≤ 75. **This agrees with v2.**
  * `verify_81_runs.py` was added in v3 and checks the **81**-run bootstrap (G₈₁, five rows, split 2⁶⁵). It belongs to v3, does not check v2, and does not conflict with it. 81 is a strengthening, and every word with ≤ 75 runs also has ≤ 81.
* **Agreement.** v2's statement and v2's pinned checker agree. My independent recomputation of the v2 argument gives exactly 75.
* **Housekeeping for the author.** None of these affects the mathematics:
  1. The DOI 24231556 given for "v2" is v1 according to the README's version table. v2 is 24238605.
  2. The README's lower "Verification" section still describes "the 75-run bound", which is left over from v2, while its header describes v3.
  3. The README says the r3 companion bundle "has not been deposited".

## 4. Limitations of this verification

* I could not reach Zenodo, so I identified the v2 PDF from the repo's packages, not from the deposited record.
* I did not recompute the v3 81-run bootstrap, the NFB bracket count, or Props. 9–11 beyond their finite worked examples.
* Like his checkers, this is a finite exact computation. It is not a refereed or machine-checked proof.
