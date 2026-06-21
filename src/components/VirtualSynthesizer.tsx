import React, { useState, useEffect } from "react";
import { Terminal, Cpu, Zap, Activity, Sliders, CheckCircle, Info, TrendingDown } from "lucide-react";
import { SynthParams, SynthReport } from "../types";

// Helper to generate PPA numbers depending on synthesis choices
const calculatePPAMetrics = (params: SynthParams): SynthReport => {
  const { width, useCLA, operandIsolation, clockGating, approxLSB } = params;

  // 1. CELLS COUNT
  // Baseline adder gates
  const baseAdderLuts = useCLA ? (width * 12) : (width * 4);
  const baseShifterLuts = width * 5; // barrel shifter multiplexers
  const logicalLuts = width * 3;
  const comparatorLuts = width * 2;
  const topMuxLuts = width * 4;

  let totalLuts = baseAdderLuts + baseShifterLuts + logicalLuts + comparatorLuts + topMuxLuts;

  // Isolation logic adds simple AND gating (approx. 1 LUT per isolated bit)
  if (operandIsolation) {
    totalLuts += width * 3; // isolation gates in front of adder, logical, shift inputs
  }

  // Register flip-flops
  const flipflops = width + 5; // Result Y + Flags (Z,N,C,V) + control
  let gatingCells = 0;
  let redundantMuxes = 0;

  if (clockGating) {
    gatingCells = 1; // 1 integrated clock gate cell at top level clock tree
  } else {
    // Standard synthesizers insert a recursive 2:1 recirculating multiplexer for each DFF if en is low
    redundantMuxes = flipflops;
  }

  const lutsWithMuxes = totalLuts + redundantMuxes;

  // 2. POWER ESTIMATE (at 100MHz system clock, 1.2V core rail voltage)
  const baseStaticUnit = 0.05; // uW per cell basic leakage
  const staticPower = (lutsWithMuxes + flipflops + gatingCells) * baseStaticUnit;

  // Dynamic switching activity scales with width and active modules
  let activeToggleWeight = 2.4; 
  if (useCLA) activeToggleWeight *= 1.45; // CLA has much higher wire routing capacitance

  let alpha = 0.28; // activity factor
  if (operandIsolation) alpha *= 0.65; // cuts activity in unused blocks by 35%
  if (approxLSB > 0) alpha *= 0.92;   // approximate addition drops transitions in LSB stages

  let dynamicPower = width * activeToggleWeight * alpha * 100 * 0.012; // model P = alpha * C * V2 * F

  if (!clockGating) {
    // without clock gating, the register pins toggle continuosly even if disabled
    dynamicPower += width * 0.6; 
  }

  // 3. CRITICAL TIMING PATH DELAY (ns)
  let cellDelay = 0.12; // ns per gate
  let criticalDelay = 0.5;

  if (useCLA) {
    // CLA has logarithmic delay O(log N)
    criticalDelay += Math.log2(width) * 0.45;
  } else {
    // Ripple carry has linear delay O(N)
    criticalDelay += width * 0.18;
  }

  criticalDelay += 0.4; // clock-to-q setup delay

  const maxFreq = Math.round(1000 / criticalDelay);

  // Toggle saving score
  let toggleReduction = 0;
  if (operandIsolation) toggleReduction += 22;
  if (clockGating) toggleReduction += 12;
  if (approxLSB > 0) toggleReduction += 8;

  const totalPower = dynamicPower + staticPower;

  return {
    cellCount: {
      luts: Math.round(lutsWithMuxes),
      flipflops,
      muxes: redundantMuxes,
      gatingCells,
      total: Math.round(lutsWithMuxes + flipflops + gatingCells)
    },
    ppa: {
      dynamicPower: parseFloat(dynamicPower.toFixed(2)),
      staticPower: parseFloat(staticPower.toFixed(2)),
      totalPower: parseFloat(totalPower.toFixed(2)),
      criticalDelay: parseFloat(criticalDelay.toFixed(2)),
      maxFreq,
      areaIndex: Math.round((lutsWithMuxes + flipflops) * 1.6)
    },
    toggleReduction
  };
};

