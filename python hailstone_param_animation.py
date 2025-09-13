
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation

# Generalized Collatz (hailstone) sequence generator
def generalized_collatz(n, divisor, multiplier, adder, max_len=1000):
    seq = [n]
    while n != 1 and len(seq) < max_len:
        if n % 2 == 0:
            n = n // divisor
        else:
            n = n * multiplier + adder
        seq.append(n)
    return seq

# Animation parameters and defaults
start_n = 27
divisor = 2
adder = 1
multiplier_values = np.linspace(2, 5, 60)  # Multiplier varies from 2 to 5

fig, ax = plt.subplots()
line, = ax.plot([], [], lw=2)
title = ax.text(0.5, 1.05, '', transform=ax.transAxes, ha='center')

# Initialization function for animation
def init():
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 500)
    line.set_data([], [])
    title.set_text('')
    return line, title

# Update function called for each frame of animation
def update(frame):
    multiplier = multiplier_values[frame]
    seq = generalized_collatz(start_n, divisor, multiplier, adder)
    x = np.arange(len(seq))
    y = seq
    line.set_data(x, y)
    ax.set_xlim(0, max(100, len(seq)))
    ax.set_ylim(0, max(y) + 10)
    title.set_text(f'Hailstone sequence with multiplier={multiplier:.2f}')
    return line, title

ani = FuncAnimation(fig, update, frames=len(multiplier_values),
                    init_func=init, blit=True, interval=100)

plt.show()
