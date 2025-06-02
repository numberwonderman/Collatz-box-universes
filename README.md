# Collatz-box-universesBox Universe Explorer

## Long-Term Mission Statement

This project aims to explore and visualize generalized Collatz sequences from novel, multi-dimensional perspectives. Moving beyond single-sequence analysis, the goal is to reveal the intricate tapestry of patterns, behaviors, and relationships that define vast "Box Universes." By providing intuitive, multi-level tools and models (like 9-nets, 2D parameter slicers, and 3D spatial explorers), this approach seeks to offer a unique "visual intuition" and fresh context for the Collatz problem. Through the synthesis of information across different visualization "lenses," the project intends to inspire new hypotheses, facilitate deeper understanding, and unlock insights that no single perspective could reveal alone.

## Key Features

Your Box Universe Explorer is composed of **three primary applications**, each designed to provide a distinct and complementary approach to understanding generalized Collatz sequences:

### index.html (Box Universe Explorer - Quantitative Analysis Tool & Launchpad)

This application serves as the central hub for defining and launching explorations into specific Box Universes, and for the detailed, step-by-step examination of single sequences.

* **Customizable Generalized Collatz Rules:** Input specific parameters for N (starting number), X (divisor), Y (multiplier), and Z (adder) to define your unique Box Universe.
* **Classic Collatz Quick Access (Planned):** Visual indicator or button to quickly set parameters to the classic Collatz (N, X=2, Y=3, Z=1) for easy exploration.
* **Step-by-Step Sequence Generation:** Observe the exact numerical progression of the sequence, step by step, as it evolves.
* **Interactive 9-Net Visualization:** A dynamic 3x3 grid (the "9-net") visually represents the sequence, with each square corresponding to a step.
* **Color-Coded Steps:** Distinguish between "divisible" steps (N/X) and "multiply-add" steps (N*Y+Z) for immediate qualitative insight into the rule applied.
* **Number Truncation:** Large numbers within the 9-net squares are gracefully truncated with an ellipsis (...) for readability, while retaining their full value in the sequence history.
* **Sequence History Display:** A comprehensive list of all numbers generated in the sequence, up to convergence or a defined limit.
* **Cycle Detection:** Automatically identifies and highlights if and when a sequence enters a cycle.
* **Number.MAX_SAFE_INTEGER Safety Barrier:** Prevents calculations from exceeding JavaScript's safe integer limit, ensuring data integrity.
* **Customizable Colors:** Personalize the colors for divisible and multiply-add steps to suit your visual preferences.
* **Launchers for 2D & 3D Explorers:** Provides direct links to `slicer.html` and `slicer3d.html`, passing defined parameters for seamless transition.

### slicer.html (2D Pseudo-3D Slicer - Qualitative Exploration Tool)

This application provides a dynamic, multi-view approach to exploring the vast parameter space of Box Universes in 2D, helping to build visual intuition and identify broad patterns across rulesets.

* **Multi-Universe Display:** Simultaneously visualize multiple 9-nets based on user-defined ranges for N, X, Y, and Z. Each 9-net represents a distinct ruleset or parameter combination.
* **Parameter Range Filtering:** Define specific minimum and maximum values for N, X, Y, and Z to focus your exploration on particular regions of the parameter space.
* **Dynamic Slideshow Exploration:** Animate through the parameter space by continuously varying one chosen parameter (N, X, Y, or Z) while holding others constant.
* **Adjustable Playback Speed:** Control the pace of the animation to observe changes at your preferred rate.
* **Axis Selection:** Easily switch which parameter is being animated to explore different dimensions of the Box Universe space.
* **Visual Pattern Recognition:** Designed to help users quickly identify visual trends, similarities, and anomalies across many Box Universes as parameters change.
* **Classic Collatz Ruleset Marker (Planned):** Visually highlight the cell or 9-net corresponding to the classic Collatz (X=2, Y=3, Z=1) for easy identification.
* **Clear 9-Net Presentation:** Each 9-net maintains the color-coding and number truncation features for consistent visual cues.
* **Customizable Colors:** Personalize the colors for divisible and multiply-add steps.

