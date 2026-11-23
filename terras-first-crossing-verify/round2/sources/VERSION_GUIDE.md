# Version guide: Hexagon, Zenodo, and local packages

Checked 23 November 2026. The **Hexagon**, **Zenodo**, and **local package** version labels are separate histories. Do not infer that a file named `r2` is byte-identical to a PDF labeled `v2` on another platform.

## Canonical public manuscripts

| Venue | Version | Manuscript / status |
|---|---|---|
| Hexagon Math | [2611.00459v1](https://hexagonmath.org/2611.00459v1) | Earlier public version; 75-odd-run formulation |
| Hexagon Math | **[2611.00459v2](https://hexagonmath.org/2611.00459v2)** | **[Official 12-page PDF](https://hexagonmath.org/pdf/2611.00459v2)**; the actual PDF's abstract and Theorem 8 state **81 maximal odd runs**, so a counterexample would need **at least 82** |
| Zenodo | [v1](https://doi.org/10.5281/zenodo.24231556) | Initial release |
| Zenodo | [v2](https://doi.org/10.5281/zenodo.24238605) | Historical attribution revision |
| Zenodo | **[v3](https://doi.org/10.5281/zenodo.24247351)** | Latest Zenodo release; 81-run theorem; 12-page PDF |
| GitHub | [`manuscript/note.pdf`](../manuscript/note.pdf) | 12-page, 81-run manuscript; matches the recorded Zenodo v3 checksum in the root README |

Hexagon's **v2 webpage abstract** still describes **75** runs as checked on 23 November 2026, while the **v2 PDF itself states 81**. For the mathematical statement and verification target, consult the PDF, not the short HTML abstract. This appears to be a public metadata/text mismatch, not a change to the theorem as printed in the v2 PDF. The [Hexagon source-file listing](https://hexagonmath.org/src/2611.00459v2/files) is also available.

## Historical repository packages

- `packages/terras-first-crossing-note-r2.pdf` and `packages/hexagon-submission-r2.zip` are **historical internal r2 artifacts**. An independent checker reported that the local r2 PDF had **9 pages**; they must **not be described as verified copies of Hexagon's published 12-page v2 PDF**.
- `packages/terras-first-crossing-note-r3.pdf` and `manuscript/note.pdf` are 12-page, 81-run artifacts in the repository.
- Existing packages, sources, verifiers, and deposited-version files are preserved; this version guide does **not** overwrite or reissue any deposited PDF.

## Reproducing the numerical checks

From the repository root:

```sh
python3 scripts/verify_crossing.py    # 51 checks: original release verifier
python3 scripts/verify_81_runs.py     # 31 checks: 81-run theorem verifier
```

The first script includes the earlier 75-run arithmetic. The second checks the additional splitting/restart argument and the numerical inequalities supporting the 81-run conclusion. Passing either script is a **reproduction of a finite numerical verification**, not independent human refereeing of all proof steps.

For details, caveats, and further research scripts, read [Verification and Reproducibility](VERIFICATION_AND_REPRODUCIBILITY.md) and [Research Status](../research/RESEARCH_STATUS.md). The later research program has additional conditional results that are not part of the deposited manuscript.

## Guidance for external checkers

When reporting a result, please identify **the exact PDF and source/checker revision** used. A reproduction of `verify_81_runs.py` (31/31) is not the same as an independent re-derivation of Theorem 8. In particular, separately label checks of the earlier **75-run calculation**, the stronger **81-run proof**, and the reciprocal-sum restriction. See [Contributing](../CONTRIBUTING.md).
