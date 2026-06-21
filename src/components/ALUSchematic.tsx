import React from "react";
import { Cpu, Zap, Activity } from "lucide-react";

interface ALUSchematicProps {
  A: number;
  B: number;
  OPC: number;
  en: boolean;
  lp_mode: boolean;
  Y: number;
  Z: number;
  N: number;
  C: number;
  V: number;
  width: number;
  operandIsolation: boolean;
  toggleStats: {
    baselineToggles: number;
    optToggles: number;
    savedPercentage: number;
  };
}

export default function ALUSchematic({
  A,
  B,
  OPC,
  en,
  lp_mode,
  Y,
  Z,
  N,
  C,
  V,
  width,
  operandIsolation,
  toggleStats
}: ALUSchematicProps) {
  // Decode categories for schematic highlighting
  const isAddSub = OPC === 0 || OPC === 1;
  const isLogic = OPC >= 2 && OPC <= 5;
  const isShift = OPC >= 6 && OPC <= 8;
  const isCompare = OPC === 9;
  const isBypassA = OPC === 10;
  const isBypassB = OPC === 11;

  // Format binary/hex outputs
  const formatVal = (val: number, base: 16 | 2) => {
    let hex = val.toString(16).toUpperCase();
    const padLen = Math.ceil(width / 4);
    while (hex.length < padLen) hex = "0" + hex;
    
    if (base === 2) {
      let bin = val.toString(2);
      while (bin.length < width) bin = "0" + bin;
      return bin.match(/.{1,4}/g)?.join(" ") || bin;
    }
    return `0x${hex}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl relative overflow-hidden" id="alu-schematic-top">
      {/* Visual background grid effect */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 mb-6 relative z-10 gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-emerald-400 font-sans uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            Silicon-Level Logic Path Visualizer
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time verification of register gating, signal routing, and dynamic toggle limits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
            {width}-Bit Architecture
          </span>
          {operandIsolation ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/30 text-emerald-300">
              Isolation: ON
            </span>
          ) : (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/50 border border-amber-500/30 text-amber-300">
              Isolation: OFF (Baseline)
            </span>
          )}
        </div>
      </div>

      {/* Top Level Real-Time Toggle Energy Monitor BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 relative z-10 bg-slate-950 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-amber-950/30 border border-amber-500/20 text-amber-400">
            <Zap className="w-4 h-4 font-bold" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Baseline Transitions</div>
            <div className="text-lg font-mono font-bold text-amber-400">
              {toggleStats.baselineToggles} <span className="text-xs text-slate-400 font-normal">gates</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/20 text-emerald-400">
            <Zap className="w-4 h-4 font-bold" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Gated Transitions</div>
            <div className="text-lg font-mono font-bold text-emerald-400">
              {toggleStats.optToggles} <span className="text-xs text-slate-400 font-normal">gates</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded bg-emerald-950/20 border border-emerald-500/10 px-3 py-1 justify-between">
          <div>
            <div className="text-[10px] font-mono text-emerald-400 uppercase">dynamic power saved</div>
            <div className="text-xl font-mono font-bold text-emerald-300">
              {toggleStats.savedPercentage.toFixed(1)}%
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono text-slate-400">RTL Gating</div>
            <div className="text-xs font-semibold text-emerald-400">ACTIVE</div>
          </div>
        </div>
      </div>

      {/* Central Visual Schematic Flow */}
      <div className="space-y-6 relative z-10 text-slate-300 font-mono text-xs">
        {/* ROW 1: Input Signals & Isolation Control Gates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Signal A */}
          <div className="bg-slate-950 p-3 rounded border border-slate-800 relative">
            <div className="absolute top-1 right-2 text-[9px] text-slate-500 uppercase font-bold">Input A</div>
            <div className="text-xs font-semibold text-sky-400">{formatVal(A, 16)}</div>
            <div className="text-[10px] text-slate-400 mt-1 uppercase font-mono truncate">{formatVal(A, 2)}</div>
            <div className="mt-2 h-0.5 bg-slate-800 relative">
              <div className="absolute inset-y-0 left-0 bg-sky-400 w-full animate-pulse" />
            </div>
          </div>

          {/* Opcode Controller Unit */}
          <div className="bg-slate-950 p-3 rounded border border-slate-800 text-center flex flex-col justify-center">
            <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Instruction Box (OPC)</span>
            <div className="text-sm font-bold text-purple-400 mt-1 uppercase">
              {OPC.toString(2).padStart(4, "0")} ({OPC})
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5 font-semibold">
              {OPC === 0 ? "ADD" : OPC === 1 ? "SUB" : OPC === 2 ? "AND" : OPC === 3 ? "OR" : OPC === 4 ? "XOR" : OPC === 5 ? "NOR" : OPC === 6 ? "SLL" : OPC === 7 ? "SRL" : OPC === 8 ? "SRA" : OPC === 9 ? "SLT (Signed Compare)" : OPC === 10 ? "PASS A" : "PASS B"}
            </div>
          </div>

          {/* Signal B */}
          <div className="bg-slate-950 p-3 rounded border border-slate-800 relative">
            <div className="absolute top-1 right-2 text-[9px] text-slate-500 uppercase font-bold">Input B</div>
            <div className="text-xs font-semibold text-indigo-400">{formatVal(B, 16)}</div>
            <div className="text-[10px] text-slate-400 mt-1 uppercase font-mono truncate">{formatVal(B, 2)}</div>
            {lp_mode && (isAddSub || isShift) && (
              <div className="text-[8px] text-yellow-400 uppercase mt-0.5">
                {isAddSub ? "⚠️ Approx LSBs gated" : "⚠️ Shift amount capped at 1"}
              </div>
            )}
            <div className="mt-2 h-0.5 bg-slate-800 relative">
              <div className="absolute inset-y-0 left-0 bg-indigo-400 w-full animate-pulse" />
            </div>
          </div>
        </div>

        {/* Dynamic Connector Wires & Isolation Status Muxes */}
        <div className="text-center text-slate-500 h-2 flex items-center justify-around py-2">
          <div className="border-l-2 border-dashed h-4 border-slate-700" />
          <div className="border-l-2 border-dashed h-4 border-slate-700" />
          <div className="border-l-2 border-dashed h-4 border-slate-700" />
        </div>

        {/* ROW 2: Isolated Block Schematics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          {/* 1. Adder/Subtractor block */}
          <div className={`p-3 rounded border relative transition-colors duration-300 ${
            isAddSub 
              ? "bg-slate-950 border-emerald-500/50 text-emerald-300" 
              : !operandIsolation 
                ? "bg-slate-950/80 border-slate-700 text-slate-400" 
                : "bg-slate-950/40 border-slate-900 text-slate-600 opacity-65"
          }`}>
            <span className="text-[8px] font-mono absolute top-1 left-2 uppercase tracking-tight">Block 1</span>
            <span className={`text-[8px] px-1 py-0.5 rounded font-mono absolute top-1 right-2 ${
              isAddSub 
                ? "bg-emerald-950 border border-emerald-500/30 text-emerald-400 font-bold" 
                : "bg-slate-900 text-slate-500 border border-slate-800"
            }`}>
              {isAddSub ? "GATES ACTIVE" : operandIsolation ? "ISOLATED" : "STANDBY TOGGLE"}
            </span>
            <div className="mt-4 font-bold tracking-wider font-sans text-xs">ADDER/SUBTR</div>
            <div className="text-[10px] translate-y-1 font-mono mt-0.5">
              {isAddSub ? "A + B (Sum)" : !operandIsolation ? "Receives Toggles" : "Inputs Gated to 0"}
            </div>
            {isAddSub && lp_mode && (
              <div className="text-[9px] text-amber-400 mt-1 bg-amber-950/30 border border-amber-800/20 py-0.5 rounded">
                Approx Adder Active
              </div>
            )}
          </div>

          {/* 2. Logical Block */}
          <div className={`p-3 rounded border relative transition-colors duration-300 ${
            isLogic 
              ? "bg-slate-950 border-emerald-500/50 text-emerald-300" 
              : !operandIsolation 
                ? "bg-slate-950/80 border-slate-700 text-slate-400" 
                : "bg-slate-950/40 border-slate-900 text-slate-600 opacity-65"
          }`}>
            <span className="text-[8px] font-mono absolute top-1 left-2 uppercase tracking-tight">Block 2</span>
            <span className={`text-[8px] px-1 py-0.5 rounded font-mono absolute top-1 right-2 ${
              isLogic 
                ? "bg-emerald-950 border border-emerald-500/30 text-emerald-400 font-bold" 
                : "bg-slate-900 text-slate-500 border border-slate-800"
            }`}>
              {isLogic ? "GATES ACTIVE" : operandIsolation ? "ISOLATED" : "STANDBY TOGGLE"}
            </span>
            <div className="mt-4 font-bold tracking-wider font-sans text-xs">LOGICAL GATE</div>
            <div className="text-[10px] translate-y-1 font-mono mt-0.5">
              {isLogic ? "AND / OR / XOR / NOR" : !operandIsolation ? "Receives Toggles" : "Inputs Gated to 0"}
            </div>
          </div>

          {/* 3. Barrel Shifter Block */}
          <div className={`p-3 rounded border relative transition-colors duration-300 ${
            isShift 
              ? "bg-slate-950 border-emerald-500/50 text-emerald-300" 
              : !operandIsolation 
                ? "bg-slate-950/80 border-slate-700 text-slate-400" 
                : "bg-slate-950/40 border-slate-900 text-slate-600 opacity-65"
          }`}>
            <span className="text-[8px] font-mono absolute top-1 left-2 uppercase tracking-tight">Block 3</span>
            <span className={`text-[8px] px-1 py-0.5 rounded font-mono absolute top-1 right-2 ${
              isShift 
                ? "bg-emerald-950 border border-emerald-500/30 text-emerald-400 font-bold" 
                : "bg-slate-900 text-slate-500 border border-slate-800"
            }`}>
              {isShift ? "GATES ACTIVE" : operandIsolation ? "ISOLATED" : "STANDBY TOGGLE"}
            </span>
            <div className="mt-4 font-bold tracking-wider font-sans text-xs">BARREL SHIFTER</div>
            <div className="text-[10px] translate-y-1 font-mono mt-0.5">
              {isShift ? "SLL / SRL / SRA" : !operandIsolation ? "Receives Toggles" : "Inputs Gated to 0"}
            </div>
            {isShift && lp_mode && (
              <div className="text-[9px] text-amber-400 mt-1 bg-amber-950/30 border border-amber-800/20 py-0.5 rounded">
                Shamt Gated to 1-bit
              </div>
            )}
          </div>

          {/* 4. Comparator Block */}
          <div className={`p-3 rounded border relative transition-colors duration-300 ${
            isCompare 
              ? "bg-slate-950 border-emerald-500/50 text-emerald-300" 
              : !operandIsolation 
                ? "bg-slate-950/80 border-slate-700 text-slate-400" 
                : "bg-slate-950/40 border-slate-900 text-slate-600 opacity-65"
          }`}>
            <span className="text-[8px] font-mono absolute top-1 left-2 uppercase tracking-tight">Block 4</span>
            <span className={`text-[8px] px-1 py-0.5 rounded font-mono absolute top-1 right-2 ${
              isCompare 
                ? "bg-emerald-950 border border-emerald-500/30 text-emerald-400 font-bold" 
                : "bg-slate-900 text-slate-500 border border-slate-800"
            }`}>
              {isCompare ? "GATES ACTIVE" : operandIsolation ? "ISOLATED" : "STANDBY TOGGLE"}
            </span>
            <div className="mt-4 font-bold tracking-wider font-sans text-xs">COMPARATOR</div>
            <div className="text-[10px] translate-y-1 font-mono mt-0.5">
              {isCompare ? "A < B (Signed)" : !operandIsolation ? "Receives Toggles" : "Inputs Gated to 0"}
            </div>
          </div>
        </div>

        {/* Connector Wires from outputs of individual blocks to the multiplexer */}
        <div className="flex justify-around items-center h-4 text-slate-500 relative">
          <div className={`border-l-2 h-4 ${isAddSub ? "border-emerald-500 animate-pulse" : "border-slate-800"}`} />
          <div className={`border-l-2 h-4 ${isLogic ? "border-emerald-500 animate-pulse" : "border-slate-800"}`} />
          <div className={`border-l-2 h-4 ${isShift ? "border-emerald-500 animate-pulse" : "border-slate-800"}`} />
          <div className={`border-l-2 h-4 ${isCompare ? "border-emerald-500 animate-pulse" : "border-slate-800"}`} />
        </div>

        {/* Decoder Multiplexer Stage */}
        <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg text-center relative">
          <div className="absolute top-1 left-2 text-[8px] text-slate-500 uppercase tracking-wider">Combinational Bus Multiplexer</div>
          <span className="text-purple-400 font-bold">12-to-1 Multiplexer Route</span>
          <div className="text-[11px] text-slate-400 mt-1">
            Accepts calculated operand outputs and slices routing selection based on Opcode: 
            <span className="text-emerald-400 font-mono font-bold ml-1">
              {OPC === 0 ? "ADD Sum Output" : OPC === 1 ? "SUB Difference Output" : OPC === 2 ? "AND Logic Output" : OPC === 3 ? "OR Logic Output" : OPC === 4 ? "XOR Logic Output" : OPC === 5 ? "NOR Logic Output" : OPC === 6 ? "SLL Shifted Output" : OPC === 7 ? "SRL Shifted Output" : OPC === 8 ? "SRA Shifted Output" : OPC === 9 ? "SLT Compare Truth Bit" : OPC === 10 ? "Direct Bypass Operand A" : "Direct Bypass Operand B"}
            </span>
          </div>
        </div>

        {/* Gated Register Step */}
        <div className="text-center text-slate-500 h-2 flex items-center justify-center py-2">
          <div className={`border-l-2 border-dashed h-4 ${en ? "border-emerald-500" : "border-slate-800"}`} />
        </div>

        {/* ROW 3: Clock Gated Registers Stage */}
        <div className={`p-4 rounded-xl border text-center transition-all duration-300 relative ${
          en 
            ? "bg-gradient-to-r from-emerald-950/20 to-slate-950 border-emerald-500 text-slate-200 shadow-lg shadow-emerald-950/25" 
            : "bg-slate-950 border-rose-500/30 text-slate-500 cursor-not-allowed opacity-70"
        }`}>
          <div className="absolute top-1 left-2 text-[8px] text-slate-500 uppercase tracking-widest font-mono">
            RTL Gated Flip-Flop Register Array
          </div>
          <span className={`absolute top-1.5 right-2 text-[8px] px-1 py-0.2 rounded font-bold font-mono ${
            en ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20" : "bg-rose-950 text-rose-400 border border-rose-500/20"
          }`}>
            {en ? "● CLOCK ENABLE ACTIVE" : "■ REGISTER SLEEP GATED"}
          </span>
          
          <div className="flex flex-col items-center justify-center gap-2 mt-4">
            <Cpu className={`w-8 h-8 ${en ? "text-emerald-400 animate-bounce" : "text-slate-600"}`} />
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Registered Final Output (Y)</div>
              <div className={`text-lg font-bold font-mono ${en ? "text-emerald-300" : "text-slate-500"}`}>
                {formatVal(Y, 16)} <span className="text-[10px] text-slate-500">({Y})</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-md uppercase font-mono tracking-tight">
                {formatVal(Y, 2)}
              </div>
            </div>
          </div>
        </div>

        {/* Logical Output Flags Card */}
        <div className="grid grid-cols-4 gap-2 text-center pt-2">
          {[
            { label: "Zero (Z)", val: Z, activeColor: "border-teal-500/50 bg-teal-950/20 text-teal-300" },
            { label: "Negative (N)", val: N, activeColor: "border-amber-500/50 bg-amber-950/20 text-amber-300" },
            { label: "Carry Out (C)", val: C, activeColor: "border-sky-500/50 bg-sky-950/20 text-sky-300" },
            { label: "Overflow (V)", val: V, activeColor: "border-fuchsia-500/50 bg-fuchsia-950/20 text-fuchsia-300" }
          ].map((flag, idx) => (
            <div key={idx} className={`p-2 border rounded-lg transition-colors duration-300 ${
              flag.val === 1 
                ? flag.activeColor 
                : "border-slate-800 bg-slate-950/40 text-slate-600"
            }`}>
              <div className="text-[8px] uppercase tracking-tight text-slate-400 font-bold">{flag.label}</div>
              <div className="text-base font-bold font-mono mt-0.5">{flag.val}</div>
              <div className="text-[7px] text-slate-500 mt-0.5">
                {flag.val === 1 ? "TRIGGERED" : "CLEARED"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
