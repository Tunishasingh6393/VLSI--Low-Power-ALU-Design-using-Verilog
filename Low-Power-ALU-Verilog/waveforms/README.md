# Waveforms Directory
Stores Value Change Dump (`.vcd`) simulation dumps reflecting registered transitions at physical pin levels.

## Visualizing waveforms:
You can open any exported `.vcd` files inside GTKWave or online trace viewers.
Add relevant pins to focus on:
- `clk`: Clock signal toggles
- `en`: Clock enable transitions
- `lp_mode`: Multiplexer gating level triggers
- `A / B [31:0]`: Standard signal levels
- `Y [31:0]`: Output registers results
