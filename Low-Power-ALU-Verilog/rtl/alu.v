// Low-Power-ALU-Verilog/rtl/alu.v
`timescale 1ns/1ps

/**
 * Module: alu
 * --------------------------------------------------------
 * A parameterizable 8/16/32-bit Arithmetic Logic Unit (ALU)
 * featuring low-power microarchitectural strategies:
 * 1. RTL Clock Gating (Clock-Enable 'en' registers)
 * 2. Operand Isolation (gating unused modules inputs to zero)
 * 3. Dynamic Low-Power Mode ('lp_mode' shifter / adder approximation)
 */
module alu #(
  parameter integer WIDTH = 32,
  parameter         USE_CLA = 0,      // 0: Ripple Carry Adder, 1: Carry Lookahead
  parameter integer APPROX_LSB = 4    // N > 0: approximate N LSBs in low-power mode
)(
  input  wire                  clk,       // System clock
  input  wire                  rst_n,     // Active-low asynchronous reset
  input  wire                  en,        // Clock-enable (RTL Clock Gating hook)
  input  wire                  lp_mode,   // Low-power mode control switch
  input  wire [WIDTH-1:0]      A,         // Input Operand A
  input  wire [WIDTH-1:0]      B,         // Input Operand B
  input  wire [3:0]            OPC,       // 4-bit Opcode specifying the target operation
  output reg  [WIDTH-1:0]      Y,         // Registered output Result
  output reg                   Z,         // Zero Flag
  output reg                   N,         // Negative/Sign Flag
  output reg                   C,         // Carry Out Flag
  output reg                   V          // Overflow Flag
);

  // ------------------------------------------------------------------
  // 1. OPCODE DECODER (One-hot control signal generation)
  // ------------------------------------------------------------------
  wire do_add  = (OPC == 4'b0000);
  wire do_sub  = (OPC == 4'b0001);
  wire do_and  = (OPC == 4'b0010);
  wire do_or   = (OPC == 4'b0011);
  wire do_xor  = (OPC == 4'b0100);
  wire do_nor  = (OPC == 4'b0101);
  wire do_sll  = (OPC == 4'b0110);
  wire do_srl  = (OPC == 4'b0111);
  wire do_sra  = (OPC == 4'b1000);
  wire do_slt  = (OPC == 4'b1001);
  wire do_a    = (OPC == 4'b1010);
  wire do_b    = (OPC == 4'b1011);

  // ------------------------------------------------------------------
  // 2. OPERAND ISOLATION LOGIC
  // ------------------------------------------------------------------
  // Prevents dynamic node switching inside idle execution logic blocks
  // by masking their incoming inputs to fixed zeros when inactive.
  wire [WIDTH-1:0] A_add = (do_add | do_sub) ? A : {WIDTH{1'b0}};
  wire [WIDTH-1:0] B_add = (do_add | do_sub) ? B : {WIDTH{1'b0}};
  
  wire [WIDTH-1:0] A_log = (do_and | do_or | do_xor | do_nor) ? A : {WIDTH{1'b0}};
  wire [WIDTH-1:0] B_log = (do_and | do_or | do_xor | do_nor) ? B : {WIDTH{1'b0}};
  
  wire [WIDTH-1:0] A_sh  = (do_sll | do_srl | do_sra) ? A : {WIDTH{1'b0}};
  wire [WIDTH-1:0] B_sh  = (do_sll | do_srl | do_sra) ? B : {WIDTH{1'b0}};

  // ------------------------------------------------------------------
  // 3. ARITHMETIC UNIT (ADDER / SUBTRACTOR)
  // ------------------------------------------------------------------
  wire [WIDTH-1:0] addB = do_sub ? ~B_add : B_add;
  wire             cin  = do_sub ? 1'b1   : 1'b0;

  wire [WIDTH-1:0] sum;
  wire             cout;
  wire             v_of;

  // Pluggable and scalable adder sub-module
  adder #(
    .WIDTH(WIDTH),
    .USE_CLA(USE_CLA),
    .APPROX_LSB(APPROX_LSB)
  ) u_adder (
    .A(A_add),
    .B(addB),
    .cin(cin),
    .lp_mode(lp_mode),
    .Y(sum),
    .cout(cout),
    .ovf(v_of)
  );

  // ------------------------------------------------------------------
  // 4. LOGICAL GATE BLOCK
  // ------------------------------------------------------------------
  wire [WIDTH-1:0] y_and = A_log & B_log;
  wire [WIDTH-1:0] y_or  = A_log | B_log;
  wire [WIDTH-1:0] y_xor = A_log ^ B_log;
  wire [WIDTH-1:0] y_nor = ~(A_log | B_log);

  // ------------------------------------------------------------------
  // 5. BARREL SHIFTER BLOCK WITH LOW-POWER MASKING
  // ------------------------------------------------------------------
  // In low-power mode, wide shifting is capped to a 1-bit step.
  // This shields downstream logic cells from a cascade of signal toggles.
  wire [4:0] shamt = (lp_mode) ? 5'd1 : B_sh[4:0];

  wire [WIDTH-1:0] y_sll = A_sh << shamt;
  wire [WIDTH-1:0] y_srl = A_sh >> shamt;
  wire [WIDTH-1:0] y_sra = $signed(A_sh) >>> shamt;

  // ------------------------------------------------------------------
  // 6. COMPARATOR UNIT
  // ------------------------------------------------------------------
  wire [WIDTH-1:0] y_slt = ($signed(A) < $signed(B)) ? 
                           {{(WIDTH-1){1'b0}}, 1'b1} : {WIDTH{1'b0}};

  // ------------------------------------------------------------------
  // 7. MULTIPLEXER STAGE (NEXT RESULT)
  // ------------------------------------------------------------------
  wire [WIDTH-1:0] y_next =
      do_add ? sum   :
      do_sub ? sum   :
      do_and ? y_and :
      do_or  ? y_or  :
      do_xor ? y_xor :
      do_nor ? y_nor :
      do_sll ? y_sll :
      do_srl ? y_srl :
      do_sra ? y_sra :
      do_slt ? y_slt :
      do_a   ? A     :
      do_b   ? B     : {WIDTH{1'b0}};

  // ------------------------------------------------------------------
  // 8. COMBINATIONAL FLAG GENERATION
  // ------------------------------------------------------------------
  wire Z_n = (y_next == {WIDTH{1'b0}});
  wire N_n = y_next[WIDTH-1];
  wire C_n = (do_add | do_sub) ? cout : 1'b0;
  wire V_n = (do_add | do_sub) ? v_of : 1'b0;

  // ------------------------------------------------------------------
  // 9. RESULT & STATUS REGISTERS WITH CLOCK-ENABLE
  // ------------------------------------------------------------------
  // Gated dynamically matching the Enable switch to bypass active clocks
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      Y <= {WIDTH{1'b0}};
      Z <= 1'b0;
      N <= 1'b0;
      C <= 1'b0;
      V <= 1'b0;
    end else if (en) begin
      Y <= y_next;
      Z <= Z_n;
      N <= N_n;
      C <= C_n;
      V <= V_n;
    end
  end

endmodule
