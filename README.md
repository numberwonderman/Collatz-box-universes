# Collatz Box Universes Explorer Suite

<p align="center">
<img src="assets/Gemini_Generated_Image_36ro5936ro5936ro.png" width="500" alt="Box Universe Logo">
</p>



## **Long-Term Mission Statement**
This project aims to explore and visualize generalized Collatz sequences from novel, multi-dimensional perspectives. Moving beyond single-sequence analysis, the goal is to reveal the intricate tapestry of patterns, behaviors, and relationships that define vast "Box Universes." By providing intuitive, multi-level tools and models (such as 9-nets, 2D parameter slicers, and 3D spatial explorers), this approach seeks to offer a unique "visual intuition" and fresh context for the Collatz problem. 

Through the synthesis of information across different visualization "lenses," the project intends to inspire new hypotheses, facilitate deeper understanding, and unlock insights that no single perspective could reveal alone.

## **The Generalized Collatz Rule**
The core of this project revolves around a generalized Collatz function:  
For any number $n$:  
- If $n \pmod{X} = 0$, then $n \to n/X$  
- Otherwise, $n \to (n \cdot Y) + Z$  

*(The standard Collatz conjecture uses $X=2, Y=3, Z=1$)*

## **Exploring the Box Universe: A Multi-Level Perspective (LOD)**
The suite comprises ten distinct applications designed to provide a unique "Level of Detail" (LOD) for understanding generalized Collatz sequences and their chaotic properties:

### **1. index.html (Quantitative Analysis & Hub)**
* **Focus:** Detailed analysis of individual sequences and central launcher.
* **Key Features:** Interactive 9-net visualization, cycle/divergence detection, and statistical properties including **Standard Deviation** and **$\tau$ (tau)** stopping time metrics.

### **2. chaosSlicer.html (Chaos Slicer: Parameter Sensitivity)**
* **Focus:** Visualizing the transition between periodic orbits and chaotic behavior across parameter ranges.
* **Key Features:** Renders slices of the $X, Y, Z$ space to identify "Sensitivity to Initial Conditions," a hallmark of the chaotic maps defined in the Keçeci Number Systems.

### **3. chaosComparer.html (Chaos Comparer: Comparative Dynamics)**
* **Focus:** Side-by-side comparison of two divergent systems.
* **Key Features:** Real-time visual comparison of how small perturbations in $Z$ or $Y$ lead to hyperchaotic divergence versus stable loops.

### **4. slicer.html (2D Pseudo-3D Slicer)**
* **Focus:** Qualitative comparison of 9-net topologies in a dynamic grid.

### **5. box-universe-fps.html (3D Number Space Explorer)**
* **Focus:** Immersive FPS exploration of the 3D grid where each cube represents a number colored by parity.

### **6. box-universe-viewer.html (3D Rule Space Explorer)**
* **Focus:** Global behavior of different rules applied to a fixed starting number.
* **Key Features:** Visualizes convergence/divergence as a 3D coordinate map of $(X, Y, Z)$.

### **7. collatz-dragon.html (Dragon Explorer)**
* **Focus:** Fractal properties revealed through the binary path of sequence operations.

### **8. collatz-line-explorer.html (Dynamic 3D Trajectory)**
* **Focus:** Animating the 3D geometric progression of a sequence as a vector-based trail.

### **9. radial-animator.html (Radial Animator: Cyclic Visualization)**
* **Focus:** Modular relationships emphasizing orbital cycles and modular "attractors."

### **10. radial-viewer.html (Radial Viewer: Static snapshots)**
* **Focus:** Snapshot views of modular distribution on a circular path.

---

## **Formal Academic Recognition**

> ### **Citation: Keçeci Number Systems**
> This suite’s methodology and visualization frameworks (specifically the 9-net and parameter mapping) are cited and utilized in:
> 
> **Keçeci, M. (2025).** *Characterization of Keçeci Number Systems as Chaotic and Hyperchaotic Maps*. Open Science Articles (OSAs), Volume 1, Issue 1. [DOI: 10.5281/zenodo.16954468]
> 
> **Context (Pages 67–69):** The paper references the **Collatz Box Universes** as a critical toolkit for characterizing non-linear dynamics. It highlights the suite's ability to map transitions between stable states and hyperchaos across 11 distinct algebraic structures.

---

## **Technologies Used**
* **Three.js:** Utilized for all 3D visualizations, enabling complex spatial data representation.
* **MathJax:** For accurate rendering of mathematical formulas within the web environment.
* **Tailwind CSS:** Core styling for structure and interactive glassmorphic UI.
* **Font Awesome:** For scalable and consistent iconography.

## **Research Contribution & Future Directions**
This suite serves as a powerful computational research toolkit for identifying emergent patterns and generating new mathematical conjectures. 

**Future Directions:** * Integration of **BigInt** for arbitrary-precision arithmetic.
* Persistent storage (Firebase) for cataloging discovered "edge cases" and hyperchaotic rulesets.

---
*© 2025 Franklin Loeb. Explore the code on [GitHub](https://github.com/numberwonderman/Collatz-box-universes/).*
