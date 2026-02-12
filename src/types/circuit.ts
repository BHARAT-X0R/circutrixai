export interface CircuitSpec {
  type: string;
  topology: string;
  parameters: Record<string, number | string>;
  components: ComponentValue[];
  nodes: CircuitNode[];
  connections: CircuitConnection[];
  analysis: CircuitAnalysis;
}

export interface ComponentValue {
  id: string;
  type: 'resistor' | 'capacitor' | 'inductor' | 'transistor' | 'opamp' | 'diode' | 'voltage_source' | 'ground';
  label: string;
  value: string;
  unit: string;
  x: number;
  y: number;
  power?: number;
  tolerance?: string;
}

export interface CircuitNode {
  id: string;
  label: string;
  x: number;
  y: number;
  voltage: number;
  type: 'input' | 'output' | 'supply' | 'ground' | 'internal';
}

export interface CircuitConnection {
  from: string;
  to: string;
  current: number;
  path: { x: number; y: number }[];
}

export interface FrequencyResponsePoint {
  frequency: number;
  gainDb: number;
  phaseDeg: number;
}

export interface CircuitAnalysis {
  dcOperatingPoint: { node: string; voltage: number; unit: string }[];
  voltageGain?: number;
  currentGain?: number;
  bandwidth?: { low: number; high: number; unit: string };
  inputImpedance?: number;
  outputImpedance?: number;
  powerDissipation: number;
  calculations: CalculationStep[];
  frequencyResponse?: FrequencyResponsePoint[];
  gainBandwidthProduct?: number;
  cutoffFrequency?: number;
  rolloffRate?: number;
}

export interface CalculationStep {
  title: string;
  formula: string;
  substitution: string;
  result: string;
  explanation: string;
}

export type DesignType = 'circuit' | 'circuit_sim' | 'circuit_pcb';
export type ExportFormat = 'pdf' | 'svg' | 'kicad' | 'spice' | 'csv' | 'gerber';
