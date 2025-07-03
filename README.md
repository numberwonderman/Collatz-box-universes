Collatz Box Universes: A Multi-Dimensional Exploration
Project Mission
The Collatz Box Universes project is a comprehensive suite of interactive web-based tools designed to explore and visualize generalized Collatz sequences. Our mission is to:

Discover Hidden Patterns: Uncover the intricate, often beautiful, and sometimes chaotic patterns that emerge from variations of the Collatz conjecture.

Foster Intuition: Provide intuitive visual representations that help users grasp the behavior of these complex dynamical systems beyond abstract mathematical notation.

Gain New Perspectives: Offer multiple "lenses" or "Levels of Detail (LOD)" through which to view and analyze sequences, encouraging novel insights and hypotheses.

Promote Visual Discovery: Create a journey of interactive visual discovery, making advanced mathematical concepts accessible and engaging.

The Generalized Collatz Rule
This project focuses on the generalized Collatz function, defined by three integer parameters: X, Y, and Z.

Rule: If n(modX)=0, then n→n/X. Otherwise, n→n⋅Y+Z.

X (Divisor): The number by which n is divided if it's a multiple of X. (Standard Collatz uses X=2)

Y (Multiplier): The number by which n is multiplied if it's not a multiple of X. (Standard Collatz uses Y=3)

Z (Additive Constant): The number added to n⋅Y. (Standard Collatz uses Z=1)

(Note: The classic Collatz conjecture is a special case where X=2, Y=3, and Z=1.)

Visualization Tools (Levels of Detail - LOD)
The project offers a diverse set of visualization tools, each providing a unique perspective on the generalized Collatz sequences:

Main Hub (OG 9-Net / Unfolded Box View) (index.html):

LOD 1: Single Sequence Calculation & 9-Net Visualization: The central hub for calculating and visualizing a single generalized Collatz sequence. It displays the sequence path on a 2D "unfolded box" (9-net) grid, highlighting divisible vs. multiply/add steps.

LOD 2: Bulk Universe Generation: Allows users to define ranges for X, Y, and Z parameters, generating a "Box Universe" of multiple sequences and providing aggregate statistics across the defined parameter space.

Box Universe Viewer (box-universe-viewer.html):

LOD 3: 3D Scatter Plot of Sequences: Visualizes multiple sequences within a 3D space. Each point represents a (X, Y, Z) parameter set, and its color or position can indicate properties like convergence, cycle detection, or total steps. Offers interactive camera controls (orbit).

2D Pseudo-3D Slicer (Unfolded Box) (slicer.html):

LOD 4: Grid of 9-Nets: Displays a grid of multiple 9-net visualizations for a range of (N, X, Y, Z) parameters, allowing for quick visual comparison of sequence behaviors across a parameter slice. Includes a slideshow feature to animate through different parameter sets.

2D Pseudo-3D Slicer (Radial Animator) (radial-animator.html):

LOD 5: Animated Radial Plots: Similar to the 2D Slicer, but visualizes sequences as animated radial plots, showing the flow of numbers around a central point. Useful for observing cyclical patterns and number distribution.

Radial Viewer (radial-viewer.html):

LOD 6: Single Radial Plot with Modulo Visualization: Focuses on a single sequence, plotting numbers on a circle based on their modulo X value. This highlights the distribution of numbers across the congruence classes defined by X, offering insight into the "remainder" behavior.

Box Universe FPS (3D Slicer) (box-universe-fps.html):

LOD 7: First-Person Exploration of 3D Space: Allows users to "walk through" the 3D parameter space (X, Y, Z coordinates) like a first-person game. Each point in the space might represent a Collatz rule, and interaction could trigger a visualization or display properties of that rule.

Collatz Dragon Explorer (collatz-dragon.html):

LOD 8: Fractal Dragon Curve Visualization: Adapts the concept of the Dragon Curve fractal to the Collatz sequence. Each step in the sequence (or each type of operation) dictates a turn, generating a unique fractal pattern that visualizes the sequence's path.

Collatz Line Universe Explorer (collatz-lines-explorer.html):

LOD 9: Line Graph Visualization: Presents sequences as traditional line graphs, showing the value of n over steps. This familiar representation allows for easy observation of growth, decay, and overall trajectory.

Technologies Used
HTML5: Structure and content.

Tailwind CSS: Utility-first CSS framework for rapid and responsive styling.

JavaScript (ES6+): Core logic for Collatz calculations, canvas drawing, UI interactions, and data processing.

HTML Canvas API: For 2D visualizations (9-nets, radial plots, line graphs).

Three.js: (Planned/Integrated for 3D visualizations like Box Universe Viewer and FPS Slicer).

MathJax: For rendering mathematical notation (LaTeX) directly in the browser.

Font Awesome: For scalable vector icons.

AI-Assisted Development (Gemini): Leveraged for code generation, algorithm refinement, and accelerating the development process.

How to Run
Clone the repository (or download the project files).

Open index.html in your web browser.

Navigate through the different visualization tools using the provided links.

Future Enhancements (Ideas)
Performance Optimizations: For very large bulk generations or complex 3D scenes.

Data Export: Allow users to export sequence data or visualization images.

Interactive Controls: More granular control over visualization parameters (e.g., animation speed, node sizing based on value).

User History Persistence: Save calculation history across sessions.

More Advanced Statistical Analysis: Implement and visualize additional Collatz-specific metrics.

Search/Filter Functionality: For quickly finding specific sequences in bulk views.

Accessibility Improvements: Ensure all interactive elements are keyboard-navigable and screen-reader friendly.

Mobile Responsiveness Refinements: Further optimization for diverse mobile devices.

This README.md provides a comprehensive overview of your project, its purpose, the underlying math, and the various tools you've built. It also transparently mentions the use of AI-assisted development.
