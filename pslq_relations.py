#!/usr/bin/env python3
"""
pslq_relations.py -- search for integer relations among high-precision constants.

Uses mpmath.pslq (sympy.ntheory.generate has no PSLQ implementation; mpmath is
also what sympy itself uses for this). Install with:  pip install mpmath

Two modes
---------
1. Relation search among a set of constants
       basis = [1?] + constants + squares + pairwise products
   PSLQ finds an integer vector c with  sum c_i * basis_i ~= 0.  After each hit,
   one of the terms involved is dropped and the search is re-run, so several
   independent relations can be reported.

2. Identify a single number ("is this a known combination of known constants?")
       basis = [x, 1, library terms...]
   Only relations with a nonzero coefficient on x count; they are rewritten as
   x = -(sum c_i * term_i) / c_x.

Every candidate relation is re-verified by recomputing all constants at 2x the
search precision.  A genuine identity's residual shrinks to the new precision
floor; a numerical coincidence keeps (roughly) the same residual and is
reported as a COINCIDENCE, not a relation.

Adding your own constants
-------------------------
Constants are *functions of precision*, not numbers, because verification
needs to recompute them at higher precision.  Register one with:

    @constant("my_collatz_thing")
    def _(dps):
        # must return an mpf correct to at least `dps` digits
        return mp.log(3) / mp.log(2)

A 15-digit float from an experiment is not enough: PSLQ can only rule relations
in or out up to roughly  digits / len(basis)  digits per coefficient.  If your
number comes out of a series, sum/extrapolate it with mpmath at `dps` digits.

Usage
-----
    python3 pslq_relations.py                  # built-in demo
    python3 pslq_relations.py --dps 150 --maxcoeff 10000
    python3 pslq_relations.py --identify log2_3 # identify a registered constant
    python3 pslq_relations.py --list            # show registered constants
"""

import argparse
import contextlib
import io
import itertools
import re
import sys
from dataclasses import dataclass, field

from mpmath import mp, mpf

GUARD_DIGITS = 20  # extra working digits so rounding never limits the search


# ---------------------------------------------------------------------------
# Constant registry
# ---------------------------------------------------------------------------

CONSTANTS = {}  # name -> function(dps) -> mpf


def constant(name):
    """Decorator: register `fn(dps) -> mpf` under `name`."""
    def register(fn):
        CONSTANTS[name] = fn
        return fn
    return register


def register_constant(name, fn):
    """Non-decorator form, e.g. register_constant("x", lambda dps: mp.sqrt(2))."""
    CONSTANTS[name] = fn


def evaluate(names, dps):
    """Evaluate the named constants at `dps` digits (plus guard digits)."""
    with mp.workdps(dps + GUARD_DIGITS):
        return {n: +CONSTANTS[n](dps + GUARD_DIGITS) for n in names}


# --- standard library of known constants ------------------------------------

@constant("pi")
def _(dps): return +mp.pi

@constant("e")
def _(dps): return +mp.e

@constant("log2")
def _(dps): return mp.log(2)

@constant("log3")
def _(dps): return mp.log(3)

@constant("zeta3")
def _(dps): return mp.zeta(3)

@constant("catalan")
def _(dps): return +mp.catalan

@constant("euler_gamma")
def _(dps): return +mp.euler

@constant("sqrt2")
def _(dps): return mp.sqrt(2)

@constant("sqrt3")
def _(dps): return mp.sqrt(3)

@constant("phi")
def _(dps): return +mp.phi

@constant("pi^2")
def _(dps): return mp.pi ** 2

@constant("e^2")
def _(dps): return mp.e ** 2


# --- demo "experimental" constants (examples of the real use case) ----------

@constant("zeta2")
def _(dps):
    # Pretend this came out of an experiment; it is secretly pi^2/6.
    return mp.zeta(2)

@constant("log2_3")
def _(dps):
    # Collatz-relevant: log_2(3), the growth ratio of 3n+1 vs halving.
    return mp.log(3) / mp.log(2)

@constant("impostor")
def _(dps):
    # Agrees with 3*pi - 2*log(2) to 150 digits, then differs.  At 100-digit
    # search precision it looks like an exact relation; at 2x it must fail.
    return 3 * mp.pi - 2 * mp.log(2) + mpf(10) ** -150


