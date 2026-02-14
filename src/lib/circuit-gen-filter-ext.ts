import { CircuitSpec } from "@/types/circuit";
import { round, nearestStandard, formatResistance, formatResUnit, formatCapacitance, formatCapUnit } from "./circuit-utils";

// ─── Band-Pass Filter ────────────────────────────────────────
export function generateBandPassFilter(p: Record<string, number | string>): CircuitSpec {
  const fl = Number(p.fl) || 500;
  const fh = Number(p.fh) || 5000;
  const fc = Math.sqrt(fl * fh);
  const BW = fh - fl;
  const Q = fc / BW;
  const C_hp = 100e-9;
  const R_hp = 1 / (2 * Math.PI * fl * C_hp);
  const R_hpv = nearestStandard(R_hp);
  const C_lp = 100e-9;
  const R_lp = 1 / (2 * Math.PI * fh * C_lp);
  const R_lpv = nearestStandard(R_lp);
  const fl_actual = 1 / (2 * Math.PI * R_hpv * C_hp);
  const fh_actual = 1 / (2 * Math.PI * R_lpv * C_lp);

  return {
    type: "Band-Pass Filter",
    topology: "cascaded_rc_bandpass",
    parameters: { fl, fh, Q: round(Q) },
    components: [
      { id: "c_hp", type: "capacitor", label: "C1 (HP)", value: formatCapacitance(C_hp), unit: formatCapUnit(C_hp), x: 160, y: 180 },
      { id: "r_hp", type: "resistor", label: "R1 (HP)", value: formatResistance(R_hpv), unit: formatResUnit(R_hpv), x: 270, y: 260, rotation: 90 },
      { id: "r_lp", type: "resistor", label: "R2 (LP)", value: formatResistance(R_lpv), unit: formatResUnit(R_lpv), x: 380, y: 180 },
      { id: "c_lp", type: "capacitor", label: "C2 (LP)", value: formatCapacitance(C_lp), unit: formatCapUnit(C_lp), x: 480, y: 260, rotation: 90 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 370, y: 400 },
    ],
    nodes: [
      { id: "n_in", label: "Vin", x: 60, y: 180, voltage: 0, type: "input" },
      { id: "n_hp_out", label: "HP out", x: 270, y: 180, voltage: 0, type: "internal" },
      { id: "n_out", label: "Vout", x: 560, y: 180, voltage: 0, type: "output" },
      { id: "n_lp_out", label: "LP out", x: 480, y: 180, voltage: 0, type: "internal" },
      { id: "n_gnd", label: "GND", x: 370, y: 400, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_in", to: "c_hp", current: 0, path: [{ x: 60, y: 180 }, { x: 145, y: 180 }] },
      { from: "c_hp", to: "n_hp_out", current: 0, path: [{ x: 175, y: 180 }, { x: 270, y: 180 }] },
      { from: "n_hp_out", to: "r_hp", current: 0, path: [{ x: 270, y: 180 }, { x: 270, y: 235 }] },
      { from: "r_hp", to: "n_gnd", current: 0, path: [{ x: 270, y: 285 }, { x: 270, y: 400 }, { x: 370, y: 400 }] },
      { from: "n_hp_out", to: "r_lp", current: 0, path: [{ x: 270, y: 180 }, { x: 360, y: 180 }] },
      { from: "r_lp", to: "n_lp_out", current: 0, path: [{ x: 405, y: 180 }, { x: 480, y: 180 }] },
      { from: "n_lp_out", to: "c_lp", current: 0, path: [{ x: 480, y: 180 }, { x: 480, y: 240 }] },
      { from: "c_lp", to: "n_gnd", current: 0, path: [{ x: 480, y: 280 }, { x: 480, y: 400 }, { x: 370, y: 400 }] },
      { from: "n_lp_out", to: "n_out", current: 0, path: [{ x: 480, y: 180 }, { x: 560, y: 180 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "fl", voltage: round(fl_actual), unit: "Hz" },
        { node: "fh", voltage: round(fh_actual), unit: "Hz" },
        { node: "fc", voltage: round(Math.sqrt(fl_actual * fh_actual)), unit: "Hz" },
        { node: "BW", voltage: round(fh_actual - fl_actual), unit: "Hz" },
      ],
      powerDissipation: 0,
      bandwidth: { low: round(fl_actual), high: round(fh_actual), unit: "Hz" },
      calculations: [
        { title: "High-Pass Cutoff", formula: "fl = 1 / (2π × R1 × C1)", substitution: `1 / (2π × ${R_hpv} × ${formatCapacitance(C_hp)}${formatCapUnit(C_hp)})`, result: `fl = ${fl_actual.toFixed(0)} Hz`, explanation: "Lower −3dB frequency." },
        { title: "Low-Pass Cutoff", formula: "fh = 1 / (2π × R2 × C2)", substitution: `1 / (2π × ${R_lpv} × ${formatCapacitance(C_lp)}${formatCapUnit(C_lp)})`, result: `fh = ${fh_actual.toFixed(0)} Hz`, explanation: "Upper −3dB frequency." },
        { title: "Center Frequency", formula: "fc = √(fl × fh)", substitution: `√(${fl_actual.toFixed(0)} × ${fh_actual.toFixed(0)})`, result: `fc = ${Math.sqrt(fl_actual * fh_actual).toFixed(0)} Hz`, explanation: "Geometric mean of cutoff frequencies." },
        { title: "Quality Factor", formula: "Q = fc / BW", substitution: `${Math.sqrt(fl_actual * fh_actual).toFixed(0)} / ${(fh_actual - fl_actual).toFixed(0)}`, result: `Q = ${(Math.sqrt(fl_actual * fh_actual) / (fh_actual - fl_actual)).toFixed(2)}`, explanation: "Selectivity of the filter." },
      ],
    },
  };
}

// ─── Active Low-Pass Filter (Sallen-Key) ─────────────────────
export function generateActiveLowPass(p: Record<string, number | string>): CircuitSpec {
  const fc = Number(p.fc) || 1000;
  const opamp = String(p.opamp || "LM741");
  const C = 100e-9;
  const R = 1 / (2 * Math.PI * fc * C);
  const Rv = nearestStandard(R);
  const fc_actual = 1 / (2 * Math.PI * Rv * C);

  return {
    type: "Active Low-Pass Filter (Sallen-Key)",
    topology: "sallen_key_lpf",
    parameters: { cutoff: fc, order: 2, opamp },
    components: [
      { id: "r1", type: "resistor", label: "R1", value: formatResistance(Rv), unit: formatResUnit(Rv), x: 160, y: 180 },
      { id: "r2", type: "resistor", label: "R2", value: formatResistance(Rv), unit: formatResUnit(Rv), x: 290, y: 180 },
      { id: "c1", type: "capacitor", label: "C1", value: formatCapacitance(C), unit: formatCapUnit(C), x: 230, y: 270, rotation: 90 },
      { id: "c2", type: "capacitor", label: "C2", value: formatCapacitance(C), unit: formatCapUnit(C), x: 500, y: 270, rotation: 90 },
      { id: "u1", type: "opamp", label: opamp, value: opamp, unit: "", x: 420, y: 220 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 350, y: 400 },
    ],
    nodes: [
      { id: "n_in", label: "Vin", x: 60, y: 180, voltage: 0, type: "input" },
      { id: "n_mid1", label: "N1", x: 230, y: 180, voltage: 0, type: "internal" },
      { id: "n_ninv", label: "V+", x: 380, y: 240, voltage: 0, type: "internal" },
      { id: "n_inv", label: "V−", x: 380, y: 200, voltage: 0, type: "internal" },
      { id: "n_out", label: "Vout", x: 560, y: 220, voltage: 0, type: "output" },
      { id: "n_gnd", label: "GND", x: 350, y: 400, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_in", to: "r1", current: 0, path: [{ x: 60, y: 180 }, { x: 140, y: 180 }] },
      { from: "r1", to: "n_mid1", current: 0, path: [{ x: 185, y: 180 }, { x: 230, y: 180 }] },
      { from: "n_mid1", to: "c1", current: 0, path: [{ x: 230, y: 180 }, { x: 230, y: 250 }] },
      { from: "c1", to: "n_gnd", current: 0, path: [{ x: 230, y: 290 }, { x: 230, y: 400 }, { x: 350, y: 400 }] },
      { from: "n_mid1", to: "r2", current: 0, path: [{ x: 230, y: 180 }, { x: 270, y: 180 }] },
      { from: "r2", to: "n_ninv", current: 0, path: [{ x: 315, y: 180 }, { x: 380, y: 180 }, { x: 380, y: 240 }] },
      { from: "n_inv", to: "n_out", current: 0, path: [{ x: 380, y: 200 }, { x: 380, y: 150 }, { x: 560, y: 150 }, { x: 560, y: 220 }] },
      { from: "u1", to: "n_out", current: 0, path: [{ x: 470, y: 220 }, { x: 560, y: 220 }] },
      { from: "n_out", to: "c2", current: 0, path: [{ x: 500, y: 220 }, { x: 500, y: 250 }] },
      { from: "c2", to: "n_gnd", current: 0, path: [{ x: 500, y: 290 }, { x: 500, y: 400 }, { x: 350, y: 400 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "fc", voltage: round(fc_actual), unit: "Hz" },
        { node: "Order", voltage: 2, unit: "" },
      ],
      powerDissipation: 0,
      bandwidth: { low: 0, high: round(fc_actual), unit: "Hz" },
      calculations: [
        { title: "Cutoff Frequency", formula: "fc = 1 / (2π × R × C)", substitution: `1 / (2π × ${Rv} × ${formatCapacitance(C)}${formatCapUnit(C)})`, result: `fc = ${fc_actual.toFixed(0)} Hz`, explanation: "−3dB point of the second-order filter." },
        { title: "Roll-off Rate", formula: "−40 dB/decade", substitution: "Second-order Butterworth", result: "−40 dB/dec", explanation: "Twice the roll-off of a single RC stage." },
        { title: "Component Values", formula: "R1 = R2, C1 = C2 (Butterworth)", substitution: `R = ${formatResistance(Rv)} ${formatResUnit(Rv)}, C = ${formatCapacitance(C)} ${formatCapUnit(C)}`, result: "Equal-value design", explanation: "Butterworth response with unity-gain buffer." },
      ],
    },
  };
}

// ─── Active High-Pass Filter (Sallen-Key) ────────────────────
export function generateActiveHighPass(p: Record<string, number | string>): CircuitSpec {
  const fc = Number(p.fc) || 1000;
  const opamp = String(p.opamp || "LM741");
  const C = 100e-9;
  const R = 1 / (2 * Math.PI * fc * C);
  const Rv = nearestStandard(R);
  const fc_actual = 1 / (2 * Math.PI * Rv * C);

  return {
    type: "Active High-Pass Filter (Sallen-Key)",
    topology: "sallen_key_hpf",
    parameters: { cutoff: fc, order: 2, opamp },
    components: [
      { id: "c1", type: "capacitor", label: "C1", value: formatCapacitance(C), unit: formatCapUnit(C), x: 160, y: 180 },
      { id: "c2", type: "capacitor", label: "C2", value: formatCapacitance(C), unit: formatCapUnit(C), x: 290, y: 180 },
      { id: "r1", type: "resistor", label: "R1", value: formatResistance(Rv), unit: formatResUnit(Rv), x: 230, y: 270, rotation: 90 },
      { id: "r2", type: "resistor", label: "R2", value: formatResistance(Rv), unit: formatResUnit(Rv), x: 500, y: 270, rotation: 90 },
      { id: "u1", type: "opamp", label: opamp, value: opamp, unit: "", x: 420, y: 220 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 350, y: 400 },
    ],
    nodes: [
      { id: "n_in", label: "Vin", x: 60, y: 180, voltage: 0, type: "input" },
      { id: "n_mid1", label: "N1", x: 230, y: 180, voltage: 0, type: "internal" },
      { id: "n_ninv", label: "V+", x: 380, y: 240, voltage: 0, type: "internal" },
      { id: "n_inv", label: "V−", x: 380, y: 200, voltage: 0, type: "internal" },
      { id: "n_out", label: "Vout", x: 560, y: 220, voltage: 0, type: "output" },
      { id: "n_gnd", label: "GND", x: 350, y: 400, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_in", to: "c1", current: 0, path: [{ x: 60, y: 180 }, { x: 145, y: 180 }] },
      { from: "c1", to: "n_mid1", current: 0, path: [{ x: 175, y: 180 }, { x: 230, y: 180 }] },
      { from: "n_mid1", to: "r1", current: 0, path: [{ x: 230, y: 180 }, { x: 230, y: 245 }] },
      { from: "r1", to: "n_gnd", current: 0, path: [{ x: 230, y: 295 }, { x: 230, y: 400 }, { x: 350, y: 400 }] },
      { from: "n_mid1", to: "c2", current: 0, path: [{ x: 230, y: 180 }, { x: 275, y: 180 }] },
      { from: "c2", to: "n_ninv", current: 0, path: [{ x: 305, y: 180 }, { x: 380, y: 180 }, { x: 380, y: 240 }] },
      { from: "n_inv", to: "n_out", current: 0, path: [{ x: 380, y: 200 }, { x: 380, y: 150 }, { x: 560, y: 150 }, { x: 560, y: 220 }] },
      { from: "u1", to: "n_out", current: 0, path: [{ x: 470, y: 220 }, { x: 560, y: 220 }] },
      { from: "n_out", to: "r2", current: 0, path: [{ x: 500, y: 220 }, { x: 500, y: 245 }] },
      { from: "r2", to: "n_gnd", current: 0, path: [{ x: 500, y: 295 }, { x: 500, y: 400 }, { x: 350, y: 400 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "fc", voltage: round(fc_actual), unit: "Hz" },
        { node: "Order", voltage: 2, unit: "" },
      ],
      powerDissipation: 0,
      bandwidth: { low: round(fc_actual), high: 1e9, unit: "Hz" },
      calculations: [
        { title: "Cutoff Frequency", formula: "fc = 1 / (2π × R × C)", substitution: `1 / (2π × ${Rv} × ${formatCapacitance(C)}${formatCapUnit(C)})`, result: `fc = ${fc_actual.toFixed(0)} Hz`, explanation: "−3dB point of the second-order filter." },
        { title: "Roll-off Rate", formula: "+40 dB/decade", substitution: "Second-order Butterworth", result: "+40 dB/dec below fc", explanation: "Twice the roll-off of a single RC stage." },
      ],
    },
  };
}

// ─── Wien Bridge Oscillator ──────────────────────────────────
export function generateWienBridge(p: Record<string, number | string>): CircuitSpec {
  const freq = Number(p.freq) || 1000;
  const opamp = String(p.opamp || "LM741");
  const C = 100e-9;
  const R = 1 / (2 * Math.PI * freq * C);
  const Rv = nearestStandard(R);
  const freq_actual = 1 / (2 * Math.PI * Rv * C);
  const Rf = 20000;
  const R1 = 10000;

  return {
    type: "Wien Bridge Oscillator",
    topology: "wien_bridge",
    parameters: { frequency: freq, opamp },
    components: [
      { id: "r_s", type: "resistor", label: "Rs", value: formatResistance(Rv), unit: formatResUnit(Rv), x: 160, y: 260 },
      { id: "c_s", type: "capacitor", label: "Cs", value: formatCapacitance(C), unit: formatCapUnit(C), x: 280, y: 260 },
      { id: "r_p", type: "resistor", label: "Rp", value: formatResistance(Rv), unit: formatResUnit(Rv), x: 350, y: 320, rotation: 90 },
      { id: "c_p", type: "capacitor", label: "Cp", value: formatCapacitance(C), unit: formatCapUnit(C), x: 420, y: 320, rotation: 90 },
      { id: "rf", type: "resistor", label: "Rf", value: formatResistance(Rf), unit: formatResUnit(Rf), x: 340, y: 120 },
      { id: "r1", type: "resistor", label: "R1", value: formatResistance(R1), unit: formatResUnit(R1), x: 260, y: 120, rotation: 90 },
      { id: "u1", type: "opamp", label: opamp, value: opamp, unit: "", x: 400, y: 210 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 350, y: 430 },
    ],
    nodes: [
      { id: "n_ninv", label: "V+", x: 360, y: 240, voltage: 0, type: "internal" },
      { id: "n_inv", label: "V−", x: 360, y: 190, voltage: 0, type: "internal" },
      { id: "n_out", label: "Vout", x: 540, y: 210, voltage: 0, type: "output" },
      { id: "n_fb", label: "FB", x: 260, y: 190, voltage: 0, type: "internal" },
      { id: "n_gnd", label: "GND", x: 350, y: 430, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_out", to: "r_s", current: 0, path: [{ x: 540, y: 260 }, { x: 300, y: 260 }] },
      { from: "r_s", to: "c_s", current: 0, path: [{ x: 185, y: 260 }, { x: 265, y: 260 }] },
      { from: "c_s", to: "n_ninv", current: 0, path: [{ x: 295, y: 260 }, { x: 360, y: 260 }, { x: 360, y: 240 }] },
      { from: "n_ninv", to: "r_p", current: 0, path: [{ x: 350, y: 260 }, { x: 350, y: 295 }] },
      { from: "r_p", to: "n_gnd", current: 0, path: [{ x: 350, y: 345 }, { x: 350, y: 430 }] },
      { from: "n_ninv", to: "c_p", current: 0, path: [{ x: 420, y: 260 }, { x: 420, y: 295 }] },
      { from: "c_p", to: "n_gnd", current: 0, path: [{ x: 420, y: 345 }, { x: 420, y: 430 }, { x: 350, y: 430 }] },
      { from: "n_inv", to: "r1", current: 0, path: [{ x: 360, y: 190 }, { x: 260, y: 190 }, { x: 260, y: 145 }] },
      { from: "r1", to: "n_gnd", current: 0, path: [{ x: 260, y: 95 }, { x: 260, y: 60 }, { x: 200, y: 60 }, { x: 200, y: 430 }, { x: 350, y: 430 }] },
      { from: "n_inv", to: "rf_l", current: 0, path: [{ x: 360, y: 190 }, { x: 360, y: 120 }, { x: 320, y: 120 }] },
      { from: "rf_r", to: "n_out", current: 0, path: [{ x: 365, y: 120 }, { x: 540, y: 120 }, { x: 540, y: 210 }] },
      { from: "u1", to: "n_out", current: 0, path: [{ x: 450, y: 210 }, { x: 540, y: 210 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "f_osc", voltage: round(freq_actual), unit: "Hz" },
        { node: "Gain_needed", voltage: 3, unit: "" },
      ],
      powerDissipation: 0,
      calculations: [
        { title: "Oscillation Frequency", formula: "f = 1 / (2π × R × C)", substitution: `1 / (2π × ${Rv} × ${formatCapacitance(C)}${formatCapUnit(C)})`, result: `f = ${freq_actual.toFixed(0)} Hz`, explanation: "Wien bridge frequency set by RC network." },
        { title: "Gain Condition", formula: "Av = 1 + Rf/R1 ≥ 3", substitution: `1 + ${Rf}/${R1} = ${1 + Rf/R1}`, result: `Av = ${1 + Rf/R1}`, explanation: "Barkhausen criterion: loop gain ≥ 1 requires Av ≥ 3." },
        { title: "Feedback Network", formula: "β = 1/3 at f₀", substitution: "Series-parallel RC", result: "β = 0.333", explanation: "RC network provides 1/3 attenuation at resonance." },
      ],
    },
  };
}

// ─── Monostable 555 Timer ────────────────────────────────────
export function generateMonostable555(p: Record<string, number | string>): CircuitSpec {
  const pulseWidth = Number(p.pulseWidth) || 0.001; // seconds
  const C = 100e-9;
  const R = pulseWidth / (1.1 * C);
  const Rv = nearestStandard(R);
  const pw_actual = 1.1 * Rv * C;

  return {
    type: "Monostable Multivibrator (555)",
    topology: "555_monostable",
    parameters: { pulse_width_ms: round(pulseWidth * 1000) },
    components: [
      { id: "vcc", type: "voltage_source", label: "Vcc", value: "9", unit: "V", x: 300, y: 50 },
      { id: "ra", type: "resistor", label: "R", value: formatResistance(Rv), unit: formatResUnit(Rv), x: 180, y: 160, rotation: 90 },
      { id: "c1", type: "capacitor", label: "C", value: formatCapacitance(C), unit: formatCapUnit(C), x: 180, y: 320, rotation: 90 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 300, y: 430 },
    ],
    nodes: [
      { id: "n_vcc", label: "Vcc", x: 300, y: 50, voltage: 9, type: "supply" },
      { id: "n_thr", label: "THR/DIS", x: 180, y: 240, voltage: 0, type: "internal" },
      { id: "n_trig", label: "TRIG", x: 80, y: 240, voltage: 9, type: "input" },
      { id: "n_out", label: "OUT", x: 480, y: 200, voltage: 0, type: "output" },
      { id: "n_gnd", label: "GND", x: 300, y: 430, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_vcc", to: "ra", current: 0, path: [{ x: 300, y: 50 }, { x: 180, y: 50 }, { x: 180, y: 135 }] },
      { from: "ra", to: "n_thr", current: 0, path: [{ x: 180, y: 185 }, { x: 180, y: 240 }] },
      { from: "n_thr", to: "c1", current: 0, path: [{ x: 180, y: 240 }, { x: 180, y: 300 }] },
      { from: "c1", to: "n_gnd", current: 0, path: [{ x: 180, y: 340 }, { x: 180, y: 430 }, { x: 300, y: 430 }] },
      { from: "n_trig", to: "n_thr", current: 0, path: [{ x: 80, y: 240 }, { x: 180, y: 240 }] },
      { from: "n_thr", to: "n_out", current: 0, path: [{ x: 180, y: 240 }, { x: 300, y: 200 }, { x: 480, y: 200 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "Vcc", voltage: 9, unit: "V" },
        { node: "T_pulse", voltage: round(pw_actual * 1000, 3), unit: "ms" },
      ],
      powerDissipation: 0,
      calculations: [
        { title: "Pulse Width", formula: "T = 1.1 × R × C", substitution: `1.1 × ${Rv} × ${formatCapacitance(C)}${formatCapUnit(C)}`, result: `T = ${(pw_actual * 1000).toFixed(3)} ms`, explanation: "Duration of output high pulse." },
        { title: "Trigger", formula: "Triggered when TRIG < Vcc/3", substitution: `TRIG < ${(9/3).toFixed(1)}V`, result: "Negative-edge trigger", explanation: "Falling edge below 1/3 Vcc starts the pulse." },
      ],
    },
  };
}
