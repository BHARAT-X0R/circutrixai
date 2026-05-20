import { CircuitSpec } from "@/types/circuit";
import { round, nearestStandard, formatResistance, formatResUnit, formatCapacitance, formatCapUnit } from "./circuit-utils";

// ─── Common Base Amplifier ───────────────────────────────────
export function generateCommonBase(p: Record<string, number | string>): CircuitSpec {
  const Vcc = Number(p.Vcc) || 12;
  const targetGain = Math.abs(Number(p.gain)) || 0; // 0 means auto
  const beta = 200;
  const Vbe = 0.7;
  
  // Design: Av = Rc / re, re = 26mV/Ic
  // Set Vc ≈ Vcc/2 for max swing: Ic*Rc ≈ Vcc/2
  // If gain specified: Rc = gain * re, then solve for Ic
  let Ic: number;
  let Rc_calc: number;
  
  if (targetGain > 0) {
    // Ic = sqrt(Vcc / (0.052 * gain)) to center Vc
    Ic = Math.sqrt(Vcc / (0.052 * targetGain));
    Ic = Math.max(0.5e-3, Math.min(20e-3, Ic));
    const re = 0.026 / Ic;
    Rc_calc = targetGain * re;
  } else {
    Ic = 2e-3;
    Rc_calc = Vcc * 0.4 / Ic; // Vc at 60% Vcc
  }
  
  const Rc = nearestStandard(Rc_calc);
  const re = 0.026 / Ic;
  
  // RE for DC stability: VE ≈ 10% Vcc
  const Ve_target = Math.max(1, Vcc * 0.1);
  const Re_calc = Ve_target / Ic;
  const Re = nearestStandard(Re_calc);
  
  const Ve = Ic * Re;
  const Vb = Ve + Vbe;
  const Vc = Vcc - Ic * Rc;
  const Av = Rc / re;
  const I_divider = 10 * (Ic / beta);
  const R1_calc = (Vcc - Vb) / I_divider;
  const R2_calc = Vb / I_divider;
  const R1v = nearestStandard(R1_calc);
  const R2v = nearestStandard(R2_calc);

  // Actual values
  const Vb_actual = Vcc * R2v / (R1v + R2v);
  const Ve_actual = Vb_actual - Vbe;
  const Ic_actual = Ve_actual / Re;
  const re_actual = 0.026 / Ic_actual;
  const Vc_actual = Vcc - Ic_actual * Rc;
  const Av_actual = Rc / re_actual;

  return {
    type: "Common Base Amplifier",
    topology: "common_base",
    parameters: { Vcc, gain: round(Av_actual) },
    components: [
      { id: "vcc", type: "voltage_source", label: "Vcc", value: String(Vcc), unit: "V", x: 325, y: 45 },
      { id: "rc", type: "resistor", label: "RC", value: formatResistance(Rc), unit: formatResUnit(Rc), x: 325, y: 130, rotation: 90 },
      { id: "re", type: "resistor", label: "RE", value: formatResistance(Re), unit: formatResUnit(Re), x: 325, y: 340, rotation: 90 },
      { id: "r1", type: "resistor", label: "R1", value: formatResistance(R1v), unit: formatResUnit(R1v), x: 170, y: 130, rotation: 90 },
      { id: "r2", type: "resistor", label: "R2", value: formatResistance(R2v), unit: formatResUnit(R2v), x: 170, y: 300, rotation: 90 },
      { id: "q1", type: "transistor", label: "Q1", value: "2N2222", unit: "", x: 310, y: 230 },
      { id: "c1", type: "capacitor", label: "C1", value: "10", unit: "μF", x: 480, y: 340 },
      { id: "c2", type: "capacitor", label: "C2", value: "0.1", unit: "μF", x: 530, y: 165 },
      { id: "cb", type: "capacitor", label: "CB", value: "100", unit: "μF", x: 240, y: 215 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 325, y: 430 },
    ],
    nodes: [
      { id: "n_vcc", label: "Vcc", x: 325, y: 45, voltage: Vcc, type: "supply" },
      { id: "n_base", label: "Base", x: 250, y: 215, voltage: round(Vb_actual), type: "internal" },
      { id: "n_collector", label: "Collector", x: 325, y: 165, voltage: round(Vc_actual), type: "internal" },
      { id: "n_emitter", label: "Emitter", x: 325, y: 290, voltage: round(Ve_actual), type: "internal" },
      { id: "n_input", label: "Vin", x: 580, y: 340, voltage: 0, type: "input" },
      { id: "n_output", label: "Vout", x: 580, y: 165, voltage: round(Vc_actual), type: "output" },
      { id: "n_gnd", label: "GND", x: 325, y: 430, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_vcc", to: "rc", current: round(Ic_actual * 1000), path: [{ x: 325, y: 45 }, { x: 325, y: 105 }] },
      { from: "rc", to: "n_collector", current: round(Ic_actual * 1000), path: [{ x: 325, y: 155 }, { x: 325, y: 165 }] },
      { from: "n_collector", to: "q1_c", current: round(Ic_actual * 1000), path: [{ x: 325, y: 165 }, { x: 330, y: 165 }, { x: 330, y: 210 }] },
      { from: "q1_e", to: "n_emitter", current: round(Ic_actual * 1000), path: [{ x: 330, y: 250 }, { x: 330, y: 290 }, { x: 325, y: 290 }] },
      { from: "n_emitter", to: "re", current: round(Ic_actual * 1000), path: [{ x: 325, y: 290 }, { x: 325, y: 315 }] },
      { from: "re", to: "n_gnd", current: round(Ic_actual * 1000), path: [{ x: 325, y: 365 }, { x: 325, y: 430 }] },
      { from: "n_vcc", to: "r1", current: round(I_divider * 1000), path: [{ x: 325, y: 45 }, { x: 170, y: 45 }, { x: 170, y: 105 }] },
      { from: "r1", to: "n_base", current: round(I_divider * 1000), path: [{ x: 170, y: 155 }, { x: 170, y: 215 }, { x: 250, y: 215 }] },
      { from: "n_base", to: "q1_b", current: round(Ic_actual / beta * 1000, 4), path: [{ x: 250, y: 215 }, { x: 285, y: 215 }] },
      { from: "n_base", to: "r2", current: round(I_divider * 1000), path: [{ x: 170, y: 215 }, { x: 170, y: 275 }] },
      { from: "r2", to: "n_gnd", current: round(I_divider * 1000), path: [{ x: 170, y: 325 }, { x: 170, y: 430 }, { x: 325, y: 430 }] },
      { from: "n_base", to: "cb", current: 0, path: [{ x: 250, y: 215 }, { x: 225, y: 215 }] },
      { from: "cb", to: "n_gnd", current: 0, path: [{ x: 255, y: 215 }, { x: 255, y: 430 }, { x: 325, y: 430 }] },
      { from: "n_input", to: "c1", current: 0, path: [{ x: 580, y: 340 }, { x: 495, y: 340 }] },
      { from: "c1", to: "n_emitter", current: 0, path: [{ x: 465, y: 340 }, { x: 420, y: 340 }, { x: 420, y: 290 }, { x: 325, y: 290 }] },
      { from: "n_collector", to: "c2", current: 0, path: [{ x: 325, y: 165 }, { x: 515, y: 165 }] },
      { from: "c2", to: "n_output", current: 0, path: [{ x: 545, y: 165 }, { x: 580, y: 165 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "Vcc", voltage: Vcc, unit: "V" },
        { node: "V(Base)", voltage: round(Vb_actual), unit: "V" },
        { node: "V(Collector)", voltage: round(Vc_actual), unit: "V" },
        { node: "V(Emitter)", voltage: round(Ve_actual), unit: "V" },
        { node: "Ic", voltage: round(Ic_actual * 1000), unit: "mA" },
      ],
      voltageGain: round(Av_actual),
      currentGain: 1,
      inputImpedance: round(re_actual),
      outputImpedance: Rc,
      powerDissipation: round(Vcc * Ic_actual),
      bandwidth: { low: 100, high: 500000, unit: "Hz" },
      calculations: [
        { title: "Collector Current", formula: "Ic = VE / RE", substitution: `${Ve_actual.toFixed(2)}V / ${formatResistance(Re)}${formatResUnit(Re)}`, result: `Ic = ${(Ic_actual * 1000).toFixed(2)} mA`, explanation: "Set by bias point for desired gain." },
        { title: "Voltage Gain", formula: "Av = RC / re", substitution: `${formatResistance(Rc)}${formatResUnit(Rc)} / ${re_actual.toFixed(1)}Ω`, result: `Av = ${Av_actual.toFixed(1)}`, explanation: "High voltage gain, non-inverting output." },
        { title: "Current Gain", formula: "Ai ≈ 1 (α)", substitution: "α = β / (β + 1)", result: `Ai ≈ ${(beta / (beta + 1)).toFixed(3)}`, explanation: "Current gain is approximately unity." },
        { title: "Input Impedance", formula: "Zin ≈ re = 26mV / Ic", substitution: `26 / ${(Ic_actual * 1000).toFixed(1)}`, result: `Zin = ${re_actual.toFixed(1)} Ω`, explanation: "Very low input impedance — characteristic of CB." },
        { title: "Bias Resistors", formula: "R1, R2 from voltage divider", substitution: `VB = ${Vb_actual.toFixed(2)}V, I_div = ${(I_divider*1000).toFixed(3)}mA`, result: `R1 = ${formatResistance(R1v)}${formatResUnit(R1v)}, R2 = ${formatResistance(R2v)}${formatResUnit(R2v)}`, explanation: "Stiff divider for stable bias point." },
      ],
    },
  };
}

// ─── Darlington Pair ─────────────────────────────────────────
export function generateDarlingtonPair(p: Record<string, number | string>): CircuitSpec {
  const Vcc = Number(p.Vcc) || 12;
  const beta1 = 200;
  const beta2 = 200;
  const beta_total = beta1 * beta2;
  const Vbe_total = 1.4;
  const Ic = 100e-3;
  const Re = 47;
  const Ve = Ic * Re;
  const Vb = Ve + Vbe_total;
  const Ib = Ic / beta_total;
  const Rb = (Vcc - Vb) / (Ib * 10);
  const Rbv = nearestStandard(Rb);

  return {
    type: "Darlington Pair",
    topology: "darlington_emitter_follower",
    parameters: { Vcc, beta_total },
    components: [
      { id: "vcc", type: "voltage_source", label: "Vcc", value: String(Vcc), unit: "V", x: 300, y: 50 },
      { id: "rb", type: "resistor", label: "RB", value: formatResistance(Rbv), unit: formatResUnit(Rbv), x: 140, y: 170 },
      { id: "q1", type: "transistor", label: "Q1", value: "2N2222", unit: "", x: 280, y: 180 },
      { id: "q2", type: "transistor", label: "Q2", value: "TIP31", unit: "", x: 310, y: 280 },
      { id: "re", type: "resistor", label: "RE", value: formatResistance(Re), unit: formatResUnit(Re), x: 330, y: 370, rotation: 90 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 300, y: 430 },
    ],
    nodes: [
      { id: "n_vcc", label: "Vcc", x: 300, y: 50, voltage: Vcc, type: "supply" },
      { id: "n_in", label: "Vin", x: 50, y: 170, voltage: round(Vb), type: "input" },
      { id: "n_base1", label: "B1", x: 220, y: 170, voltage: round(Vb), type: "internal" },
      { id: "n_e1_b2", label: "E1/B2", x: 280, y: 260, voltage: round(Vb - 0.7), type: "internal" },
      { id: "n_emitter2", label: "E2", x: 330, y: 340, voltage: round(Ve), type: "internal" },
      { id: "n_out", label: "Vout", x: 460, y: 340, voltage: round(Ve), type: "output" },
      { id: "n_gnd", label: "GND", x: 300, y: 430, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_vcc", to: "q1", current: round(Ic * 1000 / beta2), path: [{ x: 300, y: 50 }, { x: 300, y: 160 }] },
      { from: "n_vcc", to: "q2", current: round(Ic * 1000), path: [{ x: 300, y: 50 }, { x: 330, y: 50 }, { x: 330, y: 260 }] },
      { from: "n_in", to: "rb", current: round(Ib * 1e6) / 1000, path: [{ x: 50, y: 170 }, { x: 120, y: 170 }] },
      { from: "rb", to: "n_base1", current: round(Ib * 1e6) / 1000, path: [{ x: 165, y: 170 }, { x: 220, y: 170 }] },
      { from: "n_base1", to: "q1_b", current: 0, path: [{ x: 220, y: 170 }, { x: 255, y: 170 }] },
      { from: "q1_e", to: "n_e1_b2", current: round(Ic / beta2 * 1000), path: [{ x: 280, y: 200 }, { x: 280, y: 260 }] },
      { from: "n_e1_b2", to: "q2_b", current: round(Ic / beta2 * 1000), path: [{ x: 280, y: 260 }, { x: 285, y: 270 }] },
      { from: "q2_e", to: "n_emitter2", current: round(Ic * 1000), path: [{ x: 330, y: 300 }, { x: 330, y: 340 }] },
      { from: "n_emitter2", to: "re", current: round(Ic * 1000), path: [{ x: 330, y: 340 }, { x: 330, y: 345 }] },
      { from: "re", to: "n_gnd", current: round(Ic * 1000), path: [{ x: 330, y: 395 }, { x: 330, y: 430 }, { x: 300, y: 430 }] },
      { from: "n_emitter2", to: "n_out", current: round(Ic * 1000), path: [{ x: 330, y: 340 }, { x: 460, y: 340 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "Vcc", voltage: Vcc, unit: "V" },
        { node: "V(B1)", voltage: round(Vb), unit: "V" },
        { node: "V(E1/B2)", voltage: round(Vb - 0.7), unit: "V" },
        { node: "V(E2)", voltage: round(Ve), unit: "V" },
        { node: "Ic_total", voltage: round(Ic * 1000), unit: "mA" },
      ],
      voltageGain: 1,
      currentGain: beta_total,
      inputImpedance: round(beta_total * Re),
      outputImpedance: round(26 / (Ic * 1000)),
      powerDissipation: round(Vcc * Ic),
      calculations: [
        { title: "Total Current Gain", formula: "β_total = β1 × β2", substitution: `${beta1} × ${beta2}`, result: `β = ${beta_total}`, explanation: "Extremely high current gain from cascaded transistors." },
        { title: "VBE Total", formula: "VBE = VBE1 + VBE2", substitution: "0.7 + 0.7", result: `VBE = ${Vbe_total} V`, explanation: "Two base-emitter junctions in series." },
        { title: "Input Impedance", formula: "Zin = β_total × RE", substitution: `${beta_total} × ${Re}`, result: `Zin = ${(beta_total * Re / 1e6).toFixed(1)} MΩ`, explanation: "Extremely high input impedance." },
        { title: "Input Current", formula: "Ib = Ic / β_total", substitution: `${(Ic * 1000).toFixed(0)}mA / ${beta_total}`, result: `Ib = ${(Ib * 1e6).toFixed(1)} μA`, explanation: "Negligible base current needed." },
      ],
    },
  };
}

// ─── Single Tuned Amplifier ─────────────────────────────────
export function generateSingleTuned(p: Record<string, number | string>): CircuitSpec {
  const Vcc = Number(p.Vcc) || 12;
  const freq = Number(p.freq) || 10000; // resonant frequency in Hz
  const beta = 200;
  const Vbe = 0.7;
  const Ic = 2e-3;

  // LC tank: f0 = 1 / (2π√(LC))
  // Choose L first (practical range 1mH–100mH), then solve C
  let L: number;
  if (freq >= 100000) L = 0.1e-3;      // 100μH for high freq
  else if (freq >= 10000) L = 1e-3;     // 1mH for mid freq
  else L = 10e-3;                        // 10mH for low freq

  const C_tank = 1 / (4 * Math.PI * Math.PI * freq * freq * L);

  // Bias design (voltage divider)
  const Ve_target = Math.max(1, Vcc * 0.1);
  const Re_calc = Ve_target / Ic;
  const Re = nearestStandard(Re_calc);
  const Ve = Ic * Re;
  const Vb = Ve + Vbe;
  const Ib = Ic / beta;
  const I_divider = 10 * Ib;
  const R1_calc = (Vcc - Vb) / I_divider;
  const R2_calc = Vb / I_divider;
  const R1v = nearestStandard(R1_calc);
  const R2v = nearestStandard(R2_calc);

  const Vb_actual = Vcc * R2v / (R1v + R2v);
  const Ve_actual = Vb_actual - Vbe;
  const Ic_actual = Ve_actual / Re;
  const re_actual = 0.026 / Ic_actual;

  // Tank impedance at resonance: Z = L / (C * r), where r is winding resistance (~10Ω)
  const r_coil = 10;
  const Q = 2 * Math.PI * freq * L / r_coil;
  const Z_tank = Q * 2 * Math.PI * freq * L;
  const Av = Z_tank / re_actual;
  const BW = freq / Q;

  // Bypass cap for RE
  const Ce_calc = 1 / (2 * Math.PI * 100 * re_actual);
  // Coupling caps
  const fL = 100;
  const C1_calc = 1 / (2 * Math.PI * fL * (R1v * R2v / (R1v + R2v)));
  const C2_calc = 1 / (2 * Math.PI * fL * 10000);

  // Format inductor value
  const L_mH = L * 1000;
  const L_label = L_mH >= 1 ? `${L_mH.toFixed(L_mH % 1 === 0 ? 0 : 1)}` : `${(L * 1e6).toFixed(0)}`;
  const L_unit = L_mH >= 1 ? "mH" : "μH";

  return {
    type: "Single Tuned Amplifier",
    topology: "single_tuned_ce",
    parameters: { Vcc, frequency: round(freq), Q: round(Q), bandwidth: round(BW) },
    components: [
      { id: "vcc", type: "voltage_source", label: "Vcc", value: String(Vcc), unit: "V", x: 325, y: 45 },
      { id: "l1", type: "inductor", label: "L1", value: L_label, unit: L_unit, x: 325, y: 110, rotation: 90 },
      { id: "ct", type: "capacitor", label: "CT", value: formatCapacitance(C_tank), unit: formatCapUnit(C_tank), x: 420, y: 130, rotation: 90 },
      { id: "r1", type: "resistor", label: "R1", value: formatResistance(R1v), unit: formatResUnit(R1v), x: 170, y: 130, rotation: 90 },
      { id: "r2", type: "resistor", label: "R2", value: formatResistance(R2v), unit: formatResUnit(R2v), x: 170, y: 300, rotation: 90 },
      { id: "re", type: "resistor", label: "RE", value: formatResistance(Re), unit: formatResUnit(Re), x: 325, y: 340, rotation: 90 },
      { id: "q1", type: "transistor", label: "Q1", value: "2N2222", unit: "", x: 310, y: 230 },
      { id: "c1", type: "capacitor", label: "C1", value: formatCapacitance(C1_calc), unit: formatCapUnit(C1_calc), x: 90, y: 215 },
      { id: "c2", type: "capacitor", label: "C2", value: formatCapacitance(C2_calc), unit: formatCapUnit(C2_calc), x: 530, y: 165 },
      { id: "ce", type: "capacitor", label: "CE", value: formatCapacitance(Ce_calc), unit: formatCapUnit(Ce_calc), x: 430, y: 340, rotation: 90 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 325, y: 430 },
    ],
    nodes: [
      { id: "n_vcc", label: "Vcc", x: 325, y: 45, voltage: Vcc, type: "supply" },
      { id: "n_base", label: "Base", x: 250, y: 215, voltage: round(Vb_actual), type: "internal" },
      { id: "n_collector", label: "Collector", x: 325, y: 165, voltage: round(Vcc - Ic_actual * r_coil), type: "internal" },
      { id: "n_emitter", label: "Emitter", x: 325, y: 290, voltage: round(Ve_actual), type: "internal" },
      { id: "n_tank_top", label: "L1 top", x: 325, y: 80, voltage: Vcc, type: "internal" },
      { id: "n_input", label: "Vin", x: 40, y: 215, voltage: 0, type: "input" },
      { id: "n_output", label: "Vout", x: 580, y: 165, voltage: round(Vcc - Ic_actual * r_coil), type: "output" },
      { id: "n_gnd", label: "GND", x: 325, y: 430, voltage: 0, type: "ground" },
    ],
    connections: [
      // Vcc to inductor
      { from: "n_vcc", to: "l1", current: round(Ic_actual * 1000), path: [{ x: 325, y: 45 }, { x: 325, y: 85 }] },
      // Inductor to collector
      { from: "l1", to: "n_collector", current: round(Ic_actual * 1000), path: [{ x: 325, y: 135 }, { x: 325, y: 165 }] },
      // Tank capacitor in parallel with inductor
      { from: "n_vcc", to: "ct", current: 0, path: [{ x: 325, y: 45 }, { x: 420, y: 45 }, { x: 420, y: 105 }] },
      { from: "ct", to: "n_collector", current: 0, path: [{ x: 420, y: 155 }, { x: 420, y: 165 }, { x: 325, y: 165 }] },
      // Collector to transistor
      { from: "n_collector", to: "q1_c", current: round(Ic_actual * 1000), path: [{ x: 325, y: 165 }, { x: 330, y: 165 }, { x: 330, y: 210 }] },
      // Transistor to emitter
      { from: "q1_e", to: "n_emitter", current: round(Ic_actual * 1000), path: [{ x: 330, y: 250 }, { x: 330, y: 290 }, { x: 325, y: 290 }] },
      // Emitter to RE
      { from: "n_emitter", to: "re", current: round(Ic_actual * 1000), path: [{ x: 325, y: 290 }, { x: 325, y: 315 }] },
      { from: "re", to: "n_gnd", current: round(Ic_actual * 1000), path: [{ x: 325, y: 365 }, { x: 325, y: 430 }] },
      // Bias network
      { from: "n_vcc", to: "r1", current: round(I_divider * 1000), path: [{ x: 325, y: 45 }, { x: 170, y: 45 }, { x: 170, y: 105 }] },
      { from: "r1", to: "n_base", current: round(I_divider * 1000), path: [{ x: 170, y: 155 }, { x: 170, y: 215 }, { x: 250, y: 215 }] },
      { from: "n_base", to: "q1_b", current: round(Ib * 1000, 4), path: [{ x: 250, y: 215 }, { x: 285, y: 215 }] },
      { from: "n_base", to: "r2", current: round(I_divider * 1000), path: [{ x: 170, y: 215 }, { x: 170, y: 275 }] },
      { from: "r2", to: "n_gnd", current: round(I_divider * 1000), path: [{ x: 170, y: 325 }, { x: 170, y: 430 }, { x: 325, y: 430 }] },
      // Input coupling
      { from: "n_input", to: "c1", current: 0, path: [{ x: 40, y: 215 }, { x: 75, y: 215 }] },
      { from: "c1", to: "n_base", current: 0, path: [{ x: 105, y: 215 }, { x: 170, y: 215 }] },
      // Output coupling
      { from: "n_collector", to: "c2", current: 0, path: [{ x: 325, y: 165 }, { x: 515, y: 165 }] },
      { from: "c2", to: "n_output", current: 0, path: [{ x: 545, y: 165 }, { x: 580, y: 165 }] },
      // Bypass cap
      { from: "n_emitter", to: "ce", current: 0, path: [{ x: 325, y: 290 }, { x: 430, y: 290 }, { x: 430, y: 315 }] },
      { from: "ce", to: "n_gnd", current: 0, path: [{ x: 430, y: 365 }, { x: 430, y: 430 }, { x: 325, y: 430 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "Vcc", voltage: Vcc, unit: "V" },
        { node: "V(Base)", voltage: round(Vb_actual), unit: "V" },
        { node: "V(Collector)", voltage: round(Vcc - Ic_actual * r_coil), unit: "V" },
        { node: "V(Emitter)", voltage: round(Ve_actual), unit: "V" },
        { node: "Ic", voltage: round(Ic_actual * 1000), unit: "mA" },
      ],
      voltageGain: round(Math.min(Av, 500)),
      inputImpedance: round(beta * re_actual),
      outputImpedance: round(Z_tank),
      powerDissipation: round(Vcc * Ic_actual),
      bandwidth: { low: round(freq - BW / 2), high: round(freq + BW / 2), unit: "Hz" },
      cutoffFrequency: round(freq),
      calculations: [
        { title: "Resonant Frequency", formula: "f₀ = 1 / (2π√(LC))", substitution: `L = ${L_label}${L_unit}, C = ${formatCapacitance(C_tank)}${formatCapUnit(C_tank)}`, result: `f₀ = ${freq >= 1000 ? (freq/1000).toFixed(1) + ' kHz' : freq + ' Hz'}`, explanation: "LC tank resonates at the desired center frequency." },
        { title: "Quality Factor", formula: "Q = 2πf₀L / r_coil", substitution: `2π × ${freq} × ${L_label}${L_unit} / ${r_coil}Ω`, result: `Q = ${Q.toFixed(1)}`, explanation: "Higher Q gives sharper selectivity but narrower bandwidth." },
        { title: "Bandwidth", formula: "BW = f₀ / Q", substitution: `${freq >= 1000 ? (freq/1000).toFixed(1) + 'kHz' : freq + 'Hz'} / ${Q.toFixed(1)}`, result: `BW = ${BW >= 1000 ? (BW/1000).toFixed(1) + ' kHz' : BW.toFixed(0) + ' Hz'}`, explanation: "3dB bandwidth of the tuned response." },
        { title: "Voltage Gain at Resonance", formula: "Av = Z_tank / re", substitution: `${round(Z_tank)}Ω / ${re_actual.toFixed(1)}Ω`, result: `Av ≈ ${round(Math.min(Av, 500))}`, explanation: "Maximum gain occurs at the resonant frequency." },
        { title: "Tank Impedance", formula: "Z_tank = Q × 2πf₀L", substitution: `${Q.toFixed(1)} × 2π × ${freq} × ${L_label}${L_unit}`, result: `Z = ${round(Z_tank)} Ω`, explanation: "Effective impedance of parallel LC at resonance." },
      ],
    },
  };
}

// ─── Multistage (Two-Stage CE) Amplifier ────────────────────
export function generateMultistageAmplifier(p: Record<string, number | string>): CircuitSpec {
  const Vcc = Number(p.Vcc) || 12;
  const targetGain = Math.abs(Number(p.gain)) || 200;
  const beta = 200;
  const Vbe = 0.7;

  // Split gain between two stages: Av1 × Av2 = targetGain
  const Av1_target = Math.sqrt(targetGain);
  const Av2_target = targetGain / Av1_target;

  // ── Stage 1 ──
  let Ic1 = Math.sqrt(Vcc / (0.052 * Av1_target));
  Ic1 = Math.max(0.5e-3, Math.min(10e-3, Ic1));
  const re1 = 0.026 / Ic1;
  const Rc1 = nearestStandard(Av1_target * re1);
  const Ve1_target = Math.max(1, Vcc * 0.1);
  const Re1 = nearestStandard(Ve1_target / Ic1);
  const Ve1 = Ic1 * Re1;
  const Vb1 = Ve1 + Vbe;
  const Ib1 = Ic1 / beta;
  const I_div1 = 10 * Ib1;
  const R1a_calc = (Vcc - Vb1) / I_div1;
  const R2a_calc = Vb1 / I_div1;
  const R1a = nearestStandard(R1a_calc);
  const R2a = nearestStandard(R2a_calc);
  const Vb1_actual = Vcc * R2a / (R1a + R2a);
  const Ve1_actual = Vb1_actual - Vbe;
  const Ic1_actual = Ve1_actual / Re1;
  const re1_actual = 0.026 / Ic1_actual;
  const Vc1_actual = Vcc - Ic1_actual * Rc1;
  const Av1_actual = Rc1 / re1_actual;

  // ── Stage 2 ──
  let Ic2 = Math.sqrt(Vcc / (0.052 * Av2_target));
  Ic2 = Math.max(0.5e-3, Math.min(10e-3, Ic2));
  const re2 = 0.026 / Ic2;
  const Rc2 = nearestStandard(Av2_target * re2);
  const Ve2_target = Math.max(1, Vcc * 0.1);
  const Re2 = nearestStandard(Ve2_target / Ic2);
  const Ve2 = Ic2 * Re2;
  const Vb2 = Ve2 + Vbe;
  const Ib2 = Ic2 / beta;
  const I_div2 = 10 * Ib2;
  const R1b_calc = (Vcc - Vb2) / I_div2;
  const R2b_calc = Vb2 / I_div2;
  const R1b = nearestStandard(R1b_calc);
  const R2b = nearestStandard(R2b_calc);
  const Vb2_actual = Vcc * R2b / (R1b + R2b);
  const Ve2_actual = Vb2_actual - Vbe;
  const Ic2_actual = Ve2_actual / Re2;
  const re2_actual = 0.026 / Ic2_actual;
  const Vc2_actual = Vcc - Ic2_actual * Rc2;
  const Av2_actual = Rc2 / re2_actual;

  const totalGain = Av1_actual * Av2_actual;

  // Coupling caps
  const fL = 100;
  const C1_calc = 1 / (2 * Math.PI * fL * (R1a * R2a / (R1a + R2a)));
  const Cc_calc = 1 / (2 * Math.PI * fL * (R1b * R2b / (R1b + R2b)));
  const C2_calc = 1 / (2 * Math.PI * fL * 10000);
  const Ce1_calc = 1 / (2 * Math.PI * fL * re1_actual);
  const Ce2_calc = 1 / (2 * Math.PI * fL * re2_actual);

  // Layout: Stage 1 on left (x: 50–350), Stage 2 on right (x: 400–700)
  const s1x = 0; // stage 1 offset
  const s2x = 350; // stage 2 offset

  return {
    type: "Two-Stage CE Amplifier",
    topology: "multistage_ce",
    parameters: { Vcc, targetGain, stage1Gain: round(Av1_actual), stage2Gain: round(Av2_actual), totalGain: round(totalGain) },
    components: [
      // Stage 1
      { id: "vcc1", type: "voltage_source", label: "Vcc", value: String(Vcc), unit: "V", x: s1x + 250, y: 45 },
      { id: "r1a", type: "resistor", label: "R1A", value: formatResistance(R1a), unit: formatResUnit(R1a), x: s1x + 120, y: 130, rotation: 90 },
      { id: "r2a", type: "resistor", label: "R2A", value: formatResistance(R2a), unit: formatResUnit(R2a), x: s1x + 120, y: 300, rotation: 90 },
      { id: "rc1", type: "resistor", label: "RC1", value: formatResistance(Rc1), unit: formatResUnit(Rc1), x: s1x + 250, y: 120, rotation: 90 },
      { id: "re1", type: "resistor", label: "RE1", value: formatResistance(Re1), unit: formatResUnit(Re1), x: s1x + 250, y: 340, rotation: 90 },
      { id: "q1", type: "transistor", label: "Q1", value: "2N2222", unit: "", x: s1x + 235, y: 230 },
      { id: "c1", type: "capacitor", label: "C1", value: formatCapacitance(C1_calc), unit: formatCapUnit(C1_calc), x: s1x + 40, y: 215 },
      { id: "ce1", type: "capacitor", label: "CE1", value: formatCapacitance(Ce1_calc), unit: formatCapUnit(Ce1_calc), x: s1x + 340, y: 340, rotation: 90 },
      // Coupling cap between stages
      { id: "cc", type: "capacitor", label: "CC", value: formatCapacitance(Cc_calc), unit: formatCapUnit(Cc_calc), x: s1x + 325, y: 165 },
      // Stage 2
      { id: "r1b", type: "resistor", label: "R1B", value: formatResistance(R1b), unit: formatResUnit(R1b), x: s2x + 120, y: 130, rotation: 90 },
      { id: "r2b", type: "resistor", label: "R2B", value: formatResistance(R2b), unit: formatResUnit(R2b), x: s2x + 120, y: 300, rotation: 90 },
      { id: "rc2", type: "resistor", label: "RC2", value: formatResistance(Rc2), unit: formatResUnit(Rc2), x: s2x + 250, y: 120, rotation: 90 },
      { id: "re2", type: "resistor", label: "RE2", value: formatResistance(Re2), unit: formatResUnit(Re2), x: s2x + 250, y: 340, rotation: 90 },
      { id: "q2", type: "transistor", label: "Q2", value: "2N2222", unit: "", x: s2x + 235, y: 230 },
      { id: "ce2", type: "capacitor", label: "CE2", value: formatCapacitance(Ce2_calc), unit: formatCapUnit(Ce2_calc), x: s2x + 340, y: 340, rotation: 90 },
      { id: "c2", type: "capacitor", label: "C2", value: formatCapacitance(C2_calc), unit: formatCapUnit(C2_calc), x: s2x + 330, y: 165 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 350, y: 460 },
    ],
    nodes: [
      { id: "n_vcc", label: "Vcc", x: 250, y: 45, voltage: Vcc, type: "supply" },
      // Stage 1
      { id: "n_b1", label: "B1", x: s1x + 180, y: 215, voltage: round(Vb1_actual), type: "internal" },
      { id: "n_c1", label: "C1", x: s1x + 250, y: 165, voltage: round(Vc1_actual), type: "internal" },
      { id: "n_e1", label: "E1", x: s1x + 250, y: 290, voltage: round(Ve1_actual), type: "internal" },
      { id: "n_input", label: "Vin", x: s1x + 10, y: 215, voltage: 0, type: "input" },
      // Stage 2
      { id: "n_b2", label: "B2", x: s2x + 180, y: 215, voltage: round(Vb2_actual), type: "internal" },
      { id: "n_c2", label: "C2", x: s2x + 250, y: 165, voltage: round(Vc2_actual), type: "internal" },
      { id: "n_e2", label: "E2", x: s2x + 250, y: 290, voltage: round(Ve2_actual), type: "internal" },
      { id: "n_output", label: "Vout", x: s2x + 400, y: 165, voltage: round(Vc2_actual), type: "output" },
      { id: "n_gnd", label: "GND", x: 350, y: 460, voltage: 0, type: "ground" },
    ],
    connections: [
      // ── Stage 1 power ──
      { from: "n_vcc", to: "rc1", current: round(Ic1_actual * 1000), path: [{ x: s1x + 250, y: 45 }, { x: s1x + 250, y: 95 }] },
      { from: "rc1", to: "n_c1", current: round(Ic1_actual * 1000), path: [{ x: s1x + 250, y: 145 }, { x: s1x + 250, y: 165 }] },
      { from: "n_c1", to: "q1", current: round(Ic1_actual * 1000), path: [{ x: s1x + 250, y: 165 }, { x: s1x + 250, y: 210 }] },
      { from: "q1", to: "n_e1", current: round(Ic1_actual * 1000), path: [{ x: s1x + 250, y: 250 }, { x: s1x + 250, y: 290 }] },
      { from: "n_e1", to: "re1", current: round(Ic1_actual * 1000), path: [{ x: s1x + 250, y: 290 }, { x: s1x + 250, y: 315 }] },
      { from: "re1", to: "n_gnd", current: round(Ic1_actual * 1000), path: [{ x: s1x + 250, y: 365 }, { x: s1x + 250, y: 460 }, { x: 350, y: 460 }] },
      // Stage 1 bias
      { from: "n_vcc", to: "r1a", current: round(I_div1 * 1000), path: [{ x: s1x + 250, y: 45 }, { x: s1x + 120, y: 45 }, { x: s1x + 120, y: 105 }] },
      { from: "r1a", to: "n_b1", current: round(I_div1 * 1000), path: [{ x: s1x + 120, y: 155 }, { x: s1x + 120, y: 215 }, { x: s1x + 180, y: 215 }] },
      { from: "n_b1", to: "q1_b", current: round(Ib1 * 1000, 4), path: [{ x: s1x + 180, y: 215 }, { x: s1x + 210, y: 215 }] },
      { from: "n_b1", to: "r2a", current: round(I_div1 * 1000), path: [{ x: s1x + 120, y: 215 }, { x: s1x + 120, y: 275 }] },
      { from: "r2a", to: "n_gnd", current: round(I_div1 * 1000), path: [{ x: s1x + 120, y: 325 }, { x: s1x + 120, y: 460 }, { x: 350, y: 460 }] },
      // Stage 1 input coupling
      { from: "n_input", to: "c1", current: 0, path: [{ x: s1x + 10, y: 215 }, { x: s1x + 25, y: 215 }] },
      { from: "c1", to: "n_b1", current: 0, path: [{ x: s1x + 55, y: 215 }, { x: s1x + 120, y: 215 }] },
      // Stage 1 bypass
      { from: "n_e1", to: "ce1", current: 0, path: [{ x: s1x + 250, y: 290 }, { x: s1x + 340, y: 290 }, { x: s1x + 340, y: 315 }] },
      { from: "ce1", to: "n_gnd", current: 0, path: [{ x: s1x + 340, y: 365 }, { x: s1x + 340, y: 460 }, { x: 350, y: 460 }] },
      // ── Coupling between stages ──
      { from: "n_c1", to: "cc", current: 0, path: [{ x: s1x + 250, y: 165 }, { x: s1x + 310, y: 165 }] },
      { from: "cc", to: "n_b2", current: 0, path: [{ x: s1x + 340, y: 165 }, { x: s2x + 120, y: 165 }, { x: s2x + 120, y: 215 }] },
      // ── Stage 2 power ──
      { from: "n_vcc", to: "rc2", current: round(Ic2_actual * 1000), path: [{ x: s1x + 250, y: 45 }, { x: s2x + 250, y: 45 }, { x: s2x + 250, y: 95 }] },
      { from: "rc2", to: "n_c2", current: round(Ic2_actual * 1000), path: [{ x: s2x + 250, y: 145 }, { x: s2x + 250, y: 165 }] },
      { from: "n_c2", to: "q2", current: round(Ic2_actual * 1000), path: [{ x: s2x + 250, y: 165 }, { x: s2x + 250, y: 210 }] },
      { from: "q2", to: "n_e2", current: round(Ic2_actual * 1000), path: [{ x: s2x + 250, y: 250 }, { x: s2x + 250, y: 290 }] },
      { from: "n_e2", to: "re2", current: round(Ic2_actual * 1000), path: [{ x: s2x + 250, y: 290 }, { x: s2x + 250, y: 315 }] },
      { from: "re2", to: "n_gnd", current: round(Ic2_actual * 1000), path: [{ x: s2x + 250, y: 365 }, { x: s2x + 250, y: 460 }, { x: 350, y: 460 }] },
      // Stage 2 bias
      { from: "n_vcc", to: "r1b", current: round(I_div2 * 1000), path: [{ x: s2x + 250, y: 45 }, { x: s2x + 120, y: 45 }, { x: s2x + 120, y: 105 }] },
      { from: "r1b", to: "n_b2", current: round(I_div2 * 1000), path: [{ x: s2x + 120, y: 155 }, { x: s2x + 120, y: 215 }, { x: s2x + 180, y: 215 }] },
      { from: "n_b2", to: "q2_b", current: round(Ib2 * 1000, 4), path: [{ x: s2x + 180, y: 215 }, { x: s2x + 210, y: 215 }] },
      { from: "n_b2", to: "r2b", current: round(I_div2 * 1000), path: [{ x: s2x + 120, y: 215 }, { x: s2x + 120, y: 275 }] },
      { from: "r2b", to: "n_gnd", current: round(I_div2 * 1000), path: [{ x: s2x + 120, y: 325 }, { x: s2x + 120, y: 460 }, { x: 350, y: 460 }] },
      // Stage 2 bypass
      { from: "n_e2", to: "ce2", current: 0, path: [{ x: s2x + 250, y: 290 }, { x: s2x + 340, y: 290 }, { x: s2x + 340, y: 315 }] },
      { from: "ce2", to: "n_gnd", current: 0, path: [{ x: s2x + 340, y: 365 }, { x: s2x + 340, y: 460 }, { x: 350, y: 460 }] },
      // Stage 2 output coupling
      { from: "n_c2", to: "c2", current: 0, path: [{ x: s2x + 250, y: 165 }, { x: s2x + 315, y: 165 }] },
      { from: "c2", to: "n_output", current: 0, path: [{ x: s2x + 345, y: 165 }, { x: s2x + 400, y: 165 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "Vcc", voltage: Vcc, unit: "V" },
        { node: "V(B1)", voltage: round(Vb1_actual), unit: "V" },
        { node: "V(C1)", voltage: round(Vc1_actual), unit: "V" },
        { node: "V(E1)", voltage: round(Ve1_actual), unit: "V" },
        { node: "Ic1", voltage: round(Ic1_actual * 1000), unit: "mA" },
        { node: "V(B2)", voltage: round(Vb2_actual), unit: "V" },
        { node: "V(C2)", voltage: round(Vc2_actual), unit: "V" },
        { node: "V(E2)", voltage: round(Ve2_actual), unit: "V" },
        { node: "Ic2", voltage: round(Ic2_actual * 1000), unit: "mA" },
      ],
      voltageGain: round(totalGain),
      inputImpedance: round(beta * re1_actual),
      outputImpedance: Rc2,
      powerDissipation: round(Vcc * (Ic1_actual + Ic2_actual)),
      bandwidth: { low: fL, high: 500000, unit: "Hz" },
      calculations: [
        { title: "Stage 1 Gain", formula: "Av1 = RC1 / re1", substitution: `${formatResistance(Rc1)}${formatResUnit(Rc1)} / ${re1_actual.toFixed(1)}Ω`, result: `Av1 = ${Av1_actual.toFixed(1)}`, explanation: "First stage provides moderate gain with good stability." },
        { title: "Stage 2 Gain", formula: "Av2 = RC2 / re2", substitution: `${formatResistance(Rc2)}${formatResUnit(Rc2)} / ${re2_actual.toFixed(1)}Ω`, result: `Av2 = ${Av2_actual.toFixed(1)}`, explanation: "Second stage multiplies the overall gain." },
        { title: "Total Gain", formula: "Av_total = Av1 × Av2", substitution: `${Av1_actual.toFixed(1)} × ${Av2_actual.toFixed(1)}`, result: `Av = ${totalGain.toFixed(0)}`, explanation: `Target: ${targetGain}, achieved: ${totalGain.toFixed(0)} (cascaded CE stages).` },
        { title: "Stage 1 Bias", formula: "Voltage divider bias", substitution: `R1A = ${formatResistance(R1a)}${formatResUnit(R1a)}, R2A = ${formatResistance(R2a)}${formatResUnit(R2a)}`, result: `VB1 = ${Vb1_actual.toFixed(2)}V, Ic1 = ${(Ic1_actual*1000).toFixed(2)}mA`, explanation: "Stiff divider ensures stable Q-point." },
        { title: "Stage 2 Bias", formula: "Voltage divider bias", substitution: `R1B = ${formatResistance(R1b)}${formatResUnit(R1b)}, R2B = ${formatResistance(R2b)}${formatResUnit(R2b)}`, result: `VB2 = ${Vb2_actual.toFixed(2)}V, Ic2 = ${(Ic2_actual*1000).toFixed(2)}mA`, explanation: "Independent bias for each stage prevents interaction." },
        { title: "Coupling Capacitor", formula: "Cc = 1 / (2πfL × Zin2)", substitution: `1 / (2π × ${fL} × ${round(R1b * R2b / (R1b + R2b))}Ω)`, result: `Cc = ${formatCapacitance(Cc_calc)} ${formatCapUnit(Cc_calc)}`, explanation: "AC couples stages while blocking DC bias interaction." },
      ],
    },
  };
}