# ---------------------------------------------------------------------------
# Basis construction
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Term:
    """A monomial in the constants, e.g. ("pi",) or ("pi", "e")."""
    factors: tuple

    @property
    def label(self):
        if not self.factors:
            return "1"
        if len(self.factors) == 2 and self.factors[0] == self.factors[1]:
            return f"({self.factors[0]})^2"
        return "*".join(self.factors)

    def value(self, values):
        v = mpf(1)
        for f in self.factors:
            v *= values[f]
        return v


def build_basis(names, include_one=True, squares=True, products=True):
    terms = [Term(())] if include_one else []
    terms += [Term((n,)) for n in names]
    if squares:
        terms += [Term((n, n)) for n in names]
    if products:
        terms += [Term(pair) for pair in itertools.combinations(names, 2)]
    return terms


# ---------------------------------------------------------------------------
# PSLQ with honest reporting of *why* it stopped
# ---------------------------------------------------------------------------

@dataclass
class PSLQResult:
    relation: list = None     # integer coefficients, or None
    norm_bound: str = None    # "no relation with |c| below this" (if reached)
    exhausted_steps: bool = False


def run_pslq(vec, dps, maxcoeff, maxsteps):
    """Call mpmath.pslq and parse its verbose log to tell 'no relation below
    maxcoeff' (a real negative result) apart from 'ran out of steps'
    (inconclusive).  mpmath returns None for both."""
    log = io.StringIO()
    with mp.workdps(dps + GUARD_DIGITS), contextlib.redirect_stdout(log):
        rel = mp.pslq(vec, tol=mpf(10) ** -dps, maxcoeff=maxcoeff,
                      maxsteps=maxsteps, verbose=True)
    if rel is not None:
        return PSLQResult(relation=rel)
    text = log.getvalue()
    m = re.search(r"CANCELLING after step (\d+)/(\d+)", text)
    exhausted = bool(m) and int(m.group(1)) >= int(m.group(2)) - 1
    b = re.search(r"Norm bound: (\S+)", text)
    return PSLQResult(norm_bound=b.group(1) if b else None,
                      exhausted_steps=exhausted)


# ---------------------------------------------------------------------------
# Verification
# ---------------------------------------------------------------------------

@dataclass
class Relation:
    coeffs: dict              # Term -> int (nonzero only)
    dps: int
    residual: mpf
    verify_dps: int = None
    verify_residual: mpf = None
    verified: bool = None
    note: str = ""

    def pretty(self):
        parts = []
        for t, c in self.coeffs.items():
            sign = "-" if c < 0 else "+"
            mag = "" if abs(c) == 1 else f"{abs(c)}*"
            parts.append(f"{sign} {mag}{t.label}")
        s = " ".join(parts).lstrip("+ ")
        return s + " = 0"


def residual_of(coeffs, dps):
    names = sorted({f for t in coeffs for f in t.factors})
    values = evaluate(names, dps)
    with mp.workdps(dps + GUARD_DIGITS):
        return abs(mp.fsum(c * t.value(values) for t, c in coeffs.items()))


def verify(rel):
    """Recompute at 2x precision.  A true identity's residual must drop to
    about 10^(-2*dps); anything larger means the relation evaporated."""
    rel.verify_dps = 2 * rel.dps
    rel.verify_residual = residual_of(rel.coeffs, rel.verify_dps)
    scale = sum(abs(c) for c in rel.coeffs.values())
    threshold = scale * mpf(10) ** -rel.verify_dps
    rel.verified = rel.verify_residual <= threshold
    if not rel.verified:
        rel.note = ("COINCIDENCE: residual did not shrink at 2x precision; "
                    "this is NOT a relation")
    return rel


# ---------------------------------------------------------------------------
# Searches
# ---------------------------------------------------------------------------

@dataclass
class SearchReport:
    basis: list
    dps: int
    maxcoeff: int
    relations: list = field(default_factory=list)
    final: PSLQResult = None
    remaining: list = None


