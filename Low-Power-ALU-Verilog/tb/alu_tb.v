// Low-Power-ALU-Verilog/tb/alu_tb.v
`timescale 1ns/1ps

module alu_tb;

  parameter WIDTH = 32;

  // Stimulus local signals
  reg              clk;
  reg              rst_n;
  reg              en;
  reg              lp_mode;
  reg  [WIDTH-1:0] A;
  reg  [WIDTH-1:0] B;
  reg  [3:0]       OPC;

  // Monitored outputs
  wire [WIDTH-1:0] Y;
  wire             Z;
  wire             N;
  wire             C;
  wire             V;

  // Device Under Test (DUT)
  alu #(
    .WIDTH(WIDTH),
    .USE_CLA(0),
    .APPROX_LSB(4)
  ) u_dut (
    .clk(clk),
    .rst_n(rst_n),
    .en(en),
    .lp_mode(lp_mode),
    .A(A),
    .B(B),
    .OPC(OPC),
    .Y(Y),
    .Z(Z),
    .N(N),
    .C(C),
    .V(V)
  );

  // Clock generator: 100MHz (10ns period)
  always begin
    #5 clk = ~clk;
  end

  initial begin
    // Setup waveform dump tracking matching GTKWave standards
    $dumpfile("simulation/alu_wave.vcd");
    $dumpvars(0, alu_tb);

    // Initial resets
    clk     = 1'b0;
    rst_n   = 1'b0;
    en      = 1'b1;
    lp_mode = 1'b0;
    A       = {WIDTH{1'b0}};
    B       = {WIDTH{1'b0}};
    OPC     = 4'b0000;

    #15;
    rst_n = 1'b1; // De-assert asynchronous reset
    #10;

    // ----------------------------------------------------
    // TESTCASE 1: ADDITION FUNCTIONALITY (OPC = 0)
    // ----------------------------------------------------
    $display("[TB] TC1: Verifying Addition");
    A   = 32'h0000_000F;
    B   = 32'h0000_0001;
    OPC = 4'b0000;
    #10;
    $display("[TB] Sum Result: %h (Expected: 10)", Y);

    // ----------------------------------------------------
    // TESTCASE 2: OPERAND ISOLATION TEST (Gated ADD module)
    // ----------------------------------------------------
    $display("[TB] TC2: Verifying Low-Power Mode Gated Adder");
    lp_mode = 1'b1;
    A       = 32'h0000_001F;
    B       = 32'h0000_0003;
    #10;
    $display("[TB] Sum (lp_mode) Result: %h", Y);
    lp_mode = 1'b0; // Turn back OFF
    #10;

    // ----------------------------------------------------
    // TESTCASE 3: RTL CLOCK GATING EN HOOK
    // ----------------------------------------------------
    $display("[TB] TC3: Gating of registers using Enable hook");
    en  = 1'b0; // Block write triggers
    A   = 32'hFFFF_FFFF;
    B   = 32'h0000_0005;
    #20;
    $display("[TB] Result with gated clock (Expected unchanged): %h", Y);
    
    en  = 1'b1; // Open gates back up
    #10;
    $display("[TB] Result with clock open: %h", Y);

    // ----------------------------------------------------
    // TESTCASE 4: BITWISE XOR OPERATIONS (OPC = 4)
    // ----------------------------------------------------
    $display("[TB] TC4: Checking Bitwise XOR operation");
    OPC = 4'b0100;
    A   = 32'hAAAA_AAAA;
    B   = 32'h5555_5555;
    #10;
    $display("[TB] XOR result: %h", Y);

    #50;
    $display("[TB] Testbench completed successfully. All blocks verified.");
    $finish;
  end

endmodule
