import React from "react";
import { Activity, Download } from "lucide-react";
import { SimSignalEvent } from "../types";

interface WaveformTracerProps {
  history: SimSignalEvent[];
  onClearHistory: () => void;
  width: number;
}

export default function WaveformTracer({ history, onClearHistory, width }: WaveformTracerProps) {
  // SVG drawing dimensions config
  const cellWidth = 50;
  const signalHeight = 35;
  const signalSpacing = 12;
  const labelWidth = 100;
  const borderPadding = 15;

  const paddedHistory = history.length > 0 
    ? history.slice(-16) // last 16 cycles
    : [];

  const totalCycles = Math.max(12, paddedHistory.length);
  const svgWidth = labelWidth + (totalCycles * cellWidth) + (borderPadding * 2);
  
  // Wave signals list to render
  const waveSignals = [
    { key: "clk", name: "clk", type: "digital" },
    { key: "en", name: "en (Enable)", type: "digital" },
    { key: "lp_mode", name: "lp_mode", type: "digital" },
    { key: "A", name: "A [Bus]", type: "bus" },
    { key: "B", name: "B [Bus]", type: "bus" },
    { key: "OPC", name: "OPC [3:0]", type: "bus" },
    { key: "Y", name: "Y [Bus]", type: "bus" },
    { key: "Z", name: "Z (Zero)", type: "digital" },
    { key: "N", name: "N (Sign)", type: "digital" },
    { key: "C", name: "C (Carry)", type: "digital" },
    { key: "V", name: "V (Ovf)", type: "digital" }
  ];

  const svgHeight = (waveSignals.length * (signalHeight + signalSpacing)) + (borderPadding * 2) + 20;

  // Generate Digital Line Points
  const getDigitalPath = (key: string) => {
    let path = `M ${labelWidth} ${signalHeight / 2}`;
    if (paddedHistory.length === 0) {
      // draw a default low line
      path += ` L ${svgWidth - borderPadding} ${signalHeight / 2}`;
      return path;
    }

    let prevVal: number | null = null;
    paddedHistory.forEach((cycle, index) => {
      const x = labelWidth + (index * cellWidth);
      const val = (cycle as any)[key] ? 1 : 0;
      const yOffset = val === 1 ? -10 : 10; // high is up, low is down
      const centerY = signalHeight / 2;
      const targetY = centerY + yOffset;

      if (index === 0) {
        path = `M ${x} ${targetY}`;
      } else {
        if (val !== prevVal) {
          // vertical transition line
          path += ` L ${x} ${targetY}`;
        }
        path += ` L ${x + cellWidth} ${targetY}`;
      }
      prevVal = val;
    });

    // extend last cycle
    if (paddedHistory.length < totalCycles) {
      const startX = labelWidth + (paddedHistory.length * cellWidth);
      const endX = labelWidth + (totalCycles * cellWidth);
      const lastVal = (paddedHistory[paddedHistory.length - 1] as any)[key] ? 1 : 0;
      const yOffset = lastVal === 1 ? -10 : 10;
      path += ` L ${startX} ${signalHeight / 2 + yOffset} L ${endX} ${signalHeight / 2 + yOffset}`;
    }

    return path;
  };

  // Generate Bus Wave Polygons
  const renderBusEvents = (key: string, centerY: number) => {
    if (paddedHistory.length === 0) {
      // render flat line
      return (
        <line 
          x1={labelWidth} 
          y1={centerY} 
          x2={labelWidth + (totalCycles * cellWidth)} 
          y2={centerY} 
          stroke="#475569" 
          strokeWidth="1.5" 
        />
      );
    }

    // Accumulate blocks of duplicate values
    const segments: { start: number; count: number; val: number; label: string }[] = [];
    let curSeg: { start: number; count: number; val: number; label: string } | null = null;

    paddedHistory.forEach((cycle, index) => {
      const val = (cycle as any)[key] as number;
      let label = "";
      if (key === "OPC") {
        label = cycle.opcodeName;
      } else {
        label = `0x${val.toString(16).toUpperCase()}`;
      }

      if (!curSeg) {
        curSeg = { start: index, count: 1, val, label };
      } else if (curSeg.val === val) {
        curSeg.count++;
      } else {
        segments.push(curSeg);
        curSeg = { start: index, count: 1, val, label };
      }
    });
    if (curSeg) segments.push(curSeg);

    return segments.map((seg, i) => {
      const x1 = labelWidth + (seg.start * cellWidth);
      const x2 = x1 + (seg.count * cellWidth);
      const yTop = centerY - 10;
      const yBottom = centerY + 10;

      // Hexagon shape path for standard bus transition
      const d = `M ${x1} ${centerY} L ${x1 + 3} ${yTop} L ${x2 - 3} ${yTop} L ${x2} ${centerY} L ${x2 - 3} ${yBottom} L ${x1 + 3} ${yBottom} Z`;

      return (
        <g key={i}>
          <path 
            d={d} 
            fill="#0f172a" 
            stroke={key === "Y" ? "#10b981" : "#38bdf8"} 
            strokeWidth="1.5" 
          />
          <text 
            x={(x1 + x2) / 2} 
            y={centerY + 3} 
            fill={key === "Y" ? "#a7f3d0" : "#e2e8f0"} 
            fontSize="9 font-mono" 
            fontWeight="bold"
            textAnchor="middle"
            className="select-none truncate"
          >
            {seg.label.length > 8 ? seg.label.slice(0, 7) + ".." : seg.label}
          </text>
        </g>
      );
    });
  };

  // Export logs to txt file downloder
  const handleExportLogs = () => {
    if (history.length === 0) return;
    const header = "TIME_ns\tCLK\tEN\tLP_MODE\tOPCODE\tA_HEX\tB_HEX\tY_HEX\tFLAGS(ZNCV)\n";
    const body = history.map(evt => {
      const formatHex = (n: number) => n.toString(16).toUpperCase();
      const zncv = `${evt.Z}${evt.N}${evt.C}${evt.V}`;
      return `${evt.time}\t${evt.clk}\t${evt.en}\t${evt.lp_mode}\t${evt.opcodeName}\t${formatHex(evt.A)}\t${formatHex(evt.B)}\t${formatHex(evt.Y)}\t${zncv}`;
    }).join("\n");

    const blob = new Blob([header + body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "alu_simulation_log.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl relative" id="waveform-panel">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 mb-5 gap-3">
        <div>
          <h3 className="text-sm font-semibold text-emerald-400 font-sans uppercase flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-sky-400" />
            GTKWave Logic Signal Analyzer
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Displays registered clock transition events & carry propagation cascades
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportLogs}
            disabled={history.length === 0}
            className="text-[11px] font-mono font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 hover:bg-slate-700 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            VCD Event Logs
          </button>
          <button 
            onClick={onClearHistory}
            disabled={history.length === 0}
            className="text-[11px] font-mono font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 px-2 rounded-lg transition-colors border border-transparent"
          >
            Clear Waves
          </button>
        </div>
      </div>

      {paddedHistory.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-lg py-12 text-center text-slate-500 font-mono text-xs">
          No simulation runs registered yet.
          <br />
          <span className="text-slate-600 text-[11px]">
            Please toggle input signals and push "Force Clock Tick" above to start plotting waves.
          </span>
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-950 p-4 rounded-lg border border-slate-800/85">
          <svg width={svgWidth} height={svgHeight} className="mx-auto select-none">
            {/* Draw Vertical Timing Division Grids */}
            {Array.from({ length: totalCycles + 1 }).map((_, idx) => {
              const x = labelWidth + (idx * cellWidth);
              const isEventIdx = idx < paddedHistory.length;
              return (
                <g key={idx}>
                  <line 
                    x1={x} 
                    y1={10} 
                    x2={x} 
                    y2={svgHeight - 25} 
                    stroke="#1e293b" 
                    strokeWidth="1" 
                    strokeDasharray="2,2" 
                  />
                  {isEventIdx && (
                    <text 
                      x={x + (cellWidth / 2)} 
                      y={svgHeight - 10} 
                      fill="#64748b" 
                      fontSize="9 font-mono" 
                      textAnchor="middle"
                    >
                      {paddedHistory[idx].time}ns
                    </text>
                  )}
                </g>
              );
            })}

            {/* Render Each Signal Row */}
            {waveSignals.map((sig, sIdx) => {
              const centerY = borderPadding + (sIdx * (signalHeight + signalSpacing)) + (signalHeight / 2);
              return (
                <g key={sig.key} transform={`translate(0, 0)`}>
                  {/* Row Boundary guideline */}
                  <line 
                    x1={0} 
                    y1={centerY + signalHeight / 2 + (signalSpacing / 2)} 
                    x2={svgWidth} 
                    y2={centerY + signalHeight / 2 + (signalSpacing / 2)} 
                    stroke="#111827" 
                    strokeWidth="1" 
                  />

                  {/* Signal Label Name column */}
                  <text 
                    x={10} 
                    y={centerY + 3} 
                    fill={sig.key === "Y" ? "#10b981" : sig.key === "clk" ? "#f43f5e" : "#94a3b8"} 
                    fontSize="11" 
                    fontWeight="600"
                    fontFamily="monospace"
                  >
                    {sig.name}
                  </text>

                  {/* Draw according to Signal Typology */}
                  {sig.type === "digital" ? (
                    <path 
                      d={getDigitalPath(sig.key)} 
                      fill="none" 
                      stroke={sig.key === "clk" ? "#f43f5e" : sig.key === "en" ? "#10b981" : "#3b82f6"} 
                      strokeWidth="2" 
                      strokeLinejoin="miter"
                      transform={`translate(0, ${centerY - (signalHeight / 2)})`}
                    />
                  ) : (
                    renderBusEvents(sig.key, centerY)
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
      
      <div className="flex justify-between items-center mt-3 text-[10px] font-mono text-slate-500 bg-slate-950/40 p-2 rounded border border-slate-900">
        <div>
          <span>Trace Zoom: </span>
          <span className="text-sky-400 font-bold">1X</span>
        </div>
        <div>
          <span>VCD Scope: </span>
          <span className="text-slate-400">alu_tb/dut/*</span>
        </div>
        <div>
          <span>System Grid: </span>
          <span className="text-slate-400">10ns step</span>
        </div>
      </div>
    </div>
  );
}
