"""
vasilyev_plots.py — two figures for Vasilyev's maps (arXiv:2611.10311).

    python3 vasilyev_plots.py [output_dir]

1. vasilyev_S1_orbits_and_cycle.png   — S={1}: the paper's orbit of 7, how long every
   start n < 3000 takes to reach the cycle (1,2,3,5,8), and the longest of those orbits.
2. vasilyev_collatz_vs_S1.png         — S={} (ordinary Collatz, halvings merged) against S={1}.

Everything plotted is computed here from vasilyev_maps.py; nothing is typed in by hand.
"""
import sys
from math import log2

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from vasilyev_maps import orbit, step_kind, normalize_S

BLUE, ORANGE = "#2a78d6", "#eb6834"          # S={} / S={1}; fixed per map in both figures
INK, INK2, GRID, SURFACE = "#0b0b0b", "#52514e", "#dddcd6", "#fcfcfb"
N_MAX = 3000

plt.rcParams.update({
    "font.size": 15, "axes.titlesize": 17, "axes.titleweight": "bold", "axes.labelsize": 15,
    "axes.edgecolor": INK2, "axes.labelcolor": INK, "text.color": INK,
    "xtick.color": INK2, "ytick.color": INK2, "figure.facecolor": SURFACE, "axes.facecolor": SURFACE,
    "axes.spines.top": False, "axes.spines.right": False, "axes.grid": True,
    "grid.color": GRID, "grid.linewidth": 0.8, "axes.titlelocation": "left",
})


def tails(S):
    """steps needed to first reach the cycle, for every start 1 <= n < N_MAX"""
    return [len(orbit(n, S, max_steps=500_000).tail) for n in range(1, N_MAX)]


