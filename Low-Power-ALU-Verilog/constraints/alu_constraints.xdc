# Low-Power-ALU-Verilog/constraints/alu_constraints.xdc
# ----------------------------------------------------
# FPGA Master Constraint File (for Arty A7-35T Board)
# Specifies 100MHz clock rate, slide switch inputs and LED indicators.
# ----------------------------------------------------

## Master System Clock (100 MHz oscillator)
set_property -dict { PACKAGE_PIN E3    IOSTANDARD LVCMOS33 } [get_ports { clk }];
create_clock -add -name sys_clk_pin -period 10.00 -waveform {0 5} [get_ports { clk }];

## Asynchronous reset pin (CPU RESET Pushbutton button, active low)
set_property -dict { PACKAGE_PIN C2    IOSTANDARD LVCMOS33 } [get_ports { rst_n }];

## Clock-enable register switch (Slide Switch SW[0])
set_property -dict { PACKAGE_PIN A8    IOSTANDARD LVCMOS33 } [get_ports { en }];

## Low Power Mode multiplier switch (Slide Switch SW[1])
set_property -dict { PACKAGE_PIN C11   IOSTANDARD LVCMOS33 } [get_ports { lp_mode }];

## Instruction Opcodes (Slide Switches SW[5:2])
set_property -dict { PACKAGE_PIN C10   IOSTANDARD LVCMOS33 } [get_ports { OPC[0] }];
set_property -dict { PACKAGE_PIN A10   IOSTANDARD LVCMOS33 } [get_ports { OPC[1] }];
set_property -dict { PACKAGE_PIN B9    IOSTANDARD LVCMOS33 } [get_ports { OPC[2] }];
set_property -dict { PACKAGE_PIN B8    IOSTANDARD LVCMOS33 } [get_ports { OPC[3] }];

## Input variables lower indices switches mapped to SW[7:6] 
set_property -dict { PACKAGE_PIN D11   IOSTANDARD LVCMOS33 } [get_ports { A[0] }];
set_property -dict { PACKAGE_PIN C12   IOSTANDARD LVCMOS33 } [get_ports { B[0] }];

## Output LEDs registers (Green LEDs LED[3:0] for result registers)
set_property -dict { PACKAGE_PIN H5    IOSTANDARD LVCMOS33 } [get_ports { Y[0] }];
set_property -dict { PACKAGE_PIN J5    IOSTANDARD LVCMOS33 } [get_ports { Y[1] }];
set_property -dict { PACKAGE_PIN T9    IOSTANDARD LVCMOS33 } [get_ports { Y[2] }];
set_property -dict { PACKAGE_PIN T10   IOSTANDARD LVCMOS33 } [get_ports { Y[3] }];

## Registered hardware silicon statuses flags (LEDs [7:4])
set_property -dict { PACKAGE_PIN F6    IOSTANDARD LVCMOS33 } [get_ports { Z }]; # Zero flag LED (G)
set_property -dict { PACKAGE_PIN G6    IOSTANDARD LVCMOS33 } [get_ports { N }]; # Negative flag LED (G)
set_property -dict { PACKAGE_PIN G4    IOSTANDARD LVCMOS33 } [get_ports { C }]; # Carry-out flag LED (G)
set_property -dict { PACKAGE_PIN G3    IOSTANDARD LVCMOS33 } [get_ports { V }]; # Overflow flag LED (G)

## Synthesis & Power optimization directives
set_power_opt -cell_types {register} -include_clocks [all_clocks]
set_property BLOCK_SYNTH.POWER_OPTS_REGISTER_CLOCK_GATING 1 [current_design]