export default function VirtualSynthesizer() {
  const [params, setParams] = useState<SynthParams>({
    width: 32,
    useCLA: false,
    operandIsolation: true,
    clockGating: true,
    approxLSB: 4
  });

  const [isLoading, setIsLoading] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [report, setReport] = useState<SynthReport | null>(null);

  // Run virtual compiler on initial mount or parameters change
  useEffect(() => {
    executeCompiler();
  }, [params]);

  const executeCompiler = () => {
    setIsLoading(true);
    setTerminalLogs([]);
    
    const logs = [
      `yosys> read_verilog rtl/adder.v`,
      `yosys> read_verilog rtl/alu.v`,
      `yosys> Preparing technology synthesis for top-module: alu`,
      `yosys> Applying design parameters: WIDTH=${params.width}, USE_CLA=${params.useCLA ? 1 : 0}, APPROX_LSB=${params.approxLSB}`,
      `yosys> hierarchy -top alu`,
      `yosys> ----------------------------------------------------`,
      `yosys> Executing optimization passes...`,
      params.operandIsolation 
        ? `yosys> [OPTIMIZATION] Inferred operand isolation gates on ADD, LOGIC, and SHIFTER inputs`
        : `yosys> [WARNING] Operand isolation deasserted. Logic gates will toggle continuously during idle periods`,
      `yosys> proc; opt; fsm; opt; memory; opt; techmap;`,
      params.clockGating
        ? `yosys> [CLOCK GATE] Inferred Integrated Clock Gated cell (ICG_X1) for clock-enable: 'en'`
        : `yosys> [DESIGN WRN] No gating cells inferred. Register 'Y' will use multiplexer feedback loops`,
      `yosys> Executing STA (Static Timing Analysis) library templates...`,
      `yosys> ----------------------------------------------------`,
      `yosys> Synthesis Complete. Building netlist report layout...`
    ];

    let logIndex = 0;
    const interval = setInterval(() => {
      if (logIndex < logs.length) {
        setTerminalLogs(prev => [...prev, logs[logIndex]]);
        logIndex++;
      } else {
        clearInterval(interval);
        setIsLoading(false);
        setReport(calculatePPAMetrics(params));
      }
    }, 120);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="synth-panel">
      {/* Parameter Configuration panel */}
      <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-200 uppercase font-sans">Synthesizer Parameters</h3>
        </div>

        {/* 1. Register Width */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-bold">
            Datapath Parameter Width (WIDTH)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[8, 16, 32].map(w => (
              <button
                key={w}
                onClick={() => setParams(prev => ({ ...prev, width: w as 8 | 16 | 32 }))}
                className={`py-1.5 px-3 font-mono text-xs font-semibold rounded-lg border transition-colors ${
                  params.width === w
                    ? "bg-emerald-950 border-emerald-500 text-emerald-300"
                    : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                {w}-Bit
              </button>
            ))}
          </div>
        </div>

        {/* 2. Adder Select */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-bold">
            Adder Architecture (USE_CLA)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: false, label: "Ripple Carry", desc: "Low area, O(N)" },
              { val: true, label: "Carry Lookahead", desc: "High performance" }
            ].map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setParams(prev => ({ ...prev, useCLA: opt.val }))}
                className={`flex flex-col items-center py-2 px-3 rounded-lg border text-center transition-colors ${
                  params.useCLA === opt.val
                    ? "bg-emerald-950 border-emerald-500 text-emerald-300"
                    : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                <span className="text-xs font-semibold font-mono">{opt.label}</span>
                <span className="text-[8px] text-slate-500 mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Operand Isolation opt */}
        <div className="border-t border-slate-800 pt-3 relative">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-300 font-mono">Operand Isolation</span>
              <p className="text-[9px] text-slate-500">Clamp unused logic inputs to logic zero</p>
            </div>
            <button
              onClick={() => setParams(prev => ({ ...prev, operandIsolation: !prev.operandIsolation }))}
              className={`w-10 h-5 rounded-full transition-colors relative border ${
                params.operandIsolation 
                  ? "bg-emerald-950 border-emerald-500/50" 
                  : "bg-slate-950 border-slate-800"
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full absolute top-0.5 transition-all ${
                params.operandIsolation 
                  ? "right-1 bg-emerald-400" 
                  : "left-1 bg-slate-600"
              }`} />
            </button>
          </div>
        </div>

        {/* 4. Clock Gating opt */}
        <div className="border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-300 font-mono">Integrated Clock Gating</span>
              <p className="text-[9px] text-slate-500">Gate out master clock-tree clock lines</p>
            </div>
            <button
              onClick={() => setParams(prev => ({ ...prev, clockGating: !prev.clockGating }))}
              className={`w-10 h-5 rounded-full transition-colors relative border ${
                params.clockGating 
                  ? "bg-emerald-950 border-emerald-500/50" 
                  : "bg-slate-950 border-slate-800"
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full absolute top-0.5 transition-all ${
                params.clockGating 
                  ? "right-1 bg-emerald-400" 
                  : "left-1 bg-slate-600"
              }`} />
            </button>
          </div>
        </div>

        {/* 5. LSB Approximation opt */}
        <div className="border-t border-slate-800 pt-3">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-bold">
            LSB Gating / Approximation Stages
          </label>
          <div className="grid grid-cols-4 gap-1">
            {[0, 2, 4, 8].map(stages => (
              <button
                key={stages}
                onClick={() => setParams(prev => ({ ...prev, approxLSB: stages }))}
                className={`py-1 rounded font-mono text-[10px] font-semibold text-center border transition-colors ${
                  params.approxLSB === stages
                    ? "bg-emerald-950 border-emerald-500 text-emerald-300"
                    : "bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-700 hover:text-slate-400"
                }`}
              >
                {stages === 0 ? "Exact" : `${stages} Bit`}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-slate-500 mt-1 font-mono leading-tight">
            Zeros out B-LSBs during low-power mode to avoid deep carry-toggling cascades.
          </p>
        </div>

        <button
          onClick={executeCompiler}
          disabled={isLoading}
          className="w-full mt-2 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 border border-emerald-400/40 text-slate-950 font-sans font-bold text-xs uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[98%]"
        >
          <Terminal className="w-4 h-4" />
          {isLoading ? "Synthesizing Netlist..." : "Rerun Yosys Compile"}
        </button>
      </div>

      {/* Synthesis terminal & report panel */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {/* Terminal Screen box */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-xl relative min-h-[160px] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Synthesis Shell (yosys-compiler-v0.25)</span>
            </div>
            <div className="text-[10px] font-mono text-slate-600 flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isLoading ? "bg-amber-400 animate-ping" : "bg-emerald-400"}`} />
              {isLoading ? "COMPILING" : "READY"}
            </div>
          </div>

          <div className="font-mono text-[10px] text-emerald-400 space-y-1.5 flex-1 select-all h-[110px] overflow-y-auto">
            {terminalLogs.map((log, idx) => (
              <div key={idx} className={log?.includes("[WARNING]") || log?.includes("[DESIGN WRN]") ? "text-yellow-400" : log?.includes("[CLOCK GATE]") || log?.includes("[OPTIMIZATION]") ? "text-cyan-400" : "text-emerald-400"}>
                {log}
              </div>
            ))}
            {isLoading && (
              <div className="text-emerald-600 animate-pulse flex items-center gap-1">
                yosys&gt; executing logic mapping... <span className="animate-ping font-bold">|</span>
              </div>
            )}
          </div>
        </div>

        {/* PPA Reports Dashboard */}
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Gate Level Area */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Silicon Area</span>
                  <h4 className="text-xl font-bold font-mono mt-1 text-slate-200">
                    {report.cellCount.total} <span className="text-xs text-slate-400 font-normal">cells</span>
                  </h4>
                </div>
                <div className="p-2 rounded bg-slate-800 text-slate-400">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-3 text-[10px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Logic LUT Units:</span>
                  <span className="text-slate-200">{report.cellCount.luts}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>D Flip-Flops:</span>
                  <span className="text-slate-200">{report.cellCount.flipflops}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Gating Circuits (ICGs):</span>
                  <span className="text-slate-200">{report.cellCount.gatingCells}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Top Selector Muxes:</span>
                  <span className="text-slate-200">{report.cellCount.muxes}</span>
                </div>
              </div>
            </div>

            {/* 2. Estimated Power */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Power Estimate</span>
                  <h4 className="text-xl font-bold font-mono mt-1 text-emerald-400">
                    {report.ppa.totalPower} <span className="text-xs font-normal text-slate-400">µW</span>
                  </h4>
                </div>
                <div className="p-2 rounded bg-slate-800 text-slate-400">
                  <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-3 text-[10px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Dynamic Switching:</span>
                  <span className="text-slate-200">{report.ppa.dynamicPower} µW</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Static Leakage:</span>
                  <span className="text-slate-200">{report.ppa.staticPower} µW</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Toggle Activity Drop:</span>
                  <span className="text-emerald-400 font-bold">~{report.toggleReduction}% saved</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>PPA Design Rating:</span>
                  <span className="text-cyan-400 font-bold">OPT-GREEN</span>
                </div>
              </div>
            </div>

            {/* 3. Delay & Speed Performance */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Delay / Timing</span>
                  <h4 className="text-xl font-bold font-mono mt-1 text-sky-400">
                    {report.ppa.criticalDelay} <span className="text-xs font-normal text-slate-400">ns</span>
                  </h4>
                </div>
                <div className="p-2 rounded bg-slate-800 text-slate-400">
                  <Activity className="w-4 h-4 text-sky-400" />
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-3 text-[10px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Worst Negative Slack:</span>
                  <span className="text-slate-200">0.00 ns (Met)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Max Run Frequency:</span>
                  <span className="text-slate-200 font-bold">{report.ppa.maxFreq} MHz</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Carry Chain Length:</span>
                  <span className="text-slate-200">
                    {params.useCLA ? "Logarithmic O(logN)" : `Ripple stages (${params.width})`}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Library Constraints:</span>
                  <span className="text-slate-200">ArtyA7 100MHz clock</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PPA Explanatory Note Box */}
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 flex gap-3 text-[11px] font-mono text-slate-400 leading-relaxed">
          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-300">VLSI Synthesis Insights: </span>
            Notice the PPA (Power-Performance-Area) tradeoffs! If you enable the <span className="text-emerald-400">Carry Lookahead Adder (CLA)</span>, your critical path delay drops (speeding up frequency to <span className="text-sky-300">~300MHz+</span>), but your silicon Area and dynamic leakage power budgets rise considerably. Enabling <span className="text-emerald-400">Operand Isolation</span> and <span className="text-emerald-400">Clock Gating</span> has a nominal cell area overhead but dramatically scales down dynamic current toggling, demonstrating prime VLSI craftsmanship.
          </div>
        </div>

      </div>
    </div>
  );
}
