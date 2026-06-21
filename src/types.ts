export interface SimSignalEvent {
  time: number;
  clk: number;
  en: number;
  lp_mode: number;
  A: number;
  B: number;
  OPC: number;
  opcodeName: string;
  Y: number;
  Z: number;
  N: number;
  C: number;
  V: number;
}

export interface SynthParams {
  width: 8 | 16 | 32;
  useCLA: boolean;
  operandIsolation: boolean;
  clockGating: boolean;
  approxLSB: number;
}

export interface SynthReport {
  cellCount: {
    luts: number;
    flipflops: number;
    muxes: number;
    gatingCells: number;
    total: number;
  };
  ppa: {
    dynamicPower: number; // in uW
    staticPower: number;  // in uW
    totalPower: number;   // in uW
    criticalDelay: number; // in ns
    maxFreq: number;      // in MHz
    areaIndex: number;    // relative score
  };
  toggleReduction: number; // %
}