### slicer3d.html (3D Box Universe Explorer - Multi-Level Intuition Tool)

This application offers a dynamic, interactive 3D visualization of the Box Universe, designed for exploring both the parameter space of rulesets and the spatial relationships of numbers within specific sequences, utilizing a Level of Detail (LOD) approach.

---
**Note on Features:** The `slicer3d.html` is under active development. Some features described below are conceptual or planned for future implementation, representing the long-term vision for this powerful tool.
---

**Core Capabilities (Currently Implemented):**

* **3D Number Grid Visualization:** Renders a generalized Box Universe as a 3D grid of cubes, where each cube represents a unique number based on its X, Y, Z coordinates.
* **Generalized Collatz Logic Integration:** Calculates and applies Collatz sequences based on user-defined (or URL-passed) X, Y, Z rule parameters.
* **URL Parameter Initialization:** Dynamically configures the initial 3D view (N, X, Y, Z rules, slice axis, slice value, animation speed) directly from URL parameters.
* **Interactive Sequence Path Animation:** When a number-cube is clicked, its Collatz sequence path is highlighted and animated through the 3D grid, revealing its trajectory.
* **3D Slicing Functionality:** Allows users to interactively slice the 3D view along X, Y, or Z axes, revealing specific layers of the Box Universe.
* **Intuitive Camera Controls:** Utilizes OrbitControls for seamless rotation, panning, and zooming of the 3D scene.
* **"Reset View" Functionality:** A button to easily reset the camera, slicing, and clear any active sequence paths.
* **"Share Link" Feature:** Generates and copies a URL that captures the current 3D view parameters, enabling easy sharing of specific explorations.
* **Basic Responsiveness:** Designed to adapt to different screen sizes.
* **On-Screen Parameter Display:** Shows current N, X, Y, Z rules, animation speed, and slice values directly in the UI.

**Planned Features / Conceptual Design (Level of Detail - LOD):**

This section outlines the vision for how `slicer3d.html` will evolve to support multi-level exploration, managing complexity and optimizing performance.

* **Hierarchical Exploration with LOD:**
    * **Level 1 (Zoomed-Out / Ruleset Grid):** The primary view would display a 3D grid where **each cube represents a unique set of Collatz rules (a specific X, Y, Z combination)**.
        * **Behavioral Coloring (Planned):** The color of these "ruleset cubes" would visually encode the *overall behavior* of sequences under that ruleset (e.g., green for convergence, red for divergence, blue for cycles). This provides immediate, high-level insight into the parameter space.
        * **Classic Collatz Marker (Planned):** The cube corresponding to the classic Collatz ruleset (X=2, Y=3, Z=1) would be uniquely highlighted (e.g., with a gold color or a star icon) for easy identification.
    * **Level 2 (Zoomed-In / Number Grid):** Upon selecting/clicking a "ruleset cube" from Level 1, the visualization would transition to a detailed view, which is essentially the **current functionality of `slicer3d.html`**: a 3D grid where **each cube represents a specific *number***. This allows for in-depth examination of sequences under the *chosen ruleset*.
        * **Data-Driven Coloring (Planned):** Within this zoomed-in view, the color of *individual number cubes* would represent properties specific to that number's sequence (e.g., parity patterns, sequence length, maximum value reached).
* **Advanced Deep-Linking & Interaction (Planned):**
    * **Direct Ruleset Highlight:** URL parameters could directly highlight a specific "ruleset cube" in the Level 1 view upon page load.
    * **Auto-Sequence Animation:** URL parameters could automatically trigger the sequence animation for a specified number-cube within the Level 2 view upon page load, facilitating sharing of specific discoveries.
* **Performance Optimization (via LOD):** The LOD strategy ensures that detailed sequence calculations and rendering are only performed when a specific ruleset is selected and explored, preventing performance bottlenecks when viewing the vast ruleset parameter space.