def search_relations(names, dps=100, maxcoeff=1000, maxsteps=20000,
                     include_one=True, squares=True, products=True):
    """Find integer relations among constants, their squares and pairwise
    products.  After each relation the highest-index term in it is dropped
    (derived terms come last, so e.g. pi^2 - (pi)^2 = 0 drops (pi)^2) and the
    search repeats on the reduced basis."""
    basis = build_basis(names, include_one, squares, products)
    report = SearchReport(basis=list(basis), dps=dps, maxcoeff=maxcoeff)
    values = evaluate(names, dps)
    active = list(basis)
    while len(active) >= 2:
        with mp.workdps(dps + GUARD_DIGITS):
            vec = [t.value(values) for t in active]
        res = run_pslq(vec, dps, maxcoeff, maxsteps)
        if res.relation is None:
            report.final = res
            break
        coeffs = {t: c for t, c in zip(active, res.relation) if c}
        rel = Relation(coeffs=coeffs, dps=dps,
                       residual=residual_of(coeffs, dps))
        report.relations.append(verify(rel))
        drop = max(coeffs, key=active.index)
        active.remove(drop)
    report.remaining = active
    return report


def identify(target, library, dps=100, maxcoeff=1000, maxsteps=20000,
             squares=False, products=False):
    """Try to express constant `target` as a rational-coefficient combination
    of 1 and the library terms.  Returns (SearchReport, list of Relations that
    involve the target)."""
    lib_terms = build_basis(library, include_one=True,
                            squares=squares, products=products)
    target_term = Term((target,))
    # target*lib terms let PSLQ catch ratios/Moebius forms, e.g.
    # x*log2 - log3 = 0  <=>  x = log3/log2.
    cross = [Term((target, n)) for n in library] if products else []
    active = [target_term] + lib_terms + cross
    report = SearchReport(basis=list(active), dps=dps, maxcoeff=maxcoeff)
    values = evaluate([target] + list(library), dps)
    while len(active) >= 2:
        with mp.workdps(dps + GUARD_DIGITS):
            vec = [t.value(values) for t in active]
        res = run_pslq(vec, dps, maxcoeff, maxsteps)
        if res.relation is None:
            report.final = res
            break
        coeffs = {t: c for t, c in zip(active, res.relation) if c}
        rel = verify(Relation(coeffs=coeffs, dps=dps,
                              residual=residual_of(coeffs, dps)))
        if any(target in t.factors for t in coeffs):
            report.relations.append(rel)
            break
        # Relation among library terms only (e.g. pi^2 in library twice):
        # not what we asked about -- drop a term and continue.
        rel.note = (rel.note + "; " if rel.note else "") + \
            "library-only relation (does not involve target)"
        report.relations.append(rel)
        active.remove(max(coeffs, key=active.index))
    report.remaining = active
    return report


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def print_relation(rel, target=None):
    status = "VERIFIED" if rel.verified else "FAILED VERIFICATION"
    print(f"  [{status}] {rel.pretty()}")
    print(f"      coefficient vector : "
          f"{[(t.label, c) for t, c in rel.coeffs.items()]}")
    print(f"      residual @ {rel.dps} digits (+{GUARD_DIGITS} guard) : "
          f"{mp.nstr(rel.residual, 5)}")
    print(f"      residual @ {rel.verify_dps} digits (+{GUARD_DIGITS} guard) : "
          f"{mp.nstr(rel.verify_residual, 5)}")
    linear = target is not None and Term((target,)) in rel.coeffs and \
        all(target not in t.factors or t == Term((target,)) for t in rel.coeffs)
    if linear and rel.verified:
        ct = rel.coeffs[Term((target,))]
        rhs = []
        for t, c in rel.coeffs.items():
            if t == Term((target,)):
                continue
            num, den = -c, ct
            if den < 0:
                num, den = -num, -den
            frac = f"{num}" if den == 1 else f"({num}/{den})"
            rhs.append(f"{frac}*{t.label}")
        print(f"      => {target} = " + " + ".join(rhs))
    if rel.note:
        print(f"      NOTE: {rel.note}")


