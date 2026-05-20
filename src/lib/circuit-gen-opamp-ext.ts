import { CircuitSpec } from "@/types/circuit";
import { round, nearestStandard, formatResistance, formatResUnit, formatCapacitance, formatCapUnit } from "./circuit-utils";

// ─── Voltage Follower (Unity Buffer) ─────────────────────────
export function generateVoltageFollower(p: Record<string, number | string>): CircuitSpec {
  const opamp = String(p.opamp || "LM741");

  return {
    type: "Voltage Follower (Buffer)",
    topology: "unity_gain_buffer",
    parameters: { gain: 1, opamp },
    components: [
      { id: "u1", type: "opamp", label: opamp, value: opamp, unit: "", x: 320, y: 220 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 280, y: 380 },
    ],
    nodes: [
      { id: "n_in", label: "Vin", x: 50, y: 240, voltage: 0, type: "input" },
      { id: "n_ninv", label: "V+", x: 280, y: 240, voltage: 0, type: "internal" },
      { id: "n_inv", label: "V−", x: 280, y: 200, voltage: 0, type: "internal" },
      { id: "n_out", label: "Vout", x: 500, y: 220, voltage: 0, type: "output" },
      { id: "n_gnd", label: "GND", x: 280, y: 380, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_in", to: "n_ninv", current: 0, path: [{ x: 50, y: 240 }, { x: 280, y: 240 }] },
      { from: "u1", to: "n_out", current: 0, path: [{ x: 370, y: 220 }, { x: 500, y: 220 }] },
      { from: "n_out", to: "n_inv", current: 0, path: [{ x: 500, y: 220 }, { x: 500, y: 140 }, { x: 280, y: 140 }, { x: 280, y: 200 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "V(+)", voltage: 0, unit: "V (signal)" },
        { node: "V(−)", voltage: 0, unit: "V (=Vout)" },
      ],
      voltageGain: 1,
      inputImpedance: 1e12,
      outputImpedance: 0,
      powerDissipation: 0,
      calculations: [
        { title: "Voltage Gain", formula: "Av = 1 (unity)", substitution: "100% feedback", result: "Av = 1", explanation: "Output directly connected to inverting input." },
        { title: "Input Impedance", formula: "Zin → ∞", substitution: "Non-inverting input", result: "Zin ≈ 10¹² Ω", explanation: "Extremely high input impedance — ideal for buffering." },
        { title: "Output Impedance", formula: "Zout → 0", substitution: "Feedback reduces Zout", result: "Zout ≈ 0 Ω", explanation: "Can drive low-impedance loads effectively." },
      ],
    },
  };
}

// ─── Summing Amplifier ───────────────────────────────────────
export function generateSummingAmplifier(p: Record<string, number | string>): CircuitSpec {
  const gain = Math.abs(Number(p.gain) || 1);
  const opamp = String(p.opamp || "LM741");
  const n_inputs = Number(p.inputs) || 3;
  const Rin = 10000;
  const Rf = Rin * gain;
  const Rfv = nearestStandard(Rf);

  const components: CircuitSpec["components"] = [];
  const nodes: CircuitSpec["nodes"] = [];
  const connections: CircuitSpec["connections"] = [];

  // Input resistors
  for (let i = 0; i < n_inputs; i++) {
    const y = 150 + i * 50;
    components.push({ id: `r${i+1}`, type: "resistor", label: `R${i+1}`, value: formatResistance(Rin), unit: formatResUnit(Rin), x: 160, y });
    nodes.push({ id: `n_in${i+1}`, label: `V${i+1}`, x: 50, y, voltage: 0, type: "input" });
    connections.push({ from: `n_in${i+1}`, to: `r${i+1}`, current: 0, path: [{ x: 50, y }, { x: 140, y }] });
    connections.push({ from: `r${i+1}`, to: "n_inv", current: 0, path: [{ x: 185, y }, { x: 260, y }, { x: 260, y: 210 }] });
  }

  components.push(
    { id: "rf", type: "resistor", label: "Rf", value: formatResistance(Rfv), unit: formatResUnit(Rfv), x: 340, y: 130 },
    { id: "u1", type: "opamp", label: opamp, value: opamp, unit: "", x: 340, y: 230 },
    { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 300, y: 380 },
  );

  nodes.push(
    { id: "n_inv", label: "V−", x: 260, y: 210, voltage: 0, type: "internal" },
    { id: "n_ninv", label: "V+", x: 295, y: 250, voltage: 0, type: "internal" },
    { id: "n_out", label: "Vout", x: 500, y: 230, voltage: 0, type: "output" },
    { id: "n_gnd", label: "GND", x: 300, y: 380, voltage: 0, type: "ground" },
  );

  connections.push(
    { from: "n_inv", to: "rf_l", current: 0, path: [{ x: 260, y: 210 }, { x: 260, y: 130 }, { x: 315, y: 130 }] },
    { from: "rf_r", to: "n_out", current: 0, path: [{ x: 365, y: 130 }, { x: 500, y: 130 }, { x: 500, y: 230 }] },
    { from: "n_inv", to: "u1_inv", current: 0, path: [{ x: 260, y: 210 }, { x: 295, y: 210 }] },
    { from: "n_ninv", to: "n_gnd", current: 0, path: [{ x: 295, y: 250 }, { x: 295, y: 380 }] },
    { from: "u1", to: "n_out", current: 0, path: [{ x: 390, y: 230 }, { x: 500, y: 230 }] },
  );

  return {
    type: "Summing Amplifier",
    topology: "inverting_summing",
    parameters: { gain: -gain, inputs: n_inputs, opamp },
    components,
    nodes,
    connections,
    analysis: {
      dcOperatingPoint: [
        { node: "V(−)", voltage: 0, unit: "V (virtual ground)" },
        { node: "V(+)", voltage: 0, unit: "V" },
      ],
      voltageGain: -round(Rfv / Rin),
      inputImpedance: Rin,
      outputImpedance: 0,
      powerDissipation: 0,
      calculations: [
        { title: "Output Voltage", formula: "Vout = −Rf/Rin × (V1 + V2 + V3 + ...)", substitution: `−${Rfv}/${Rin} × (ΣVn)`, result: `Vout = −${(Rfv/Rin).toFixed(1)} × ΣVn`, explanation: "Sums all inputs with inverting gain." },
        { title: "Equal-Weight Gain", formula: "Each input gain = −Rf / Rin", substitution: `−${Rfv} / ${Rin}`, result: `Gain per input = ${(-Rfv/Rin).toFixed(1)}`, explanation: "Equal resistors give equal weighting." },
      ],
    },
  };
}

// ─── Integrator ──────────────────────────────────────────────
export function generateIntegrator(p: Record<string, number | string>): CircuitSpec {
  const opamp = String(p.opamp || "LM741");
  const fc = Number(p.fc) || 1000;
  const Rin = 10000;
  const C = 1 / (2 * Math.PI * fc * Rin);
  const Cv = C;

  return {
    type: "Op-Amp Integrator",
    topology: "miller_integrator",
    parameters: { fc, opamp },
    components: [
      { id: "rin", type: "resistor", label: "R", value: formatResistance(Rin), unit: formatResUnit(Rin), x: 160, y: 200 },
      { id: "cf", type: "capacitor", label: "Cf", value: formatCapacitance(Cv), unit: formatCapUnit(Cv), x: 340, y: 130 },
      { id: "u1", type: "opamp", label: opamp, value: opamp, unit: "", x: 340, y: 230 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 300, y: 380 },
    ],
    nodes: [
      { id: "n_in", label: "Vin", x: 50, y: 200, voltage: 0, type: "input" },
      { id: "n_inv", label: "V−", x: 260, y: 210, voltage: 0, type: "internal" },
      { id: "n_ninv", label: "V+", x: 300, y: 250, voltage: 0, type: "internal" },
      { id: "n_out", label: "Vout", x: 500, y: 230, voltage: 0, type: "output" },
      { id: "n_gnd", label: "GND", x: 300, y: 380, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_in", to: "rin", current: 0, path: [{ x: 50, y: 200 }, { x: 135, y: 200 }] },
      { from: "rin", to: "n_inv", current: 0, path: [{ x: 185, y: 200 }, { x: 260, y: 210 }] },
      { from: "n_inv", to: "cf_l", current: 0, path: [{ x: 260, y: 210 }, { x: 260, y: 130 }, { x: 325, y: 130 }] },
      { from: "cf_r", to: "n_out", current: 0, path: [{ x: 355, y: 130 }, { x: 500, y: 130 }, { x: 500, y: 230 }] },
      { from: "n_inv", to: "u1_inv", current: 0, path: [{ x: 260, y: 210 }, { x: 295, y: 210 }] },
      { from: "n_ninv", to: "n_gnd", current: 0, path: [{ x: 295, y: 250 }, { x: 295, y: 380 }] },
      { from: "u1", to: "n_out", current: 0, path: [{ x: 390, y: 230 }, { x: 500, y: 230 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "V(−)", voltage: 0, unit: "V (virtual ground)" },
        { node: "fc", voltage: round(fc), unit: "Hz" },
      ],
      powerDissipation: 0,
      bandwidth: { low: 0, high: round(fc), unit: "Hz" },
      calculations: [
        { title: "Transfer Function", formula: "Vout = −1/(RCω) × ∫Vin dt", substitution: `R=${Rin}, C=${formatCapacitance(Cv)}${formatCapUnit(Cv)}`, result: `Time constant τ = ${(Rin * Cv * 1000).toFixed(2)} ms`, explanation: "Output is the integral of the input signal." },
        { title: "Unity Gain Frequency", formula: "fc = 1 / (2π × R × C)", substitution: `1 / (2π × ${Rin} × ${formatCapacitance(Cv)}${formatCapUnit(Cv)})`, result: `fc = ${fc} Hz`, explanation: "Frequency where gain magnitude = 1." },
        { title: "Gain at Frequency f", formula: "|H(f)| = fc / f", substitution: `${fc} / f`, result: "−20 dB/decade rolloff", explanation: "Gain decreases linearly with frequency." },
      ],
    },
  };
}

// ─── Differentiator ──────────────────────────────────────────
export function generateDifferentiator(p: Record<string, number | string>): CircuitSpec {
  const opamp = String(p.opamp || "LM741");
  const fc = Number(p.fc) || 1000;
  const Rf = 10000;
  const C = 1 / (2 * Math.PI * fc * Rf);
  const Cv = C;

  return {
    type: "Op-Amp Differentiator",
    topology: "differentiator",
    parameters: { fc, opamp },
    components: [
      { id: "cin", type: "capacitor", label: "C", value: formatCapacitance(Cv), unit: formatCapUnit(Cv), x: 160, y: 200 },
      { id: "rf", type: "resistor", label: "Rf", value: formatResistance(Rf), unit: formatResUnit(Rf), x: 340, y: 130 },
      { id: "u1", type: "opamp", label: opamp, value: opamp, unit: "", x: 340, y: 230 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 300, y: 380 },
    ],
    nodes: [
      { id: "n_in", label: "Vin", x: 50, y: 200, voltage: 0, type: "input" },
      { id: "n_inv", label: "V−", x: 260, y: 210, voltage: 0, type: "internal" },
      { id: "n_ninv", label: "V+", x: 300, y: 250, voltage: 0, type: "internal" },
      { id: "n_out", label: "Vout", x: 500, y: 230, voltage: 0, type: "output" },
      { id: "n_gnd", label: "GND", x: 300, y: 380, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_in", to: "cin", current: 0, path: [{ x: 50, y: 200 }, { x: 145, y: 200 }] },
      { from: "cin", to: "n_inv", current: 0, path: [{ x: 175, y: 200 }, { x: 260, y: 210 }] },
      { from: "n_inv", to: "rf_l", current: 0, path: [{ x: 260, y: 210 }, { x: 260, y: 130 }, { x: 315, y: 130 }] },
      { from: "rf_r", to: "n_out", current: 0, path: [{ x: 365, y: 130 }, { x: 500, y: 130 }, { x: 500, y: 230 }] },
      { from: "n_inv", to: "u1_inv", current: 0, path: [{ x: 260, y: 210 }, { x: 295, y: 210 }] },
      { from: "n_ninv", to: "n_gnd", current: 0, path: [{ x: 295, y: 250 }, { x: 295, y: 380 }] },
      { from: "u1", to: "n_out", current: 0, path: [{ x: 390, y: 230 }, { x: 500, y: 230 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "V(−)", voltage: 0, unit: "V (virtual ground)" },
        { node: "fc", voltage: round(fc), unit: "Hz" },
      ],
      powerDissipation: 0,
      calculations: [
        { title: "Transfer Function", formula: "Vout = −Rf × C × dVin/dt", substitution: `Rf=${Rf}, C=${formatCapacitance(Cv)}${formatCapUnit(Cv)}`, result: `τ = ${(Rf * Cv * 1000).toFixed(2)} ms`, explanation: "Output is proportional to derivative of input." },
        { title: "Corner Frequency", formula: "fc = 1 / (2π × Rf × C)", substitution: `1 / (2π × ${Rf} × ${formatCapacitance(Cv)}${formatCapUnit(Cv)})`, result: `fc = ${fc} Hz`, explanation: "Above fc gain increases at +20 dB/decade." },
        { title: "Gain at Frequency f", formula: "|H(f)| = f / fc", substitution: `f / ${fc}`, result: "+20 dB/decade slope", explanation: "Gain increases with frequency — noise-sensitive." },
      ],
    },
  };
}
