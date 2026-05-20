import { CircuitSpec } from "@/types/circuit";
import { round, nearestStandard, formatResistance, formatResUnit, formatCapacitance, formatCapUnit } from "./circuit-utils";

// ─── Helpers ──────────────────────────────────────────────────
function fmtL(L: number): { value: string; unit: string } {
  if (L >= 1e-3) return { value: (L * 1e3).toFixed(2), unit: "mH" };
  if (L >= 1e-6) return { value: (L * 1e6).toFixed(2), unit: "µH" };
  return { value: (L * 1e9).toFixed(0), unit: "nH" };
}

// ─── Hartley Oscillator (LC, tapped inductor) ─────────────────
export function generateHartleyOscillator(p: Record<string, number | string>): CircuitSpec {
  const Vcc = Number(p.Vcc) || 12;
  const freq = Number(p.freq) || 100000; // 100kHz default
  // Choose total L based on a reasonable C
  const C = 1e-9; // 1nF tank cap
  const Ltotal = 1 / (Math.pow(2 * Math.PI * freq, 2) * C);
  const L1 = Ltotal * 0.2; // tap ratio
  const L2 = Ltotal * 0.8;
  const f_actual = 1 / (2 * Math.PI * Math.sqrt((L1 + L2) * C));
  const L1f = fmtL(L1);
  const L2f = fmtL(L2);
  const Cf = formatCapacitance(C);
  const Cu = formatCapUnit(C);

  // Bias network for BJT (CE-like)
  const R1 = nearestStandard(47000);
  const R2 = nearestStandard(10000);
  const Re = nearestStandard(1000);
  const Cb = 10e-9; // coupling/bypass

  return {
    type: "Hartley Oscillator",
    topology: "hartley_lc",
    parameters: { frequency: round(f_actual), Vcc },
    components: [
      { id: "vcc", type: "voltage_source", label: "Vcc", value: String(Vcc), unit: "V", x: 360, y: 50 },
      { id: "r1", type: "resistor", label: "R1", value: formatResistance(R1), unit: formatResUnit(R1), x: 140, y: 130, rotation: 90 },
      { id: "r2", type: "resistor", label: "R2", value: formatResistance(R2), unit: formatResUnit(R2), x: 140, y: 280, rotation: 90 },
      { id: "re", type: "resistor", label: "RE", value: formatResistance(Re), unit: formatResUnit(Re), x: 280, y: 360, rotation: 90 },
      { id: "q1", type: "transistor", label: "Q1", value: "2N3904", unit: "", x: 280, y: 220 },
      { id: "l1", type: "inductor", label: "L1", value: L1f.value, unit: L1f.unit, x: 460, y: 260, rotation: 90 },
      { id: "l2", type: "inductor", label: "L2", value: L2f.value, unit: L2f.unit, x: 460, y: 160, rotation: 90 },
      { id: "c1", type: "capacitor", label: "C (tank)", value: Cf, unit: Cu, x: 560, y: 210, rotation: 90 },
      { id: "cb", type: "capacitor", label: "Cb", value: formatCapacitance(Cb), unit: formatCapUnit(Cb), x: 200, y: 210 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 280, y: 430 },
    ],
    nodes: [
      { id: "n_vcc", label: "Vcc", x: 360, y: 50, voltage: Vcc, type: "supply" },
      { id: "n_b", label: "B", x: 140, y: 210, voltage: round(Vcc * R2 / (R1 + R2)), type: "internal" },
      { id: "n_c", label: "C", x: 460, y: 210, voltage: round(Vcc * 0.6), type: "output" },
      { id: "n_e", label: "E", x: 280, y: 280, voltage: round(Vcc * 0.1), type: "internal" },
      { id: "n_tap", label: "tap", x: 460, y: 210, voltage: 0, type: "internal" },
      { id: "n_gnd", label: "GND", x: 280, y: 430, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_vcc", to: "r1", current: 0, path: [{ x: 360, y: 50 }, { x: 140, y: 50 }, { x: 140, y: 105 }] },
      { from: "r1", to: "n_b", current: 0, path: [{ x: 140, y: 155 }, { x: 140, y: 210 }] },
      { from: "n_b", to: "r2", current: 0, path: [{ x: 140, y: 210 }, { x: 140, y: 255 }] },
      { from: "r2", to: "n_gnd", current: 0, path: [{ x: 140, y: 305 }, { x: 140, y: 430 }, { x: 280, y: 430 }] },
      { from: "n_b", to: "cb", current: 0, path: [{ x: 140, y: 210 }, { x: 185, y: 210 }] },
      { from: "cb", to: "q1", current: 0, path: [{ x: 215, y: 210 }, { x: 255, y: 210 }] },
      { from: "q1", to: "re", current: 0, path: [{ x: 280, y: 240 }, { x: 280, y: 335 }] },
      { from: "re", to: "n_gnd", current: 0, path: [{ x: 280, y: 385 }, { x: 280, y: 430 }] },
      { from: "q1", to: "l1", current: 0, path: [{ x: 280, y: 200 }, { x: 460, y: 200 }, { x: 460, y: 185 }] },
      { from: "l2", to: "n_vcc", current: 0, path: [{ x: 460, y: 135 }, { x: 460, y: 50 }, { x: 360, y: 50 }] },
      { from: "l1", to: "l2", current: 0, path: [{ x: 460, y: 235 }, { x: 460, y: 210 }, { x: 460, y: 185 }] },
      { from: "l1", to: "c1", current: 0, path: [{ x: 460, y: 285 }, { x: 460, y: 320 }, { x: 560, y: 320 }, { x: 560, y: 235 }] },
      { from: "c1", to: "l2", current: 0, path: [{ x: 560, y: 185 }, { x: 560, y: 130 }, { x: 460, y: 130 }, { x: 460, y: 135 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "Vcc", voltage: Vcc, unit: "V" },
        { node: "f_osc", voltage: round(f_actual), unit: "Hz" },
      ],
      powerDissipation: round(Vcc * 0.005 * 1000),
      bandwidth: { low: round(f_actual), high: round(f_actual), unit: "Hz" },
      calculations: [
        { title: "Oscillation Frequency", formula: "f = 1 / (2π√((L1+L2)·C))", substitution: `1 / (2π√((${L1f.value}${L1f.unit}+${L2f.value}${L2f.unit})·${Cf}${Cu}))`, result: `f ≈ ${round(f_actual)} Hz`, explanation: "Hartley tank resonant frequency with tapped inductor." },
        { title: "Feedback Ratio", formula: "β = L1 / L2", substitution: `${L1f.value}/${L2f.value}`, result: `β ≈ ${(L1 / L2).toFixed(2)}`, explanation: "Tap ratio sets loop gain; choose to satisfy Barkhausen |Aβ|≥1." },
      ],
    },
  };
}

// ─── Colpitts Oscillator (LC, tapped capacitors) ──────────────
export function generateColpittsOscillator(p: Record<string, number | string>): CircuitSpec {
  const Vcc = Number(p.Vcc) || 12;
  const freq = Number(p.freq) || 100000;
  const C1 = 2.2e-9;
  const C2 = 22e-9;
  const Cs = (C1 * C2) / (C1 + C2);
  const L = 1 / (Math.pow(2 * Math.PI * freq, 2) * Cs);
  const f_actual = 1 / (2 * Math.PI * Math.sqrt(L * Cs));
  const Lf = fmtL(L);

  const R1 = nearestStandard(47000);
  const R2 = nearestStandard(10000);
  const Re = nearestStandard(1000);
  const Cb = 10e-9;

  return {
    type: "Colpitts Oscillator",
    topology: "colpitts_lc",
    parameters: { frequency: round(f_actual), Vcc },
    components: [
      { id: "vcc", type: "voltage_source", label: "Vcc", value: String(Vcc), unit: "V", x: 360, y: 50 },
      { id: "r1", type: "resistor", label: "R1", value: formatResistance(R1), unit: formatResUnit(R1), x: 140, y: 130, rotation: 90 },
      { id: "r2", type: "resistor", label: "R2", value: formatResistance(R2), unit: formatResUnit(R2), x: 140, y: 280, rotation: 90 },
      { id: "re", type: "resistor", label: "RE", value: formatResistance(Re), unit: formatResUnit(Re), x: 280, y: 360, rotation: 90 },
      { id: "q1", type: "transistor", label: "Q1", value: "2N3904", unit: "", x: 280, y: 220 },
      { id: "l1", type: "inductor", label: "L", value: Lf.value, unit: Lf.unit, x: 460, y: 130, rotation: 90 },
      { id: "c1", type: "capacitor", label: "C1", value: formatCapacitance(C1), unit: formatCapUnit(C1), x: 460, y: 250, rotation: 90 },
      { id: "c2", type: "capacitor", label: "C2", value: formatCapacitance(C2), unit: formatCapUnit(C2), x: 460, y: 360, rotation: 90 },
      { id: "cb", type: "capacitor", label: "Cb", value: formatCapacitance(Cb), unit: formatCapUnit(Cb), x: 200, y: 210 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 280, y: 430 },
    ],
    nodes: [
      { id: "n_vcc", label: "Vcc", x: 360, y: 50, voltage: Vcc, type: "supply" },
      { id: "n_b", label: "B", x: 140, y: 210, voltage: round(Vcc * R2 / (R1 + R2)), type: "internal" },
      { id: "n_c", label: "C", x: 460, y: 200, voltage: round(Vcc * 0.6), type: "output" },
      { id: "n_tap", label: "tap", x: 460, y: 305, voltage: round(Vcc * 0.1), type: "internal" },
      { id: "n_e", label: "E", x: 280, y: 280, voltage: round(Vcc * 0.1), type: "internal" },
      { id: "n_gnd", label: "GND", x: 280, y: 430, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_vcc", to: "r1", current: 0, path: [{ x: 360, y: 50 }, { x: 140, y: 50 }, { x: 140, y: 105 }] },
      { from: "r1", to: "n_b", current: 0, path: [{ x: 140, y: 155 }, { x: 140, y: 210 }] },
      { from: "n_b", to: "r2", current: 0, path: [{ x: 140, y: 210 }, { x: 140, y: 255 }] },
      { from: "r2", to: "n_gnd", current: 0, path: [{ x: 140, y: 305 }, { x: 140, y: 430 }, { x: 280, y: 430 }] },
      { from: "n_b", to: "cb", current: 0, path: [{ x: 140, y: 210 }, { x: 185, y: 210 }] },
      { from: "cb", to: "q1", current: 0, path: [{ x: 215, y: 210 }, { x: 255, y: 210 }] },
      { from: "q1", to: "re", current: 0, path: [{ x: 280, y: 240 }, { x: 280, y: 335 }] },
      { from: "re", to: "n_gnd", current: 0, path: [{ x: 280, y: 385 }, { x: 280, y: 430 }] },
      { from: "q1", to: "l1", current: 0, path: [{ x: 280, y: 200 }, { x: 460, y: 200 }, { x: 460, y: 155 }] },
      { from: "l1", to: "n_vcc", current: 0, path: [{ x: 460, y: 105 }, { x: 460, y: 50 }, { x: 360, y: 50 }] },
      { from: "n_c", to: "c1", current: 0, path: [{ x: 460, y: 200 }, { x: 460, y: 225 }] },
      { from: "c1", to: "n_tap", current: 0, path: [{ x: 460, y: 275 }, { x: 460, y: 305 }] },
      { from: "n_tap", to: "c2", current: 0, path: [{ x: 460, y: 305 }, { x: 460, y: 335 }] },
      { from: "c2", to: "n_gnd", current: 0, path: [{ x: 460, y: 385 }, { x: 460, y: 430 }, { x: 280, y: 430 }] },
      { from: "n_tap", to: "q1", current: 0, path: [{ x: 460, y: 305 }, { x: 380, y: 305 }, { x: 380, y: 240 }, { x: 280, y: 240 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "Vcc", voltage: Vcc, unit: "V" },
        { node: "f_osc", voltage: round(f_actual), unit: "Hz" },
      ],
      powerDissipation: round(Vcc * 0.005 * 1000),
      bandwidth: { low: round(f_actual), high: round(f_actual), unit: "Hz" },
      calculations: [
        { title: "Series Tank Capacitance", formula: "Cs = C1·C2 / (C1+C2)", substitution: `(${formatCapacitance(C1)}·${formatCapacitance(C2)})/(${formatCapacitance(C1)}+${formatCapacitance(C2)})`, result: `Cs ≈ ${formatCapacitance(Cs)} ${formatCapUnit(Cs)}`, explanation: "Capacitive divider forms tank with L." },
        { title: "Oscillation Frequency", formula: "f = 1 / (2π√(L·Cs))", substitution: `1 / (2π√(${Lf.value}${Lf.unit}·${formatCapacitance(Cs)}${formatCapUnit(Cs)}))`, result: `f ≈ ${round(f_actual)} Hz`, explanation: "Colpitts resonant frequency." },
        { title: "Feedback Ratio", formula: "β = C1 / C2", substitution: `${formatCapacitance(C1)}/${formatCapacitance(C2)}`, result: `β ≈ ${(C1 / C2).toFixed(2)}`, explanation: "Capacitive tap ratio determines feedback." },
      ],
    },
  };
}

// ─── RC Phase-Shift Oscillator (BJT, 3 RC sections, 180°) ────
export function generatePhaseShiftOscillator(p: Record<string, number | string>): CircuitSpec {
  const Vcc = Number(p.Vcc) || 12;
  const freq = Number(p.freq) || 1000;
  // f = 1 / (2π·R·C·√6)
  const C = 10e-9;
  const R = 1 / (2 * Math.PI * freq * C * Math.sqrt(6));
  const Rv = nearestStandard(R);
  const f_actual = 1 / (2 * Math.PI * Rv * C * Math.sqrt(6));
  const Cf = formatCapacitance(C);
  const Cu = formatCapUnit(C);

  const R1 = nearestStandard(47000);
  const R2 = nearestStandard(10000);
  const Rc = nearestStandard(4700);
  const Re = nearestStandard(1000);

  return {
    type: "RC Phase-Shift Oscillator",
    topology: "rc_phase_shift",
    parameters: { frequency: round(f_actual), Vcc },
    components: [
      { id: "vcc", type: "voltage_source", label: "Vcc", value: String(Vcc), unit: "V", x: 380, y: 50 },
      { id: "r1", type: "resistor", label: "R1", value: formatResistance(R1), unit: formatResUnit(R1), x: 140, y: 130, rotation: 90 },
      { id: "r2", type: "resistor", label: "R2", value: formatResistance(R2), unit: formatResUnit(R2), x: 140, y: 280, rotation: 90 },
      { id: "rc", type: "resistor", label: "Rc", value: formatResistance(Rc), unit: formatResUnit(Rc), x: 280, y: 130, rotation: 90 },
      { id: "re", type: "resistor", label: "RE", value: formatResistance(Re), unit: formatResUnit(Re), x: 280, y: 340, rotation: 90 },
      { id: "q1", type: "transistor", label: "Q1", value: "2N3904", unit: "", x: 280, y: 220 },
      { id: "c1", type: "capacitor", label: "C1", value: Cf, unit: Cu, x: 360, y: 200 },
      { id: "r_a", type: "resistor", label: "Ra", value: formatResistance(Rv), unit: formatResUnit(Rv), x: 400, y: 280, rotation: 90 },
      { id: "c2", type: "capacitor", label: "C2", value: Cf, unit: Cu, x: 460, y: 200 },
      { id: "r_b", type: "resistor", label: "Rb", value: formatResistance(Rv), unit: formatResUnit(Rv), x: 500, y: 280, rotation: 90 },
      { id: "c3", type: "capacitor", label: "C3", value: Cf, unit: Cu, x: 560, y: 200 },
      { id: "r_c", type: "resistor", label: "Rc3", value: formatResistance(Rv), unit: formatResUnit(Rv), x: 600, y: 280, rotation: 90 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 280, y: 410 },
    ],
    nodes: [
      { id: "n_vcc", label: "Vcc", x: 380, y: 50, voltage: Vcc, type: "supply" },
      { id: "n_b", label: "B", x: 140, y: 210, voltage: round(Vcc * R2 / (R1 + R2)), type: "internal" },
      { id: "n_c", label: "C", x: 280, y: 200, voltage: round(Vcc * 0.5), type: "output" },
      { id: "n_e", label: "E", x: 280, y: 280, voltage: round(Vcc * 0.1), type: "internal" },
      { id: "n_p1", label: "P1", x: 400, y: 200, voltage: 0, type: "internal" },
      { id: "n_p2", label: "P2", x: 500, y: 200, voltage: 0, type: "internal" },
      { id: "n_p3", label: "P3", x: 600, y: 200, voltage: 0, type: "internal" },
      { id: "n_gnd", label: "GND", x: 280, y: 410, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_vcc", to: "r1", current: 0, path: [{ x: 380, y: 50 }, { x: 140, y: 50 }, { x: 140, y: 105 }] },
      { from: "r1", to: "n_b", current: 0, path: [{ x: 140, y: 155 }, { x: 140, y: 210 }] },
      { from: "n_b", to: "r2", current: 0, path: [{ x: 140, y: 210 }, { x: 140, y: 255 }] },
      { from: "r2", to: "n_gnd", current: 0, path: [{ x: 140, y: 305 }, { x: 140, y: 410 }, { x: 280, y: 410 }] },
      { from: "n_vcc", to: "rc", current: 0, path: [{ x: 380, y: 50 }, { x: 280, y: 50 }, { x: 280, y: 105 }] },
      { from: "rc", to: "n_c", current: 0, path: [{ x: 280, y: 155 }, { x: 280, y: 200 }] },
      { from: "n_c", to: "q1", current: 0, path: [{ x: 280, y: 200 }] },
      { from: "q1", to: "re", current: 0, path: [{ x: 280, y: 240 }, { x: 280, y: 315 }] },
      { from: "re", to: "n_gnd", current: 0, path: [{ x: 280, y: 365 }, { x: 280, y: 410 }] },
      { from: "n_b", to: "q1", current: 0, path: [{ x: 140, y: 210 }, { x: 255, y: 210 }] },
      // 3-stage RC ladder from collector back to base
      { from: "n_c", to: "c1", current: 0, path: [{ x: 280, y: 200 }, { x: 345, y: 200 }] },
      { from: "c1", to: "n_p1", current: 0, path: [{ x: 375, y: 200 }, { x: 400, y: 200 }] },
      { from: "n_p1", to: "r_a", current: 0, path: [{ x: 400, y: 200 }, { x: 400, y: 255 }] },
      { from: "r_a", to: "n_gnd", current: 0, path: [{ x: 400, y: 305 }, { x: 400, y: 410 }, { x: 280, y: 410 }] },
      { from: "n_p1", to: "c2", current: 0, path: [{ x: 400, y: 200 }, { x: 445, y: 200 }] },
      { from: "c2", to: "n_p2", current: 0, path: [{ x: 475, y: 200 }, { x: 500, y: 200 }] },
      { from: "n_p2", to: "r_b", current: 0, path: [{ x: 500, y: 200 }, { x: 500, y: 255 }] },
      { from: "r_b", to: "n_gnd", current: 0, path: [{ x: 500, y: 305 }, { x: 500, y: 410 }, { x: 280, y: 410 }] },
      { from: "n_p2", to: "c3", current: 0, path: [{ x: 500, y: 200 }, { x: 545, y: 200 }] },
      { from: "c3", to: "n_p3", current: 0, path: [{ x: 575, y: 200 }, { x: 600, y: 200 }] },
      { from: "n_p3", to: "r_c", current: 0, path: [{ x: 600, y: 200 }, { x: 600, y: 255 }] },
      { from: "r_c", to: "n_gnd", current: 0, path: [{ x: 600, y: 305 }, { x: 600, y: 410 }, { x: 280, y: 410 }] },
      // Feedback from P3 to base
      { from: "n_p3", to: "n_b", current: 0, path: [{ x: 600, y: 200 }, { x: 600, y: 90 }, { x: 80, y: 90 }, { x: 80, y: 210 }, { x: 140, y: 210 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "Vcc", voltage: Vcc, unit: "V" },
        { node: "f_osc", voltage: round(f_actual), unit: "Hz" },
      ],
      powerDissipation: round(Vcc * 0.003 * 1000),
      bandwidth: { low: round(f_actual), high: round(f_actual), unit: "Hz" },
      calculations: [
        { title: "Oscillation Frequency", formula: "f = 1 / (2π·R·C·√6)", substitution: `1 / (2π·${formatResistance(Rv)}${formatResUnit(Rv)}·${Cf}${Cu}·√6)`, result: `f ≈ ${round(f_actual)} Hz`, explanation: "Three RC sections give 180° phase shift; BJT contributes 180°." },
        { title: "Gain Condition", formula: "|Av| ≥ 29", substitution: "—", result: "Av ≥ 29", explanation: "Barkhausen criterion for RC phase-shift loop." },
      ],
    },
  };
}

// ─── Crystal Oscillator (Pierce, BJT) ─────────────────────────
export function generateCrystalOscillator(p: Record<string, number | string>): CircuitSpec {
  const Vcc = Number(p.Vcc) || 5;
  const freq = Number(p.freq) || 4000000; // 4 MHz crystal
  const C1 = 22e-12;
  const C2 = 22e-12;
  const R1 = nearestStandard(1e6);
  const Rfb = nearestStandard(1e6);

  return {
    type: "Crystal (Pierce) Oscillator",
    topology: "pierce_crystal",
    parameters: { frequency: freq, Vcc },
    components: [
      { id: "vcc", type: "voltage_source", label: "Vcc", value: String(Vcc), unit: "V", x: 360, y: 50 },
      { id: "r1", type: "resistor", label: "R1 (bias)", value: formatResistance(R1), unit: formatResUnit(R1), x: 140, y: 150, rotation: 90 },
      { id: "rfb", type: "resistor", label: "Rf", value: formatResistance(Rfb), unit: formatResUnit(Rfb), x: 280, y: 90 },
      { id: "q1", type: "transistor", label: "Q1", value: "2N3904", unit: "", x: 280, y: 220 },
      { id: "xtal", type: "inductor", label: "XTAL", value: (freq / 1e6).toFixed(3), unit: "MHz", x: 200, y: 90 },
      { id: "c1", type: "capacitor", label: "C1", value: formatCapacitance(C1), unit: formatCapUnit(C1), x: 200, y: 310, rotation: 90 },
      { id: "c2", type: "capacitor", label: "C2", value: formatCapacitance(C2), unit: formatCapUnit(C2), x: 380, y: 310, rotation: 90 },
      { id: "rc", type: "resistor", label: "Rc", value: formatResistance(4700), unit: formatResUnit(4700), x: 380, y: 150, rotation: 90 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 280, y: 410 },
    ],
    nodes: [
      { id: "n_vcc", label: "Vcc", x: 360, y: 50, voltage: Vcc, type: "supply" },
      { id: "n_b", label: "B", x: 200, y: 220, voltage: round(Vcc * 0.5), type: "internal" },
      { id: "n_c", label: "C", x: 380, y: 220, voltage: round(Vcc * 0.6), type: "output" },
      { id: "n_gnd", label: "GND", x: 280, y: 410, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_vcc", to: "r1", current: 0, path: [{ x: 360, y: 50 }, { x: 140, y: 50 }, { x: 140, y: 125 }] },
      { from: "r1", to: "n_b", current: 0, path: [{ x: 140, y: 175 }, { x: 140, y: 220 }, { x: 200, y: 220 }] },
      { from: "n_vcc", to: "rc", current: 0, path: [{ x: 360, y: 50 }, { x: 380, y: 50 }, { x: 380, y: 125 }] },
      { from: "rc", to: "n_c", current: 0, path: [{ x: 380, y: 175 }, { x: 380, y: 220 }] },
      { from: "n_b", to: "q1", current: 0, path: [{ x: 200, y: 220 }, { x: 255, y: 210 }] },
      { from: "n_c", to: "q1", current: 0, path: [{ x: 380, y: 220 }, { x: 280, y: 200 }] },
      { from: "q1", to: "n_gnd", current: 0, path: [{ x: 280, y: 240 }, { x: 280, y: 410 }] },
      // Crystal feedback C->B via xtal at top
      { from: "n_b", to: "xtal", current: 0, path: [{ x: 200, y: 220 }, { x: 200, y: 90 }, { x: 185, y: 90 }] },
      { from: "xtal", to: "rfb", current: 0, path: [{ x: 215, y: 90 }, { x: 265, y: 90 }] },
      { from: "rfb", to: "n_c", current: 0, path: [{ x: 295, y: 90 }, { x: 380, y: 90 }, { x: 380, y: 220 }] },
      // load caps to ground
      { from: "n_b", to: "c1", current: 0, path: [{ x: 200, y: 220 }, { x: 200, y: 285 }] },
      { from: "c1", to: "n_gnd", current: 0, path: [{ x: 200, y: 335 }, { x: 200, y: 410 }, { x: 280, y: 410 }] },
      { from: "n_c", to: "c2", current: 0, path: [{ x: 380, y: 220 }, { x: 380, y: 285 }] },
      { from: "c2", to: "n_gnd", current: 0, path: [{ x: 380, y: 335 }, { x: 380, y: 410 }, { x: 280, y: 410 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "Vcc", voltage: Vcc, unit: "V" },
        { node: "f_osc", voltage: freq, unit: "Hz" },
      ],
      powerDissipation: round(Vcc * 0.003 * 1000),
      bandwidth: { low: freq, high: freq, unit: "Hz" },
      calculations: [
        { title: "Crystal Frequency", formula: "f = f_xtal (series resonance)", substitution: `${(freq / 1e6).toFixed(3)} MHz crystal`, result: `f ≈ ${freq} Hz`, explanation: "Quartz crystal sets oscillation frequency with very high Q." },
        { title: "Load Capacitance", formula: "CL = (C1·C2)/(C1+C2) + Cstray", substitution: `(${formatCapacitance(C1)}·${formatCapacitance(C2)})/(${formatCapacitance(C1)}+${formatCapacitance(C2)})`, result: `CL ≈ ${formatCapacitance((C1 * C2) / (C1 + C2))} ${formatCapUnit((C1 * C2) / (C1 + C2))}`, explanation: "Match crystal's specified load capacitance for accurate frequency." },
        { title: "Feedback Bias", formula: "Rf ≈ 1MΩ (high-Z)", substitution: "Rf = 1MΩ", result: `Rf = ${formatResistance(Rfb)} ${formatResUnit(Rfb)}`, explanation: "Self-biases Q1 in linear region for Pierce topology." },
      ],
    },
  };
}
