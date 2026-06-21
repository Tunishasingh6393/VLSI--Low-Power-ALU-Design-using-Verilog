# Simulation Workspace Directory
This directory is designated for holding compilation artifacts and executables from simulator runs.

## Running Simulations via Icarus Verilog:
Navigate here and execute:
```bash
# Compile execution block
iverilog -o alu_sim ../rtl/alu.v ../rtl/adder.v ../tb/alu_tb.v

# Run virtual simulator state
vvp alu_sim
```
This produces a fully readable Value Change Dump (`.vcd`) waveform file outputted to your `../waveforms` folder.