def print_report(title, report, target=None):
    print("=" * 78)
    print(title)
    print("=" * 78)
    print(f"precision: {report.dps} digits (verification at {2 * report.dps}), "
          f"max |coeff|: {report.maxcoeff}, basis size: {len(report.basis)}")
    print("basis: " + ", ".join(t.label for t in report.basis))
    # Rough detection limit: with n terms and D digits, PSLQ can resolve
    # relations whose coefficients have up to ~D/n digits each.
    n = len(report.basis)
    print(f"(detectable coefficient size ~ 10^{report.dps / n:.1f} "
          f"for a relation using all {n} terms; larger for sparser ones)")
    print()
    if not report.relations:
        print("  No relations found.")
    for rel in report.relations:
        print_relation(rel, target)
    fin = report.final
    if fin is not None:
        if fin.exhausted_steps:
            print("  Search stopped: ran out of PSLQ steps -- INCONCLUSIVE, "
                  "raise --maxsteps.")
        else:
            print(f"  No further relation among the remaining "
                  f"{len(report.remaining)} terms with max |coeff| < "
                  f"{report.maxcoeff} (PSLQ norm bound reached: "
                  f"{fin.norm_bound}).")
    bad = [r for r in report.relations if not r.verified]
    if bad:
        print(f"\n  {len(bad)} candidate(s) evaporated at 2x precision: these "
              f"are numerical coincidences, not discoveries.")
    print()


# ---------------------------------------------------------------------------
# Demo / CLI
# ---------------------------------------------------------------------------

DEMO_CONSTANTS = ["pi", "e", "log2", "zeta3", "catalan", "pi^2", "e^2"]
IDENTIFY_LIBRARY = ["pi", "e", "log2", "log3", "zeta3", "catalan",
                    "euler_gamma", "pi^2"]


def demo(dps, maxcoeff, maxsteps):
    rep = search_relations(DEMO_CONSTANTS, dps, maxcoeff, maxsteps)
    print_report("DEMO 1: relations among pi, e, log2, zeta3, catalan, pi^2, e^2 "
                 "(+ squares, pairwise products, 1)", rep)
    print("  Expected: only the trivial identities pi^2 = (pi)^2 and "
          "e^2 = (e)^2.\n")

    rep = identify("zeta2", IDENTIFY_LIBRARY, dps, maxcoeff, maxsteps)
    print_report("DEMO 2 (positive control): identify 'zeta2' as if it came "
                 "from an experiment", rep, target="zeta2")
    print("  Expected: 6*zeta2 = pi^2.\n")

    rep = identify("impostor", IDENTIFY_LIBRARY, dps, maxcoeff, maxsteps)
    print_report("DEMO 3 (negative control): 'impostor' = 3*pi - 2*log2 + "
                 "10^-150", rep, target="impostor")
    print("  Expected: PSLQ at 100 digits 'finds' impostor = 3*pi - 2*log2, "
          "and\n  2x-precision verification rejects it as a coincidence.\n")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--dps", type=int, default=100,
                    help="search precision in decimal digits (default 100)")
    ap.add_argument("--maxcoeff", type=int, default=1000,
                    help="largest coefficient to search for (default 1000)")
    ap.add_argument("--maxsteps", type=int, default=20000,
                    help="PSLQ iteration cap (default 20000)")
    ap.add_argument("--constants", nargs="+", metavar="NAME",
                    help="run a relation search over these registered constants")
    ap.add_argument("--identify", metavar="NAME",
                    help="try to express this registered constant in terms of "
                         "--library")
    ap.add_argument("--library", nargs="+", metavar="NAME",
                    default=IDENTIFY_LIBRARY,
                    help="known constants used by --identify")
    ap.add_argument("--with-products", action="store_true",
                    help="--identify: also use squares/products of the library "
                         "and target*library terms (catches ratios)")
    ap.add_argument("--list", action="store_true",
                    help="list registered constants")
    args = ap.parse_args(argv)

    if args.list:
        for name in CONSTANTS:
            print(f"{name:14s} {mp.nstr(evaluate([name], 30)[name], 25)}")
        return

    for name in (args.constants or []) + ([args.identify] if args.identify else []) \
            + (args.library if args.identify else []):
        if name not in CONSTANTS:
            sys.exit(f"unknown constant {name!r}; see --list")

    print(f"PSLQ backend: mpmath.pslq (mpmath {__import__('mpmath').__version__})\n")
    if args.identify:
        rep = identify(args.identify, args.library, args.dps, args.maxcoeff,
                       args.maxsteps, squares=args.with_products,
                       products=args.with_products)
        print_report(f"Identify {args.identify}", rep, target=args.identify)
    elif args.constants:
        rep = search_relations(args.constants, args.dps, args.maxcoeff,
                               args.maxsteps)
        print_report("Relation search: " + ", ".join(args.constants), rep)
    else:
        demo(args.dps, args.maxcoeff, args.maxsteps)


if __name__ == "__main__":
    main()
