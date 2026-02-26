Collatz Box Universes Explorer Suite
![My bvox universe ogo](assets/Gemini_Generated_Image_36ro5936ro5936ro.png)
A Multi-Dimensional Toolkit for Experimental Mathematics
Long-Term Mission Statement
This project explores and visualizes generalized Collatz sequences and Keçeci Number Systems through novel, multi-dimensional perspectives. Moving beyond single-sequence analysis, the goal is to reveal the intricate tapestry of patterns, behaviors, and relationships that define vast "Box Universes." By synthesizing information across ten distinct visualization "lenses," this suite offers a unique visual intuition for the "Butterfly Effect" in iterative arithmetic systems, facilitating deeper hypotheses and unlocking insights into the nature of mathematical chaos.

The Mathematical Foundation
The suite is built upon two core iterative frameworks:
1. Generalized Collatz Rule
For any number $n$:
If $n \pmod X = 0$, then $n \to n/X$
Otherwise, $n \to (n \cdot Y) + Z$
(Standard Collatz: $X=2, Y=3, Z=1$)
2. Keçeci Number System (Keçeci Map)
A deterministic, piecewise map where the trajectory is determined by addition, conditional division, and primality.
Rule A (Standard): Focuses on even/odd parity and prime-contingent growth ($n \cdot 3$).
Rule B (Alternative): A hyperchaotic variant utilizing $n \cdot 1.5$ and prime-contingent transformations ($n \cdot 2 + 1$).

Exploring the Box Universe: The 10-App LOD Suite
The suite utilizes a Level of Detail (LOD) approach, allowing researchers to scale from granular sequence metrics to macroscopic rule-space mapping.
I. The Core Launchpad
index.html (Box Universe Explorer: The Launchpad)
Focus: The central hub for high-precision sequence generation, 9-net visualization, and statistical property analysis (Mean, StdDev, Max/Min).
Role: Serves as the primary analytical tool for individual generalized Collatz sequences.
II. Sensitivity & Chaos Analysis (The "Butterfly Effect" Lenses)
chaos-slicer.html (Chaos Slicer: Comparative Dynamics)
Focus: Bridging different iterative systems (Collatz vs. Keçeci) through 3D spatial modeling.
Academic Anchor: Directly implements the logic from pages 67–69 of the Keçeci research. It visualizes the "Butterfly Effect" by plotting sequence divergence in a 3D Three.js cloud.
Key Benchmark: Validates the divergence of $n_1=6$ and $n_2=7$ under Rule B, showcasing a rapid departure in trajectory within 201 steps.
chaos-comparer.html (Chaos Comparer: Sensitivity Analysis)
Focus: Quantifying the "point of departure" between two near-identical starting values.
Key Features: Uses logarithmic y-axis scaling to handle the extreme value spikes characteristic of 3n+1 systems. It calculates the First Divergence Step and Cumulative Distance to measure chaotic intensity.
III. Immersive 3D Exploration
box-universe-fps.html (Box Universe FPS: 3D Number Space)
Focus: Immersive "first-person" exploration of the 3D number space for a single rule.
Key Features: FPS camera controls allow users to fly through a 3D grid where cubes are colored by parity; sequence paths are highlighted as light-trails through the grid.
box-universe-viewer.html (Box Universe Viewer: 3D Rule Space)
Focus: Global behavior mapping of different rulesets $(X, Y, Z)$ for a fixed starting number.
Key Features: Renders a "Rule Universe" where each cube's position is a unique rule, color-coded by its final state (Convergence, Cycle, or Divergence).
collatz-line-explorer.html (Line Universe: 3D Trajectory)
Focus: Visualizing the geometric progression of a sequence as an evolving animated 3D line.
IV. Qualitative & Fractal Mapping
collatz-dragon.html (Collatz Dragon Explorer: Directional Mapper)
Focus: Reveals hidden fractal properties by transforming binary sequence operations (divisible vs. multiply/add) into a 2D Dragon Curve.
slicer.html (2D Pseudo-3D Slicer: Qualitative Exploration)
Focus: Systematic comparison of multiple rules via a dynamic grid or slideshow of 9-net visualizations.
V. Modular & Cyclic Analysis
radial-animator.html (Radial Animator: Dynamic Cycles)
Focus: Animating sequences as a radial graph to emphasize modular relationships ($n \pmod X$).
radial-viewer.html (Radial Viewer: Static Snapshots)
Focus: Providing a static modular distribution snapshot to identify repeating cycles or "Strange Attractors."

Technical Architecture
Rendering: Three.js (3D Visualizations) and HTML5 Canvas (2D Fractals/Graphs).
Mathematics: MathJax for LaTeX-rendered formulas; Logarithmic scaling for chaos metrics.
Styling: Tailwind CSS for a responsive, dark-mode research interface.
Logic: Native JavaScript (ES6+) with optimized loops for high-iteration primality testing.
Research Contribution
This suite serves as a computational bridge between traditional number theory and nonlinear dynamics. By providing the tools to visualize the Keçeci Number System, the suite facilitates the identification of:
Emergent Patterns: Spotting anomalies in rule-space that static analysis misses.
Hyperchaotic Signatures: Identifying sequences that exhibit extreme sensitivity to initial conditions.
Modular Symmetry: Visualizing how different "Box Universes" collapse into predictable cycles or diverge into infinity.
Academic Reference
Keçeci, M. (2025). Characterization of Keçeci Number Systems as Chaotic and Hyperchaotic Maps. Open Science Articles (OSAs), Volume 1, Issue 1. [https://doi.org/10.5281/zenodo.16954468]

