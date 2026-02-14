import { CircuitSpec } from "@/types/circuit";
import { round, nearestStandard, formatResistance, formatResUnit } from "./circuit-utils";

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
      { from: "n_collector", to: "q1", current: round(Ic_actual * 1000), path: [{ x: 325, y: 165 }, { x: 325, y: 210 }] },
      { from: "q1", to: "n_emitter", current: round(Ic_actual * 1000), path: [{ x: 325, y: 250 }, { x: 325, y: 290 }] },
      { from: "n_emitter", to: "re", current: round(Ic_actual * 1000), path: [{ x: 325, y: 290 }, { x: 325, y: 315 }] },
      { from: "re", to: "n_gnd", current: round(Ic_actual * 1000), path: [{ x: 325, y: 365 }, { x: 325, y: 430 }] },
      { from: "n_vcc", to: "r1", current: round(I_divider * 1000), path: [{ x: 325, y: 45 }, { x: 170, y: 45 }, { x: 170, y: 105 }] },
      { from: "r1", to: "n_base", current: round(I_divider * 1000), path: [{ x: 170, y: 155 }, { x: 170, y: 215 }, { x: 250, y: 215 }] },
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
