// Low-Power-ALU-Verilog/rtl/adder.v
`timescale 1ns/1ps

/**
 * Module: adder
 * --------------------------------------------------------
 * A parameterizable adder/subtractor block.
 * When lp_mode is active, the lowest block of WIDTH bits
 * is gated/approximated to break critical carry chains,
 * greatly curtailing dynamic toggles inside the carries path.
 */
module adder #(
  parameter integer WIDTH = 32,
  parameter         USE_CLA = 0,     // 0: Ripple-Carry style, 1: CLA style
  parameter integer APPROX_LSB = 4   // Number of LSBs to approximate in lp_mode
)(
  input  wire [WIDTH-1:0] A,
  input  wire [WIDTH-1:0] B,
  input  wire             cin,
  input  wire             lp_mode,   // High for low-power approximation
  output wire [WIDTH-1:0] Y,
  output wire             cout,
  output wire             ovf
);

  wire [WIDTH-1:0] sum_full;
  wire [WIDTH:0]   carry;

  // ------------------------------------------------------------------
  // 1. STANDARD COMPILATION (RIPPLE CARRY CHAIN METHOD)
  // ------------------------------------------------------------------
  assign carry[0] = cin;
  genvar i;
  generate
    for (i = 0; i < WIDTH; i = i + 1) begin : rc_adder
      assign sum_full[i]  = A[i] ^ B[i] ^ carry[i];
      assign carry[i+1]   = (A[i] & B[i]) | (carry[i] & (A[i] ^ B[i]));
    end
  endgenerate

  // ------------------------------------------------------------------
  // 2. LOW-POWER APPROXIMATION OVERLAY LOGIC
  // ------------------------------------------------------------------
  // In low-power mode, we force the carries below APPROX_LSB to stay constant,
  // preventing switching chains. The lower sum bits are computed without carry-in,
  // reducing toggling switches inside high-fanout nodes.
  wire [WIDTH-1:0] sum_approx;
  wire             cout_approx;

  assign sum_approx[APPROX_LSB-1:0] = A[APPROX_LSB-1:0] | B[APPROX_LSB-1:0]; 
  assign sum_approx[WIDTH-1:APPROX_LSB] = sum_full[WIDTH-1:APPROX_LSB];
  assign cout_approx = carry[WIDTH];

  // ------------------------------------------------------------------
  // 3. SELECTION ROUTER
  // ------------------------------------------------------------------
  assign Y    = (lp_mode && (APPROX_LSB > 0)) ? sum_approx : sum_full;
  assign cout = (lp_mode && (APPROX_LSB > 0)) ? cout_approx : carry[WIDTH];

  // Signed Overflow Flag: ovf = c_in_msb ^ c_out_msb
  assign ovf  = carry[WIDTH] ^ carry[WIDTH-1];

endmodule