def fig_S1(path):
    S = {1}
    fig = plt.figure(figsize=(15, 15))
    gs = fig.add_gridspec(3, 1, height_ratios=[1.15, 1, 1], hspace=0.42)

    # A — the example orbit from the paper, every value labelled
    ax = fig.add_subplot(gs[0])
    o = orbit(7, S)
    seq = o.sequence + [o.sequence[o.cycle_start]]          # show the return to 1
    xs = range(len(seq))
    cs = o.cycle_start
    ax.axvspan(cs - 0.5, len(seq) - 0.5, color=ORANGE, alpha=0.12, lw=0)
    ax.plot(xs, seq, color=ORANGE, lw=2, marker="o", ms=8, mec=SURFACE, mew=1.5)
    for i, v in enumerate(seq):
        ax.annotate(str(v), (i, v), textcoords="offset points", xytext=(0, 11), ha="center",
                    fontsize=13, color=INK)
    ax.set_yscale("log", base=2)
    ax.set_ylim(0.6, 2200)
    ax.set_xticks(range(0, len(seq), 2))
    ax.set_xlabel("step")
    ax.set_ylabel("value (log scale)")
    ax.set_title("S = {1}: orbit of 7 falls into the cycle (1, 2, 3, 5, 8)")
    ax.text(cs - 0.3, 900, "cycle (1, 2, 3, 5, 8)", fontsize=14, color=INK, va="center")
    kinds = [step_kind(v, normalize_S(S)) for v in seq[:-1]]
    ax.text(0.0, -0.27, "rule used at each step:  " + " ".join(
        {"odd": "O", "up": "U", "down": "D"}[k] for k in kinds) +
        "     (O: odd, (3x+1)/2   U: one factor of 2, 3x/2   D: strip all 2s)",
        transform=ax.transAxes, fontsize=12.5, color=INK2)

    # B — how long each start takes to reach the cycle
    ax = fig.add_subplot(gs[1])
    t = tails(S)
    ax.scatter(range(1, N_MAX), [max(v, 0.7) for v in t], s=9, color=ORANGE, alpha=0.75, lw=0)
    ax.set_yscale("log")
    ax.set_ylim(0.5, max(t) * 6)
    ax.set_xlabel(f"start n  (every n from 1 to {N_MAX - 1})")
    ax.set_ylabel("steps to reach the cycle")
    worst = max(range(len(t)), key=t.__getitem__) + 1
    ax.set_title(f"S = {{1}}: most starts arrive fast, a few take thousands of steps")
    ax.annotate(f"n = {worst}: {t[worst - 1]:,} steps", (worst, t[worst - 1]), xytext=(-18, 6),
                textcoords="offset points", ha="right", va="center", fontsize=14, color=INK)
    srt = sorted(t)
    ax.text(0.01, 0.93, f"median {srt[len(srt) // 2]} steps;  {sum(v > 1000 for v in t)} of "
            f"{len(t):,} starts need more than 1,000", transform=ax.transAxes, fontsize=14, color=INK, va="top")

    # C — the longest of those orbits
    ax = fig.add_subplot(gs[2])
    o = orbit(worst, S, max_steps=500_000)
    bits = [log2(v) for v in o.sequence]
    ax.plot(range(len(bits)), bits, color=ORANGE, lw=1.2)
    pk = max(range(len(bits)), key=bits.__getitem__)
    ax.annotate(f"peak: a {o.sequence[pk].bit_length()}-bit number at step {pk:,}", (pk, bits[pk]),
                xytext=(0, 12), textcoords="offset points", fontsize=14, color=INK, ha="center")
    ax.set_xlabel("step")
    ax.set_ylabel("size of value (bits, log2)")
    ax.set_ylim(0, max(bits) * 1.2)
    ax.set_title(f"S = {{1}}: orbit of {worst} climbs for thousands of steps, then returns to the cycle")
    fig.savefig(path, dpi=110, bbox_inches="tight")
    plt.close(fig)
    return {"worst_start": worst, "worst_steps": t[worst - 1], "peak_bits": o.sequence[pk].bit_length(),
            "median": srt[len(srt) // 2], "over_1000": sum(v > 1000 for v in t)}


def fig_compare(path):
    fig = plt.figure(figsize=(15, 13.5))
    gs = fig.add_gridspec(2, 2, height_ratios=[1.1, 1], hspace=0.38, wspace=0.08)

    # A — the same start under both maps
    ax = fig.add_subplot(gs[0, :])
    info = {}
    for S, color, name in ((set(), BLUE, "S = {}  (ordinary Collatz, halvings merged)"), ({1}, ORANGE, "S = {1}")):
        o = orbit(27, S)
        seq = o.sequence[: o.cycle_start + len(o.cycle) + 1]
        ax.plot(range(len(seq)), seq, color=color, lw=2, label=name)
        ax.plot([o.cycle_start], [seq[o.cycle_start]], marker="o", ms=10, color=color, mec=SURFACE, mew=2)
        info[name] = (o.cycle_start, max(seq), o.cycle)
    ax.set_yscale("log", base=2)
    ax.set_xlabel("step")
    ax.set_ylabel("value (log scale)")
    ax.set_title("Same start, n = 27, under both maps")
    (c0, m0, cy0), (c1, m1, cy1) = info.values()
    ax.annotate(f"S = {{}}: reaches cycle {cy0}\nafter {c0} steps, peak {m0:,}", (c0, 1), xytext=(-14, 4),
                textcoords="offset points", fontsize=14, color=INK, ha="right", va="bottom")
    ax.annotate(f"S = {{1}}: reaches cycle {cy1}\nafter {c1} steps, peak {m1:,}", (c1 + 4, 3), xytext=(14, 0),
                textcoords="offset points", fontsize=14, color=INK, ha="left", va="center")
    ax.set_ylim(0.7, m0 * 6)
    ax.legend(frameon=False, loc="upper left", fontsize=14)

    # B — steps to reach the cycle, small multiples on one shared axis
    data = [(set(), BLUE, "S = {}: cycle (1, 2)"), ({1}, ORANGE, "S = {1}: cycle (1, 2, 3, 5, 8)")]
    ts = [tails(S) for S, _, _ in data]
    top = max(max(t) for t in ts) * 2.2
    first = None
    for i, ((S, color, name), t) in enumerate(zip(data, ts)):
        ax = fig.add_subplot(gs[1, i], sharey=first)
        first = first or ax
        ax.scatter(range(1, N_MAX), [max(v, 0.7) for v in t], s=9, color=color, alpha=0.75, lw=0)
        ax.set_yscale("log")
        ax.set_ylim(0.5, top)
        ax.set_xlabel(f"start n  (1 to {N_MAX - 1})")
        ax.set_title(name)
        srt = sorted(t)
        ax.text(0.03, 0.95, f"median {srt[len(srt) // 2]} steps\nlongest {max(t):,} steps (n = {t.index(max(t)) + 1})",
                transform=ax.transAxes, fontsize=14, color=INK, va="top")
        if i == 0:
            ax.set_ylabel("steps to reach the cycle (same scale)")
        else:
            plt.setp(ax.get_yticklabels(), visible=False)
        info[name] = (srt[len(srt) // 2], max(t), t.index(max(t)) + 1)
    fig.savefig(path, dpi=110, bbox_inches="tight")
    plt.close(fig)
    return info


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "vasilyev_results"
    print(fig_S1(f"{out}/vasilyev_S1_orbits_and_cycle.png"))
    print(fig_compare(f"{out}/vasilyev_collatz_vs_S1.png"))
