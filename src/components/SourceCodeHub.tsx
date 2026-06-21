import React, { useState } from "react";
import { Copy, Check, Download, Folder, FileCode, Terminal, HelpCircle } from "lucide-react";
import { 
  RTL_ALU_CODE, 
  RTL_ADDER_CODE, 
  TB_ALU_CODE, 
  XDC_CONSTRAINTS, 
  YOSYS_SCRIPT, 
  GITIGNORE_CONTENT,
  README_GEN
} from "../data/alu_project_data";

interface SourceFile {
  name: string;
  path: string;
  lang: "verilog" | "yaml" | "tcl" | "markdown" | "text";
  code: string;
  desc: string;
}

const FILES: SourceFile[] = [
  {
    name: "alu.v (Top RTL)",
    path: "rtl/alu.v",
    lang: "verilog",
    code: RTL_ALU_CODE,
    desc: "Top level synthesizable logic containing the control path decoders, operand isolation bypasses, barrel shift masking, and gated registers."
  },
  {
    name: "adder.v (Sub-module)",
    path: "rtl/adder.v",
    lang: "verilog",
    code: RTL_ADDER_CODE,
    desc: "Arithmetic component configurable to instantiate Ripple Carry or Carry Lookahead adders. Gates input LSBs in low-power modes."
  },
  {
    name: "alu_tb.v (Simulation)",
    path: "tb/alu_tb.v",
    lang: "verilog",
    code: TB_ALU_CODE,
    desc: "Self-checking testbench to verify correct operational states and record dynamic switching toggle outputs via VCD dump files."
  },
  {
    name: "alu_constraints.xdc",
    path: "constraints/alu_constraints.xdc",
    lang: "tcl",
    code: XDC_CONSTRAINTS,
    desc: "Vivado package pin constraints configuring physical switches and buttons for the Arty A7 FPGA board."
  },
  {
    name: "synth.ys (Yosys Script)",
    path: "scripts/synth.ys",
    lang: "tcl",
    code: YOSYS_SCRIPT,
    desc: "Yosys Open Synthesis commands to optimize, elaborate, and report gate area counts."
  },
  {
    name: ".gitignore",
    path: ".gitignore",
    lang: "text",
    code: GITIGNORE_CONTENT,
    desc: "Standard exclusion configurations prevent bloating the GitHub repository with raw simulator dumps and waveform VCD lines."
  },
  {
    name: "README.md",
    path: "README.md",
    lang: "markdown",
    code: README_GEN,
    desc: "A fully pre-formatted GitHub portfolio README documenting objectives, architecture, tools, and how-to guides."
  }
];

export default function SourceCodeHub() {
  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const activeFile = FILES[selectedFileIdx];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (file: SourceFile) => {
    const blob = new Blob([file.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // Download naming convention matches exact path
    const parts = file.path.split("/");
    link.download = parts[parts.length - 1];
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="code-hub-panel">
      {/* File Tree Directory */}
      <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-4">
            <Folder className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-slate-200 uppercase font-sans">Project Workspace Node</span>
          </div>

          <div className="space-y-1">
            {FILES.map((file, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedFileIdx(idx)}
                className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors border ${
                  selectedFileIdx === idx
                    ? "bg-slate-950 border-emerald-500/50 text-slate-100"
                    : "bg-transparent border-transparent text-slate-400 hover:bg-slate-950/40 hover:text-slate-300"
                }`}
              >
                <FileCode className={`w-4 h-4 shrink-0 mt-0.5 ${
                  selectedFileIdx === idx ? "text-emerald-400" : "text-slate-500"
                }`} />
                <div className="font-mono text-[11px] truncate">
                  <div className="font-semibold">{file.name}</div>
                  <div className="text-[9px] text-slate-500">{file.path}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Global Download Pack info */}
        <div className="mt-6 border-t border-slate-850 pt-4 bg-slate-950/40 p-3 rounded-lg border border-slate-900">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wide flex items-center gap-1.5 font-bold mb-1">
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            Student Packaging Guide
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
            Download individual files or copy their contents into raw directories matching the structure outlined in the README to guarantee a compilable, synthesizable build!
          </p>
          <button 
            onClick={() => FILES.forEach(f => handleDownload(f))}
            className="w-full mt-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[10px] uppercase font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-750"
          >
            <Download className="w-3.5 h-3.5" />
            Download Source Bundle
          </button>
        </div>
      </div>

      {/* Code Editor Preview panel */}
      <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col justify-between">
        {/* Editor Title Bar */}
        <div className="bg-slate-950 px-4 py-2 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-mono text-slate-400 tracking-wide font-bold">{activeFile.path}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800/80 transition-all flex items-center gap-1 font-mono text-[10px]"
              title="Copy Code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={() => handleDownload(activeFile)}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800/80 transition-all flex items-center gap-1 font-mono text-[10px]"
              title="Download File"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        </div>

        {/* File description banner */}
        <div className="bg-slate-950/60 p-3 border-b border-slate-850/80 flex gap-2.5 items-start text-[10.5px] font-mono text-slate-400">
          <HelpCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-300">Description: </strong> {activeFile.desc}
          </span>
        </div>

        {/* Text Code block */}
        <div className="bg-slate-950 p-4 font-mono text-xs overflow-auto h-[380px] text-slate-300 select-all border-b border-slate-850">
          <pre className="whitespace-pre">{activeFile.code}</pre>
        </div>

        {/* Dynamic line count block */}
        <div className="bg-slate-950 px-4 py-1.5 flex justify-between items-center text-[10px] font-mono text-slate-500">
          <span>Encoding: UTF-8</span>
          <span>Lines: {activeFile.code.split("\n").length}</span>
          <span>Language: {activeFile.lang.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
