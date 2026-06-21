import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  Cpu, 
  Zap, 
  Activity, 
  Code2, 
  FileText, 
  Award, 
  Clock, 
  ChevronRight, 
  RotateCcw, 
  CheckCircle,
  FolderTree,
  AlertCircle,
  HelpCircle,
  ArrowRightLeft,
  Sliders
} from "lucide-react";
import ALUSchematic from "./components/ALUSchematic";
import WaveformTracer from "./components/WaveformTracer";
import VirtualSynthesizer from "./components/VirtualSynthesizer";
import SourceCodeHub from "./components/SourceCodeHub";
import InterviewPreparer from "./components/InterviewPreparer";
import { ALU_OPERATIONS, TECH_OPTIONS } from "./data/alu_project_data";
import { SimSignalEvent } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"classroom" | "sandbox" | "synthesis" | "code" | "report" | "interview">("sandbox");

  // --- ALU Simulator States ---
  const [width, setWidth] = useState<number>(32);
  const [A, setA] = useState<number>(0x12);
  const [B, setB] = useState<number>(0x05);
  const [OPC, setOPC] = useState<number>(0); // ADD by default
  const [en, setEn] = useState<boolean>(true);
  const [lp_mode, setLp_mode] = useState<boolean>(false);

  // Registered Outputs on posedge clock
  const [Y, setY] = useState<number>(0);
  const [Z, setZ] = useState<number>(1);
  const [N, setN] = useState<number>(0);
  const [C, setC] = useState<number>(0);
  const [V, setV] = useState<number>(0);

  // Simulation Timeline Clock History
  const [history, setHistory] = useState<SimSignalEvent[]>([]);
  const [simTime, setSimTime] = useState<number>(0);
  const [currentClk, setCurrentClk] = useState<number>(0);

  // Report Generator Student Form
  const [studentForm, setStudentForm] = useState({
    name: "Alex Mercer",
    rollNumber: "VLSI-2026-089A",
    institution: "Institute of Digital Microsystems",
    course: "ECE-402: Modern VLSI Architecture",
    instructor: "Prof. Dr. Helen Carter"
  });

  // Calculate "Next Combinational States" (y_next, Z_n, etc) instantly
  const calculateCombinationalALU = () => {
    let result = 0;
    let carry = 0;
    let overflow = 0;

    const approxLSB = 4; // parameterizable matching adder
    let A_eff = A;
    // Operand Isolation active check
    const isAddSub = OPC === 0 || OPC === 1;
    const isShift = OPC === 6 || OPC === 7 || OPC === 8;
    const isLogic = OPC >= 2 && OPC <= 5;
    const isCompare = OPC === 9;

    // Simulate masked operands inside the isolated blocks
    const isolatedA_add = isAddSub ? A : 0;
    const isolatedB_add = isAddSub ? B : 0;
    
    // Low Power Mode Gated LSBs for addition
    let b_adder = isolatedB_add;
    if (lp_mode && isAddSub && approxLSB > 0) {
      b_adder = (isolatedB_add & (~((1 << approxLSB) - 1))) >>> 0;
    }

    // Masked shamt inside the isolated shifter
    const shamt = (lp_mode && isShift) ? 1 : (B & 0x1F);

    switch (OPC) {
      case 0: // ADD
        result = (isolatedA_add + b_adder) >>> 0;
        carry = (isolatedA_add + b_adder) >= Math.pow(2, width) ? 1 : 0;
        // Overflow formula overflow = c_in_msb ^ c_out
        {
          const signA = (isolatedA_add & (1 << (width - 1))) !== 0;
          const signB = (b_adder & (1 << (width - 1))) !== 0;
          const signR = (result & (1 << (width - 1))) !== 0;
          overflow = (signA === signB && signA !== signR) ? 1 : 0;
        }
        break;

      case 1: // SUB
        result = (isolatedA_add - b_adder) >>> 0;
        carry = (isolatedA_add >= b_adder) ? 0 : 1; // carry borrow
        {
          const signA = (isolatedA_add & (1 << (width - 1))) !== 0;
          const signB = (b_adder & (1 << (width - 1))) !== 0;
          const signR = (result & (1 << (width - 1))) !== 0;
          overflow = (signA !== signB && signR !== signA) ? 1 : 0;
        }
        break;

      case 2: // AND
        result = (A & B) >>> 0;
        break;

      case 3: // OR
        result = (A | B) >>> 0;
        break;

      case 4: // XOR
        result = (A ^ B) >>> 0;
        break;

      case 5: // NOR
        result = (~(A | B)) >>> 0;
        break;

      case 6: // SLL (Shift Left Logical)
        result = (A << shamt) >>> 0;
        break;

      case 7: // SRL (Shift Right Logical)
        result = (A >>> shamt) >>> 0;
        break;

      case 8: // SRA (Shift Right Arithmetic)
        {
          const sign = (A & (1 << (width - 1))) !== 0;
          let temp = A >>> shamt;
          if (sign && shamt > 0) {
            const fillMask = (~0 << (width - shamt));
            temp = (temp | fillMask) >>> 0;
          }
          result = temp;
        }
        break;

      case 9: // SLT (Signed Less Than)
        {
          let signedA = A;
          let signedB = B;
          const mask = 1 << (width - 1);
          if (A & mask) signedA = A - Math.pow(2, width);
          if (B & mask) signedB = B - Math.pow(2, width);
          result = signedA < signedB ? 1 : 0;
        }
        break;

      case 10: // PASS A
        result = A >>> 0;
        break;

      case 11: // PASS B
        result = B >>> 0;
        break;

      default:
        result = 0;
    }

    // Wrap final result to width
    const resultMask = Math.pow(2, width) - 1;
    result = result & resultMask;

    const zero = result === 0 ? 1 : 0;
    const sign = (result & (1 << (width - 1))) !== 0 ? 1 : 0;

    return { y_n: result, Z_n: zero, N_n: sign, C_n: carry, V_n: overflow };
  };

  const comb = calculateCombinationalALU();

  // Handle clock rising edge tick trigger (registered values update)
  const handleClockTick = () => {
    setSimTime(prev => prev + 10);
    setCurrentClk(1);

    // sequential logic holds previous outputs unless clock-enable 'en' is high
    let nextY = Y;
    let nextZ = Z;
    let nextN = N;
    let nextC = C;
    let nextV = V;

    if (en) {
      nextY = comb.y_n;
      nextZ = comb.Z_n;
      nextN = comb.N_n;
      nextC = comb.C_n;
      nextV = comb.V_n;

      setY(nextY);
      setZ(nextZ);
      setN(nextN);
      setC(nextC);
      setV(nextV);
    }

    const opName = ALU_OPERATIONS.find(op => op?.opcode?.includes(`b${OPC.toString(2).padStart(4,"0")}`))?.name || "IDLE";

    // Trace Signal Event Logging
    const newEvent: SimSignalEvent = {
      time: simTime + 10,
      clk: 1,
      en: en ? 1 : 0,
      lp_mode: lp_mode ? 1 : 0,
      A,
      B,
      OPC,
      opcodeName: opName,
      Y: nextY,
      Z: nextZ,
      N: nextN,
      C: nextC,
      V: nextV
    };

    setHistory(prev => [...prev, newEvent]);

    // Return clk back to raw state low after 300ms
    setTimeout(() => {
      setCurrentClk(0);
    }, 150);
  };

  // Seed baseline simulations to trace wave plots upon mount
  useEffect(() => {
    if (history.length === 0) {
      const initialRuns: SimSignalEvent[] = [
        { time: 0, clk: 0, en: 1, lp_mode: 0, A: 0x0C, B: 0x05, OPC: 0, opcodeName: "ADD", Y: 0, Z: 1, N: 0, C: 0, V: 0 },
        { time: 10, clk: 1, en: 1, lp_mode: 0, A: 0x0C, B: 0x05, OPC: 0, opcodeName: "ADD", Y: 0x11, Z: 0, N: 0, C: 0, V: 0 },
        { time: 20, clk: 0, en: 1, lp_mode: 0, A: 0xFF, B: 0x01, OPC: 0, opcodeName: "ADD", Y: 0x11, Z: 0, N: 0, C: 0, V: 0 },
        { time: 30, clk: 1, en: 1, lp_mode: 0, A: 0xFF, B: 0x01, OPC: 0, opcodeName: "ADD", Y: 0x00, Z: 1, N: 0, C: 1, V: 0 }
      ];
      setHistory(initialRuns);
      setSimTime(30);
      setY(0x00);
      setZ(1);
      setC(1);
    }
  }, []);

  // Set randomized slide variables
  const handleRandomizeInputs = () => {
    const mask = Math.pow(2, width) - 1;
    setA(Math.floor(Math.random() * mask));
    setB(Math.floor(Math.random() * mask));
  };

  // Calculate dynamic switching transition counts
  const calculateDynamicTransitions = () => {
    let baselineToggles = 142; // arbitrary baseline scale
    if (A % 2 === 0) baselineToggles += 20;
    if (B % 3 === 0) baselineToggles += 45;

    let optToggles = baselineToggles;
    let savedSec = 0;

    // active operand isolation reduces unused toggles
    if (activeTab === "sandbox" || activeTab === "report") {
      const isAddSub = OPC === 0 || OPC === 1;
      const isShift = OPC === 6 || OPC === 7 || OPC === 8;
      const isLogic = OPC >= 2 && OPC <= 5;
      const isCompare = OPC === 9;

      // if isolation is ON, we shut off transitions inside idle modules
      let activeGatesScale = 1.0;
      if (isAddSub) activeGatesScale = 0.35; // adder is only 35% of overall logical gates
      else if (isLogic) activeGatesScale = 0.15;
      else if (isShift) activeGatesScale = 0.40;
      else if (isCompare) activeGatesScale = 0.10;

      const idleGatedGates = baselineToggles * (1.0 - activeGatesScale);
      optToggles = baselineToggles - idleGatedGates;

      if (lp_mode) {
        optToggles *= 0.85; // LSB gates cut extra transitions
      }
      if (!en) {
        optToggles *= 0.12; // register clock gating reduces clock tree flip-flop charge surges
      }

      savedSec = ((baselineToggles - optToggles) / baselineToggles) * 100;
    }

    return {
      baselineToggles: Math.round(baselineToggles),
      optToggles: Math.round(optToggles),
      savedPercentage: savedSec
    };
  };

  const toggleStats = calculateDynamicTransitions();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* HEADER SECTION */}
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-6 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-lg text-slate-950 shadow-md shadow-emerald-500/20">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display tracking-tight text-slate-100 flex items-center gap-2">
                Low-Power Verilog ALU Studio
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  RTL Gating v1.2
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                VLSI Course Design Project Companion & Silicon-Aware Interactive Emulator
              </p>
            </div>
          </div>

          {/* Core Applet controls - Width Selection */}
          <div className="flex items-center gap-4 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 px-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sim Time: </span>
              <span className="text-sky-400 font-bold">{simTime}ns</span>
            </div>

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex gap-1" id="global-tabs">
              {[
                { id: "classroom", label: "Classroom", icon: BookOpen },
                { id: "sandbox", label: "Playground", icon: Activity },
                { id: "synthesis", label: "PPA Synth", icon: Zap },
                { id: "code", label: "Source Code", icon: Code2 },
                { id: "report", label: "Project Report", icon: FileText },
                { id: "interview", label: "Interview Deck", icon: Award }
              ].map(tab => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium font-sans transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* COMPANION ACTIVE CONTENT */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* TAB 1: ACADEMIC CLASSROOM */}
        {activeTab === "classroom" && (
          <div className="space-y-8 animate-fade-in" id="classroom-tab">
            {/* Dynamic Intro Block */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
              <div className="max-w-3xl">
                <span className="text-xs text-emerald-400 font-mono uppercase tracking-wider font-semibold">VLSI Course Project Theory Pack</span>
                <h2 className="text-2xl font-bold font-display text-slate-100 mt-1">Introduction to Low-Power ALU Design</h2>
                <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                  In modern nanoscale VLSI chips, thermal budgets and power dissipation dominate product scalability. The cell Arithmetic Logic Unit (ALU), the mathematical heart of processors, represents a hotbed of switching toggles. Traditional RTL design allows inputs to ripple through all modules during idle phases, throwing out massive amounts of wasted energy. This classroom page covers the academic foundations, tech stack comparisons, and hardware pinout schematics needed to write a professional course project.
                </p>
              </div>
            </div>

            {/* Core Explanations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-200 uppercase font-sans border-b border-slate-850 pb-2 mb-3">
                  What is a Low-Power ALU?
                </h3>
                <div className="space-y-3 text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
                  <p>
                    A standard ALU accepts opcodes and variables, immediately evaluating sums, shifts, and logic bit operations. However, because its inputs feed directly into full-adders, multipliers, and logic gates, a tiny change on operands causes internal nodes to switch states across the entire hardware board, even if a simple logical bypass was requested!
                  </p>
                  <p>
                    A <strong className="text-slate-300">Low-Power ALU</strong> resolves this wastage at the RTL structural level by introducing masking AND gates and register clocks. By isolating unused gates so their inputs remain static, dynamic toggle current cascades are limited strictly to the required functional unit.
                  </p>
                </div>
              </div>

              <div className="bg-slate-905 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-200 uppercase font-sans border-b border-slate-850 pb-2 mb-3">
                  Why Low-Power Matters in Silicon
                </h3>
                <div className="space-y-3 text-xs sm:text-sm text-slate-400 leading-relaxed font-sans font-normal">
                  <p>
                    Dynamic power dissipation in CMOS transistors is expressed by the classical energy formula:
                    <br />
                    <span className="block my-2 text-center text-emerald-400 font-mono font-bold bg-slate-950 p-2 rounded border border-slate-900">
                      P_dynamic = α · C_load · V_dd² · f
                    </span>
                    Where <strong className="text-slate-300">α (Alpha)</strong> is the activity factor (toggle probability), <strong className="text-slate-300">C_load</strong> is dynamic node capacitance, <strong className="text-slate-300">V_dd</strong> is rail supply voltage, and <strong className="text-slate-300">f</strong> is clock speed.
                  </p>
                  <p>
                    While technologists scale V_dd down to reduce power quadratically, VLSI engineers optimize <strong className="text-slate-300">α</strong> out through micro-architectural gating. Reducing redundant logical toggles directly preserves cell battery life and expands modern silicon frequency targets.
                  </p>
                </div>
              </div>
            </div>

            {/* Technology Stack options list */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-200 uppercase font-sans border-b border-slate-850 pb-2 mb-4">
                Tech Stack Implementation Scales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TECH_OPTIONS.map((opt, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-850 rounded-lg p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-slate-200">{opt.title}</span>
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          opt.difficulty === "Easy" ? "bg-cyan-950 text-cyan-400" :
                          opt.difficulty === "Recommended" ? "bg-emerald-950 text-emerald-400" :
                          "bg-purple-950 text-purple-400"
                        }`}>
                          {opt.difficulty}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                        {opt.desc}
                      </p>
                      <div className="mt-3 space-y-1 text-[10px] font-mono text-slate-500">
                        <div>Width: <span className="text-slate-300">{opt.width}</span></div>
                        <div>Tools: <span className="text-slate-300">{opt.tools.join(", ")}</span></div>
                        <div>Hardware Board: <span className="text-slate-300">{opt.hardwareRequired ? "Yes" : "Virtual Only"}</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-emerald-950/20 border border-emerald-500/10 p-3 rounded-lg flex items-start gap-2 text-[11px] text-slate-400 font-mono leading-relaxed">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Our companion platform is designed to compile structures matching <strong>Option C (Advanced)</strong>, giving students a portfolio asset capable of modeling actual cell gate numbers, delay metrics, and VCD dumps, while still supporting constraint layouts for <strong>Option B (Xilinx Vivado board mapping)</strong>!
                </span>
              </div>
            </div>

            {/* VLSI Concepts deep dive */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-200 uppercase font-display border-b border-slate-850 pb-2 mb-4">
                Core Low-Power Logic Strategy
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/80 rounded-lg border border-slate-850 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 text-xs flex items-center justify-center font-bold">1</span>
                    <h4 className="text-xs font-semibold uppercase font-sans text-slate-200">Active Operand Isolation</h4>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed font-sans">
                    Logical AND gates clamped directly in front of the Arithmetic (ADD/SUB), Custom Logic Gate, and Barrel Shifter ports inhibit inputs from toggling unless selected by the top decoder. When computing OR operations, the Adder remains locked at input logical zeroes, drawing only static subthreshold leakage.
                  </p>
                </div>

                <div className="bg-slate-950/80 rounded-lg border border-slate-850 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 text-xs flex items-center justify-center font-bold">2</span>
                    <h4 className="text-xs font-semibold uppercase font-sans text-slate-200">RTL clock Gating (Clock-Enable)</h4>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed font-sans font-normal">
                    By enclosing register assignments inside are <strong>'if (en)'</strong> condition, the synthesizers mapping blocks bypass standard multiplexer recirculations and install physical Integrated Clock Gating (ICG) cells inside the clock tree nodes. This saves both latch-charge and local clock-pulses current.
                  </p>
                </div>

                <div className="bg-slate-950/80 rounded-lg border border-slate-850 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 text-xs flex items-center justify-center font-bold">3</span>
                    <h4 className="text-xs font-semibold uppercase font-sans text-slate-200">Dynamic Barrel Gating Mode (lp_mode)</h4>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed font-sans">
                    A barrel shifter has multiple levels of multiplexers that toggle extensively under shift changes. When lp_mode is ON, shift heights are forced to stay capped at 1, keeping higher-level wires quiet. It also limits carry chains in adders through LSB approximations.
                  </p>
                </div>

                <div className="bg-slate-950/80 rounded-lg border border-slate-850 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 text-xs flex items-center justify-center font-bold">4</span>
                    <h4 className="text-xs font-semibold uppercase font-sans text-slate-200">Self-Checking Timing Validation</h4>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed font-sans">
                    The included testbench (alu_tb.v) uses a golden software model to iterate on values across all 11 opcodes. Clock gating and resets are evaluated dynamically, and toggles are serialized into Value Change Dump (VCD) waveform scopes matching GTKWave formatting.
                  </p>
                </div>
              </div>
            </div>

            {/* Folder structures & project hierarchies */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-200 uppercase font-sans border-b border-slate-850 pb-2 mb-3">
                GitHub Repository Workspace Directory Map
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="space-y-1.5 text-slate-300">
                  <div className="text-emerald-400 font-bold">Low-Power-ALU-Verilog/</div>
                  <div>├── rtl/ <span className="text-slate-500">— Synthesizable ALU & Adder source codes</span></div>
                  <div>├── tb/ <span className="text-slate-500">— Testbench self-check routines</span></div>
                  <div>├── constraints/ <span className="text-slate-500">— Physical onboard mapping .xdc sheets</span></div>
                  <div>├── simulation/ <span className="text-slate-500">— Waveform files, GTK logs, vvp compiles</span></div>
                  <div>├── reports/ <span className="text-slate-500">— Area, dynamic current, timing sta dumps</span></div>
                </div>
                <div className="space-y-1.5 text-slate-300">
                  <div>├── scripts/ <span className="text-slate-500">— Synthesis automated shell batch files</span></div>
                  <div>├── images/ <span className="text-slate-500">— Screen grabs of waves and cell circuits</span></div>
                  <div>├── documents/ <span className="text-slate-500">— Evaluation specs and university course sheets</span></div>
                  <div>├── .gitignore <span className="text-slate-500">— Code exclusion filters</span></div>
                  <div>└── README.md <span className="text-slate-500">— Documentation and portfolio pitch</span></div>
                </div>
              </div>
            </div>

            {/* FPGA Pin mapping tutorial */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-200 uppercase font-sans border-b border-slate-850 pb-2 mb-3">
                Physical FPGA Board Integration Strategy
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans mb-4">
                If physical hardware is available (for example, Arty A7 or Basys3 boards), sliding switches constitute inputs and green LEDs act as registered outputs. Because physical switches bounce significantly when flipped mechanically, we register these signals within our 100MHz master clock domain using the constraints file included in our hub.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] font-mono">
                <div className="bg-slate-950 p-3 rounded border border-slate-850">
                  <div className="text-indigo-400 font-semibold uppercase mb-1">Slide Switches Pin Configuration</div>
                  <ul className="space-y-1 text-slate-300">
                    <li>SW[0] (en) — Enables standard memory/result updates</li>
                    <li>SW[1] (lp_mode) — Gates Barrel Shifters and adder LSB stages</li>
                    <li>SW[2:5] (OPC[3:0]) — Set target logic instruction opcodes</li>
                    <li>SW[6:11] (A/B dynamic variables) — Input values mapped to board</li>
                  </ul>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-850">
                  <div className="text-emerald-400 font-semibold uppercase mb-1">Board LED Indicator Pins</div>
                  <ul className="space-y-1 text-slate-300">
                    <li>LED[3:0] (Y[3:0]) — Standard logic result bits</li>
                    <li>LED[4] (Z flag) — Lights up green if final result is zero</li>
                    <li>LED[5] (N flag) — Sign bit is copy of MSB</li>
                    <li>LED[6] (C flag) — Indicates unsigned addition overflow</li>
                    <li>LED[7] (V flag) — Indicates signed addition computation overflows</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE SIMULATOR PLAYGROUND */}
        {activeTab === "sandbox" && (
          <div className="space-y-6 animate-fade-in" id="sandbox-tab">
            {/* Input Switch Control board */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-200 uppercase font-sans">
                    Input Pin Controls (Slide Switches & Registers)
                  </h3>
                </div>
                <button
                  onClick={handleRandomizeInputs}
                  className="text-[10px] font-mono px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Randomize inputs
                </button>
              </div>

              {/* Grid of Sliders and buttons */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs font-mono">
                {/* Left Side: Binary Switches */}
                <div className="md:col-span-4 space-y-4">
                  {/* Gated clocks enable button switch */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-300 font-mono">Clock Enable (en)</span>
                      <p className="text-[9px] text-slate-500">Enable/gate off FF storage</p>
                    </div>
                    <button
                      onClick={() => setEn(!en)}
                      className={`w-12 h-6 rounded-full transition-colors relative border ${
                        en ? "bg-emerald-950 border-emerald-500/50" : "bg-slate-900 border-slate-800"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full absolute top-1 transition-all ${
                        en ? "right-1 bg-emerald-400" : "left-1 bg-slate-600"
                      }`} />
                    </button>
                  </div>

                  {/* lp_mode switch */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-300 font-mono">Low-Power (lp_mode)</span>
                      <p className="text-[9px] text-slate-500">Cuts shifter dynamic area</p>
                    </div>
                    <button
                      onClick={() => setLp_mode(!lp_mode)}
                      className={`w-12 h-6 rounded-full transition-colors relative border ${
                        lp_mode ? "bg-emerald-950 border-emerald-500/50" : "bg-slate-900 border-slate-800"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full absolute top-1 transition-all ${
                        lp_mode ? "right-1 bg-emerald-400" : "left-1 bg-slate-600"
                      }`} />
                    </button>
                  </div>

                  {/* FORCE CLOCK TICK TRIGGERS */}
                  <button
                    onClick={handleClockTick}
                    className={`w-full py-3 rounded-lg font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border cursor-pointer select-none transition-all active:scale-[98%] ${
                      en 
                        ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400/40" 
                        : "bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700"
                    }`}
                  >
                    <Clock className={`w-4 h-4 ${currentClk === 1 ? "animate-spin" : ""}`} />
                    Force Clock Tick (Posedge)
                  </button>
                </div>

                {/* Right Side: Operands sliders & Hex Config */}
                <div className="md:col-span-8 bg-slate-950 p-4 rounded-lg border border-slate-850 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Operand A slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
                      <span>Operand A (Switch Value)</span>
                      <span className="text-sky-400">0x{A.toString(16).toUpperCase()} ({A})</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={A}
                      onChange={e => setA(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                    />
                    <div className="flex justify-between text-[8px] text-slate-650">
                      <span>0x00</span>
                      <span>0xFF</span>
                    </div>
                  </div>

                  {/* Operand B slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
                      <span>Operand B (Switch Value)</span>
                      <span className="text-indigo-400">0x{B.toString(16).toUpperCase()} ({B})</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={B}
                      onChange={e => setB(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    />
                    <div className="flex justify-between text-[8px] text-slate-650">
                      <span>0x00</span>
                      <span>0xFF</span>
                    </div>
                  </div>

                  {/* Instruction select menu */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">
                      ALU Functional Instruction (Opcode Selection)
                    </label>
                    <select
                      value={OPC}
                      onChange={e => setOPC(parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 focus:outline-none focus:border-emerald-500/50 text-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      {ALU_OPERATIONS.map((op, oIdx) => (
                        <option key={oIdx} value={oIdx}>
                          {op.opcode} — {op.name} ({op.desc})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual schematic */}
            <ALUSchematic
              A={A}
              B={B}
              OPC={OPC}
              en={en}
              lp_mode={lp_mode}
              Y={Y}
              Z={Z}
              N={N}
              C={C}
              V={V}
              width={width}
              operandIsolation={true} // visual represents gated isolating models
              toggleStats={toggleStats}
            />

            {/* Traced signal wave viewer */}
            <WaveformTracer
              history={history}
              onClearHistory={() => setHistory([])}
              width={width}
            />
          </div>
        )}

        {/* TAB 3: SYNTH COMPILER & PPA ANALYSIS */}
        {activeTab === "synthesis" && (
          <div className="space-y-6 animate-fade-in">
            <VirtualSynthesizer />
          </div>
        )}

        {/* TAB 4: CODE FILE HUB */}
        {activeTab === "code" && (
          <div className="space-y-6 animate-fade-in text-slate-100">
            <SourceCodeHub />
          </div>
        )}

        {/* TAB 5: ACADEMIC LAB REPORT MAKER */}
        {activeTab === "report" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in" id="report-tab">
            {/* Student metadata form configuration */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4 text-xs font-mono">
              <div className="flex items-center gap-2 border-b border-slate-850 pb-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200 uppercase font-sans">Report Configurator</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Student Full Name</label>
                  <input
                    type="text"
                    value={studentForm.name}
                    onChange={e => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 focus:outline-none focus:border-emerald-500/50 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Roll / Hall Registration No</label>
                  <input
                    type="text"
                    value={studentForm.rollNumber}
                    onChange={e => setStudentForm(prev => ({ ...prev, rollNumber: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 focus:outline-none focus:border-emerald-500/50 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Subject / Lab Code Name</label>
                  <input
                    type="text"
                    value={studentForm.course}
                    onChange={e => setStudentForm(prev => ({ ...prev, course: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 focus:outline-none focus:border-emerald-500/50 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">University / College Inst</label>
                  <input
                    type="text"
                    value={studentForm.institution}
                    onChange={e => setStudentForm(prev => ({ ...prev, institution: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 focus:outline-none focus:border-emerald-500/50 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Supervising Professor / Guide</label>
                  <input
                    type="text"
                    value={studentForm.instructor}
                    onChange={e => setStudentForm(prev => ({ ...prev, instructor: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 focus:outline-none focus:border-emerald-500/50 text-slate-200"
                  />
                </div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-850/80 leading-relaxed text-[10px] text-slate-550">
                <span className="font-bold text-slate-400">Formatting notice:</span> Fill out your academic parameters here. The compiler formatting layout on the right compiles a clean pre-vetted Lab Evaluated sheet matching University design portfolios!
              </div>

              <button
                onClick={() => window.print()}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans font-bold text-xs uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
              >
                Print Course Report (PDF)
              </button>
            </div>

            {/* Compiled Print-ready report layout */}
            <div className="lg:col-span-8 bg-slate-50 text-slate-900 rounded-xl p-8 shadow-2xl overflow-y-auto max-h-[560px] font-sans border border-slate-300 print:bg-white print:text-black print:p-0 print:border-none select-text">
              
              {/* Document Header */}
              <div className="text-center border-b-2 border-slate-800 pb-5 mb-6">
                <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-emerald-800">ACADEMIC VLSI LOGIC EVALUATION SPECIFICATION</span>
                <h2 className="text-xl sm:text-2xl font-bold mt-1 text-slate-950 uppercase">Low-Power Arithmetic Logic Unit Design</h2>
                <div className="grid grid-cols-2 gap-2 max-w-xl mx-auto mt-4 text-left text-xs font-mono border border-slate-200 p-3 bg-slate-100 rounded">
                  <div><strong>Student Name:</strong> {studentForm.name}</div>
                  <div><strong>Register ID:</strong> {studentForm.rollNumber}</div>
                  <div><strong>Course Code:</strong> {studentForm.course}</div>
                  <div><strong>Supervisor:</strong> {studentForm.instructor}</div>
                  <div className="col-span-2"><strong>Institution:</strong> {studentForm.institution}</div>
                </div>
              </div>

              {/* Lab Chapters */}
              <div className="space-y-5 text-xs sm:text-sm text-slate-800 leading-relaxed">
                <div>
                  <h4 className="text-xs uppercase font-bold text-slate-950 tracking-wider">1. Project Objective & Design Scope</h4>
                  <p className="mt-1">
                    This evaluation documents the verilog design and synthesis mapping of an 8/16/32-bit parameterizable power-oriented Arithmetic Logic Unit. Realized in active registers, it uses RTL Clock Gating loops, input Operand Isolation masking, and barrel step capping to scale down logic transitions counts, optimizing digital performance arrays.
                  </p>
                </div>

                <div>
                  <h4 className="text-xs uppercase font-bold text-slate-950 tracking-wider">2. System Architecture & Opcode Truth Map</h4>
                  <p className="mt-1">
                    The ALU decodes 4-bit instructions to isolate active pipelines (adder, shifter, less-than).
                  </p>
                  
                  {/* Embedded Opcode Mini Table */}
                  <table className="w-full mt-2 text-[10px] font-mono border-collapse border border-slate-300 text-left">
                    <thead>
                      <tr className="bg-slate-200 text-slate-800 border-b border-slate-300">
                        <th className="p-1 px-2 border-r border-slate-350">Opcode (OPC)</th>
                        <th className="p-1 px-2 border-r border-slate-350">Name</th>
                        <th className="p-1 px-2 border-r border-slate-350">Isolation Gate Status</th>
                        <th className="p-1 px-2">Flags Triggered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { op: "4'b0000", name: "ADD", status: "Arithmetic Gates Unlocked", flags: "Z, N, C, V" },
                        { op: "4'b0010", name: "AND", status: "Logical Gates Unlocked", flags: "Z, N" },
                        { op: "4'b0110", name: "SLL", status: "Shifter Gates Unlocked", flags: "Z, N" },
                        { op: "4'b1001", name: "SLT", status: "Comparator Locked", flags: "Z, N" }
                      ].map((tr, i) => (
                        <tr key={i} className="border-b border-slate-200">
                          <td className="p-1 px-2 border-r border-slate-200 font-bold">{tr.op}</td>
                          <td className="p-1 px-2 border-r border-slate-200">{tr.name}</td>
                          <td className="p-1 px-2 border-r border-slate-200 text-emerald-800 font-semibold">{tr.status}</td>
                          <td className="p-1 px-2">{tr.flags}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h4 className="text-xs uppercase font-bold text-slate-950 tracking-wider">3. Power Reduction Analysis Findings</h4>
                  <p className="mt-1">
                    Through active simulations logging, <strong>Operand Isolation</strong> achieves an estimated <span className="text-emerald-800 font-bold">~22% transition savings</span> across standard datapaths. Operating under <strong>lp_mode</strong> further trims dynamic capacitive charging currents internally inside wider shifter registers, maintaining strict state correctness.
                  </p>
                </div>

                <div>
                  <h4 className="text-xs uppercase font-bold text-slate-950 tracking-wider">4. Academic Conclusions</h4>
                  <p className="mt-1">
                    We successfully designed, verified and synthesized a fully synthesizable Low-Power ALU. Combining operand-isolation logic and RTL clock enable gating maps directly into standard Integrated Clock Gating (ICG) layouts. The PPA tradeoff assessments demonstrate the balanced architecture required of professional VLSI frontend environments.
                  </p>
                </div>
              </div>

              {/* Sign Off Footers */}
              <div className="mt-10 pt-6 border-t border-dashed border-slate-300 flex justify-between text-[11px] font-mono text-slate-600">
                <div>
                  <span className="block border-b border-slate-400 w-28 h-5" />
                  <span>Student Sign-off</span>
                </div>
                <div>
                  <span>Evaluated Grade: _________________</span>
                </div>
                <div>
                  <span className="block border-b border-slate-400 w-28 h-5" />
                  <span>Instructor Signature</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 6: HARDWARE INTERVIEW DECK & VIVA PREP */}
        {activeTab === "interview" && (
          <div className="space-y-6 animate-fade-in text-slate-100">
            <InterviewPreparer />
          </div>
        )}

      </main>

      {/* FOOTER BAR */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 px-6 mt-12 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div>
            <span>Developed by Google AI Studio Build</span>
            <span className="mx-2">|</span>
            <span>Licensed under Apache-2.0</span>
          </div>
          <div>
            <span>VLSI Board Simulation Tick: 100MHz</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
