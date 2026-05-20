import { CircuitSpec } from "@/types/circuit";
import { ParsedIntent } from "@/lib/circuit-parser";
import { round, nearestStandard, formatResistance, formatResUnit, formatCapacitance, formatCapUnit } from "./circuit-utils";
import { generateAmplifierResponse, generateOpAmpResponse, generateLowPassResponse, generateHighPassResponse } from "./frequency-response";

// Import extended generators
import { generateHalfWaveRectifier, generateBridgeRectifier, generateSeriesClipper, generatePositiveClamper, generateNegativeClamper } from "./circuit-gen-diode";
import { generateVoltageFollower, generateSummingAmplifier, generateIntegrator, generateDifferentiator } from "./circuit-gen-opamp-ext";
import { generateBandPassFilter, generateActiveLowPass, generateActiveHighPass, generateWienBridge, generateMonostable555 } from "./circuit-gen-filter-ext";
import { generateCommonBase, generateDarlingtonPair, generateSingleTuned, generateMultistageAmplifier } from "./circuit-gen-transistor-ext";
import { generateHartleyOscillator, generateColpittsOscillator, generatePhaseShiftOscillator, generateCrystalOscillator } from "./circuit-gen-oscillator-ext";

export function generateCircuit(intent: ParsedIntent): CircuitSpec {
  switch (intent.circuitType) {
    case "ce_amplifier":
      return generateCEAmplifier(intent.params);
    case "cc_amplifier":
      return generateCCAmplifier(intent.params);
    case "cb_amplifier":
      return generateCommonBase(intent.params);
    case "darlington_pair":
      return generateDarlingtonPair(intent.params);
    case "single_tuned_amplifier":
      return generateSingleTuned(intent.params);
    case "multistage_amplifier":
      return generateMultistageAmplifier(intent.params);
    case "voltage_divider":
      return generateVoltageDivider(intent.params);
    case "inverting_opamp":
      return generateInvertingOpamp(intent.params);
    case "non_inverting_opamp":
      return generateNonInvertingOpamp(intent.params);
    case "voltage_follower_opamp":
      return generateVoltageFollower(intent.params);
    case "summing_amplifier":
      return generateSummingAmplifier(intent.params);
    case "integrator_opamp":
      return generateIntegrator(intent.params);
    case "differentiator_opamp":
      return generateDifferentiator(intent.params);
    case "rc_low_pass":
      return generateRCLowPass(intent.params);
    case "rc_high_pass":
      return generateRCHighPass(intent.params);
    case "band_pass_filter":
      return generateBandPassFilter(intent.params);
    case "active_low_pass":
      return generateActiveLowPass(intent.params);
    case "active_high_pass":
      return generateActiveHighPass(intent.params);
    case "astable_multivibrator":
      return generateAstable(intent.params);
    case "monostable_555":
      return generateMonostable555(intent.params);
    case "wien_bridge_oscillator":
      return generateWienBridge(intent.params);
    case "half_wave_rectifier":
      return generateHalfWaveRectifier(intent.params);
    case "bridge_rectifier":
      return generateBridgeRectifier(intent.params);
    case "series_clipper":
      return generateSeriesClipper(intent.params);
    case "positive_clamper":
      return generatePositiveClamper(intent.params);
    case "negative_clamper":
      return generateNegativeClamper(intent.params);
    default:
      return generateCEAmplifier(intent.params);
  }
}

// ─── CE Amplifier ────────────────────────────────────────────
function generateCEAmplifier(p: Record<string, number | string>): CircuitSpec {
  const Vcc = Number(p.Vcc) || 12;
  const targetGain = Math.abs(Number(p.gain)) || 50;
  const RL = Number(p.RL) || 10000;
  const beta = 200;
  const Vbe = 0.7;

  // Design approach: Av = Rc / re (with bypassed RE)
  // re = 26mV / Ic(mA) = VT / Ic
  // Choose Ic so that Rc = targetGain * re fits within Vcc headroom
  // Vc should be ~Vcc/2 for maximum output swing
  // Vc = Vcc - Ic*Rc, and we want Vc ≈ Vcc/2
  // So Ic*Rc ≈ Vcc/2 → Ic = Vcc / (2 * Rc)
  // Also Rc = targetGain * re = targetGain * 0.026 / Ic
  // Substituting: Ic = Vcc / (2 * targetGain * 0.026 / Ic)
  // Ic² = Vcc / (2 * targetGain * 0.026)
  // Ic = sqrt(Vcc / (0.052 * targetGain))
  
  let Ic = Math.sqrt(Vcc / (0.052 * targetGain));
  // Clamp Ic to reasonable range (0.5mA to 20mA)
  Ic = Math.max(0.5e-3, Math.min(20e-3, Ic));
  
  const re = 0.026 / Ic; // thermal voltage / Ic
  const Rc_calc = targetGain * re;
  const Rc = nearestStandard(Rc_calc);
  
  // RE for DC stability: VE ≈ 10% of Vcc (or at least 1V)
  const Ve_target = Math.max(1, Vcc * 0.1);
  const Re_calc = Ve_target / Ic;
  const Re = nearestStandard(Re_calc);
  
  const Ve = Ic * Re;
  const Vb = Ve + Vbe;
  const Vc = Vcc - Ic * Rc;
  
  // Voltage divider bias: I_divider >> Ib for stability
  const Ib = Ic / beta;
  const I_divider = 10 * Ib;
  const R2_calc = Vb / I_divider;
  const R1_calc = (Vcc - Vb) / I_divider;
  const R1v = nearestStandard(R1_calc);
  const R2v = nearestStandard(R2_calc);
  
  // Recalculate actual values with standard components
  const Vb_actual = Vcc * R2v / (R1v + R2v);
  const Ve_actual = Vb_actual - Vbe;
  const Ic_actual = Ve_actual / Re;
  const re_actual = 0.026 / Ic_actual;
  const Vc_actual = Vcc - Ic_actual * Rc;
  const actualGain = Rc / re_actual;
  
  // Coupling capacitor: Xc = R/10 at low freq (100Hz)
  const fL = 100; // target lower -3dB
  const C1_calc = 1 / (2 * Math.PI * fL * (R1v * R2v / (R1v + R2v))); // input coupling
  const C2_calc = 1 / (2 * Math.PI * fL * RL); // output coupling
  const Ce_calc = 1 / (2 * Math.PI * fL * re_actual); // bypass cap
  
  const actualBW_high = beta / (2 * Math.PI * Rc * 10e-12); // rough estimate with Cbc

  return {
    type: "Common Emitter Amplifier",
    topology: "voltage_divider_bias",
    parameters: { Vcc, targetGain, loadResistance: RL, actualGain: round(actualGain), bandwidth: `${fL}Hz – ${round(actualBW_high > 1e6 ? actualBW_high / 1e6 : actualBW_high / 1e3)}${actualBW_high > 1e6 ? 'MHz' : 'kHz'}` },
    components: [
      { id: "vcc", type: "voltage_source", label: "Vcc", value: String(Vcc), unit: "V", x: 325, y: 45 },
      { id: "r1", type: "resistor", label: "R1", value: formatResistance(R1v), unit: formatResUnit(R1v), x: 170, y: 130, rotation: 90 },
      { id: "r2", type: "resistor", label: "R2", value: formatResistance(R2v), unit: formatResUnit(R2v), x: 170, y: 300, rotation: 90 },
      { id: "rc", type: "resistor", label: "RC", value: formatResistance(Rc), unit: formatResUnit(Rc), x: 325, y: 130, rotation: 90 },
      { id: "re", type: "resistor", label: "RE", value: formatResistance(Re), unit: formatResUnit(Re), x: 325, y: 340, rotation: 90 },
      { id: "q1", type: "transistor", label: "Q1", value: "2N2222", unit: "", x: 310, y: 230 },
      { id: "c1", type: "capacitor", label: "C1", value: formatCapacitance(C1_calc), unit: formatCapUnit(C1_calc), x: 90, y: 215 },
      { id: "c2", type: "capacitor", label: "C2", value: formatCapacitance(C2_calc), unit: formatCapUnit(C2_calc), x: 480, y: 165 },
      { id: "ce", type: "capacitor", label: "CE", value: formatCapacitance(Ce_calc), unit: formatCapUnit(Ce_calc), x: 420, y: 340, rotation: 90 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 325, y: 430 },
    ],
    nodes: [
      { id: "n_vcc", label: "Vcc", x: 325, y: 45, voltage: Vcc, type: "supply" },
      { id: "n_base", label: "Base", x: 250, y: 215, voltage: round(Vb_actual), type: "internal" },
      { id: "n_collector", label: "Collector", x: 325, y: 165, voltage: round(Vc_actual), type: "internal" },
      { id: "n_emitter", label: "Emitter", x: 325, y: 290, voltage: round(Ve_actual), type: "internal" },
      { id: "n_input", label: "Vin", x: 40, y: 215, voltage: 0, type: "input" },
      { id: "n_output", label: "Vout", x: 560, y: 165, voltage: round(Vc_actual), type: "output" },
      { id: "n_gnd", label: "GND", x: 325, y: 430, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_vcc", to: "rc", current: round(Ic_actual * 1000, 2), path: [{ x: 325, y: 45 }, { x: 325, y: 105 }] },
      { from: "n_vcc", to: "r1", current: round(I_divider * 1000, 3), path: [{ x: 325, y: 45 }, { x: 170, y: 45 }, { x: 170, y: 100 }] },
      { from: "rc", to: "n_collector", current: round(Ic_actual * 1000, 2), path: [{ x: 325, y: 155 }, { x: 325, y: 165 }] },
      { from: "n_collector", to: "q1_c", current: round(Ic_actual * 1000, 2), path: [{ x: 325, y: 165 }, { x: 330, y: 165 }, { x: 330, y: 210 }] },
      { from: "q1_e", to: "n_emitter", current: round(Ic_actual * 1000, 2), path: [{ x: 330, y: 250 }, { x: 330, y: 290 }, { x: 325, y: 290 }] },
      { from: "n_emitter", to: "re", current: round(Ic_actual * 1000, 2), path: [{ x: 325, y: 290 }, { x: 325, y: 315 }] },
      { from: "re", to: "n_gnd", current: round(Ic_actual * 1000, 2), path: [{ x: 325, y: 365 }, { x: 325, y: 430 }] },
      { from: "r1", to: "n_base", current: round(I_divider * 1000, 3), path: [{ x: 170, y: 155 }, { x: 170, y: 215 }, { x: 250, y: 215 }] },
      { from: "n_base", to: "q1_b", current: round(Ib * 1000, 4), path: [{ x: 250, y: 215 }, { x: 285, y: 215 }] },
      { from: "n_base", to: "r2", current: round(I_divider * 1000, 3), path: [{ x: 170, y: 215 }, { x: 170, y: 275 }] },
      { from: "r2", to: "n_gnd", current: round(I_divider * 1000, 3), path: [{ x: 170, y: 325 }, { x: 170, y: 430 }, { x: 325, y: 430 }] },
      { from: "n_input", to: "c1", current: 0, path: [{ x: 40, y: 215 }, { x: 75, y: 215 }] },
      { from: "c1", to: "n_base", current: 0, path: [{ x: 105, y: 215 }, { x: 170, y: 215 }] },
      { from: "n_collector", to: "c2", current: 0, path: [{ x: 325, y: 165 }, { x: 465, y: 165 }] },
      { from: "c2", to: "n_output", current: 0, path: [{ x: 495, y: 165 }, { x: 560, y: 165 }] },
      { from: "n_emitter", to: "ce", current: 0, path: [{ x: 325, y: 290 }, { x: 420, y: 290 }, { x: 420, y: 325 }] },
      { from: "ce", to: "n_gnd", current: 0, path: [{ x: 420, y: 355 }, { x: 420, y: 430 }, { x: 325, y: 430 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "Vcc", voltage: Vcc, unit: "V" },
        { node: "V(Base)", voltage: round(Vb_actual), unit: "V" },
        { node: "V(Collector)", voltage: round(Vc_actual), unit: "V" },
        { node: "V(Emitter)", voltage: round(Ve_actual), unit: "V" },
        { node: "Ic", voltage: round(Ic_actual * 1000, 2), unit: "mA" },
      ],
      voltageGain: round(actualGain),
      inputImpedance: round(beta * re_actual),
      outputImpedance: Rc,
      powerDissipation: round(Vcc * Ic_actual, 3),
      bandwidth: { low: fL, high: round(Math.min(actualBW_high, 1e7)), unit: "Hz" },
      frequencyResponse: generateAmplifierResponse(20 * Math.log10(actualGain), fL, Math.min(actualBW_high, 1e7)),
      cutoffFrequency: round(Math.min(actualBW_high, 1e7)),
      rolloffRate: -20,
      calculations: [
        { title: "Thermal Voltage re", formula: "re = VT / Ic = 26mV / Ic", substitution: `re = 26mV / ${(Ic_actual * 1000).toFixed(2)}mA`, result: `re = ${re_actual.toFixed(1)} Ω`, explanation: "Small-signal emitter resistance determines gain." },
        { title: "Collector Resistor (Rc)", formula: "Rc = Av × re", substitution: `Rc = ${targetGain} × ${re_actual.toFixed(1)}Ω`, result: `Rc = ${formatResistance(Rc)} ${formatResUnit(Rc)} (E24)`, explanation: "Rc selected to achieve target voltage gain with bypassed RE." },
        { title: "Emitter Resistor (RE)", formula: "RE = VE / Ic, VE ≈ 10% Vcc", substitution: `RE = ${Ve_target.toFixed(1)}V / ${(Ic_actual * 1000).toFixed(2)}mA`, result: `RE = ${formatResistance(Re)} ${formatResUnit(Re)}`, explanation: "RE provides DC stability; bypassed by CE for AC gain." },
        { title: "Bias Resistors R1, R2", formula: "R2 = VB / I_div, R1 = (Vcc−VB) / I_div", substitution: `I_div = 10×Ib = ${(I_divider * 1000).toFixed(3)}mA`, result: `R1 = ${formatResistance(R1v)} ${formatResUnit(R1v)}, R2 = ${formatResistance(R2v)} ${formatResUnit(R2v)}`, explanation: "Stiff voltage divider (I_div >> Ib) for bias stability." },
        { title: "Voltage Gain (Av)", formula: "Av = −Rc / re (bypassed RE)", substitution: `Av = −${formatResistance(Rc)}${formatResUnit(Rc)} / ${re_actual.toFixed(1)}Ω`, result: `Av ≈ ${actualGain.toFixed(1)}`, explanation: `Target gain: ${targetGain}, achieved: ${actualGain.toFixed(1)} (using E24 standard values).` },
        { title: "DC Operating Point", formula: "Vc = Vcc − Ic×Rc", substitution: `Vc = ${Vcc} − ${(Ic_actual*1000).toFixed(2)}mA × ${formatResistance(Rc)}${formatResUnit(Rc)}`, result: `Vc = ${Vc_actual.toFixed(2)} V`, explanation: `Collector at ${(Vc_actual/Vcc*100).toFixed(0)}% of Vcc — ${Math.abs(Vc_actual - Vcc/2) < Vcc*0.2 ? 'good swing range' : 'limited swing'}.` },
      ],
    },
  };
}

// ─── Voltage Divider ─────────────────────────────────────────
function generateVoltageDivider(p: Record<string, number | string>): CircuitSpec {
  const Vin = Number(p.Vin) || 12;
  const Vout = Number(p.Vout) || 5;
  const Iload = (Number(p.Iload) || 1) / 1000;
  const R2 = Vout / (Iload * 10);
  const R1 = (Vin - Vout) / (Vout / R2 + Iload);
  const R1v = nearestStandard(R1);
  const R2v = nearestStandard(R2);
  const Vout_actual = Vin * R2v / (R1v + R2v);
  const Ptotal = Vin * Vin / (R1v + R2v);

  return {
    type: "Voltage Divider",
    topology: "resistive_divider",
    parameters: { Vin, Vout, Iload: Number(p.Iload) || 1 },
    components: [
      { id: "vs", type: "voltage_source", label: "Vin", value: String(Vin), unit: "V", x: 150, y: 80 },
      { id: "r1", type: "resistor", label: "R1", value: formatResistance(R1v), unit: formatResUnit(R1v), x: 300, y: 140, rotation: 90, power: Math.pow(Vin - Vout_actual, 2) / R1v },
      { id: "r2", type: "resistor", label: "R2", value: formatResistance(R2v), unit: formatResUnit(R2v), x: 300, y: 300, rotation: 90, power: Math.pow(Vout_actual, 2) / R2v },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 300, y: 420 },
    ],
    nodes: [
      { id: "n_vin", label: "Vin", x: 150, y: 80, voltage: Vin, type: "supply" },
      { id: "n_top", label: "Vin", x: 300, y: 80, voltage: Vin, type: "supply" },
      { id: "n_mid", label: "Vout", x: 300, y: 220, voltage: round(Vout_actual), type: "output" },
      { id: "n_out", label: "Vout", x: 480, y: 220, voltage: round(Vout_actual), type: "output" },
      { id: "n_gnd", label: "GND", x: 300, y: 420, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_vin", to: "n_top", current: (Vin / (R1v + R2v)) * 1000, path: [{ x: 150, y: 80 }, { x: 300, y: 80 }] },
      { from: "n_top", to: "r1", current: (Vin / (R1v + R2v)) * 1000, path: [{ x: 300, y: 80 }, { x: 300, y: 115 }] },
      { from: "r1", to: "n_mid", current: (Vin / (R1v + R2v)) * 1000, path: [{ x: 300, y: 165 }, { x: 300, y: 220 }] },
      { from: "n_mid", to: "n_out", current: Iload * 1000, path: [{ x: 300, y: 220 }, { x: 480, y: 220 }] },
      { from: "n_mid", to: "r2", current: (Vout_actual / R2v) * 1000, path: [{ x: 300, y: 220 }, { x: 300, y: 275 }] },
      { from: "r2", to: "n_gnd", current: (Vout_actual / R2v) * 1000, path: [{ x: 300, y: 325 }, { x: 300, y: 420 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "Vin", voltage: Vin, unit: "V" },
        { node: "Vout", voltage: round(Vout_actual), unit: "V" },
        { node: "I_total", voltage: round((Vin / (R1v + R2v)) * 1000), unit: "mA" },
      ],
      powerDissipation: round(Ptotal),
      calculations: [
        { title: "Output Voltage", formula: "Vout = Vin × R2 / (R1 + R2)", substitution: `${Vin} × ${R2v} / (${R1v} + ${R2v})`, result: `Vout = ${Vout_actual.toFixed(2)} V`, explanation: "Unloaded output voltage from resistive divider." },
        { title: "R2 Selection", formula: "R2 = Vout / (10 × Iload)", substitution: `${Vout} / (10 × ${(Iload*1000).toFixed(1)}mA)`, result: `R2 ≈ ${formatResistance(R2v)} ${formatResUnit(R2v)}`, explanation: "R2 chosen so divider current ≈ 10× load current." },
        { title: "R1 Selection", formula: "R1 = (Vin - Vout) / I_divider", substitution: `(${Vin} - ${Vout}) / ${((Vin/(R1v+R2v))*1000).toFixed(2)}mA`, result: `R1 ≈ ${formatResistance(R1v)} ${formatResUnit(R1v)}`, explanation: "R1 drops the remaining voltage." },
      ],
    },
  };
}

// ─── Inverting Op-Amp ────────────────────────────────────────
function generateInvertingOpamp(p: Record<string, number | string>): CircuitSpec {
  const gain = Math.abs(Number(p.gain) || 10);
  const opamp = String(p.opamp || "LM741");
  const Rin = 10000;
  const Rf = Rin * gain;
  const Rfv = nearestStandard(Rf);
  const actualGain = Rfv / Rin;

  return {
    type: "Inverting Op-Amp Amplifier",
    topology: "inverting",
    parameters: { gain: -gain, opamp },
    components: [
      { id: "rin", type: "resistor", label: "Rin", value: formatResistance(Rin), unit: formatResUnit(Rin), x: 140, y: 200 },
      { id: "rf", type: "resistor", label: "Rf", value: formatResistance(Rfv), unit: formatResUnit(Rfv), x: 300, y: 120 },
      { id: "u1", type: "opamp", label: opamp, value: opamp, unit: "", x: 320, y: 220 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 280, y: 380 },
    ],
    nodes: [
      { id: "n_in", label: "Vin", x: 50, y: 200, voltage: 0, type: "input" },
      { id: "n_inv", label: "V−", x: 240, y: 200, voltage: 0, type: "internal" },
      { id: "n_ninv", label: "V+", x: 280, y: 240, voltage: 0, type: "internal" },
      { id: "n_out", label: "Vout", x: 480, y: 220, voltage: 0, type: "output" },
      { id: "n_gnd", label: "GND", x: 280, y: 380, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_in", to: "rin", current: 0, path: [{ x: 50, y: 200 }, { x: 115, y: 200 }] },
      { from: "rin", to: "n_inv", current: 0, path: [{ x: 165, y: 200 }, { x: 240, y: 200 }] },
      { from: "n_inv", to: "rf_l", current: 0, path: [{ x: 240, y: 200 }, { x: 240, y: 120 }, { x: 275, y: 120 }] },
      { from: "rf_r", to: "n_out", current: 0, path: [{ x: 325, y: 120 }, { x: 480, y: 120 }, { x: 480, y: 220 }] },
      { from: "n_inv", to: "u1_inv", current: 0, path: [{ x: 240, y: 200 }, { x: 275, y: 200 }] },
      { from: "n_ninv", to: "n_gnd", current: 0, path: [{ x: 280, y: 240 }, { x: 280, y: 380 }] },
      { from: "u1_out", to: "n_out", current: 0, path: [{ x: 370, y: 220 }, { x: 480, y: 220 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "V(−)", voltage: 0, unit: "V (virtual ground)" },
        { node: "V(+)", voltage: 0, unit: "V" },
      ],
      voltageGain: -round(actualGain),
      inputImpedance: Rin,
      outputImpedance: 0,
      powerDissipation: 0,
      bandwidth: { low: 0, high: round(1e6 / actualGain), unit: "Hz" },
      frequencyResponse: generateOpAmpResponse(-actualGain, 1e6),
      gainBandwidthProduct: 1e6,
      cutoffFrequency: round(1e6 / actualGain),
      rolloffRate: -20,
      calculations: [
        { title: "Voltage Gain", formula: "Av = -Rf / Rin", substitution: `Av = -${Rfv} / ${Rin}`, result: `Av = ${(-actualGain).toFixed(1)}`, explanation: "Gain set by feedback and input resistor ratio." },
        { title: "Feedback Resistor", formula: "Rf = |Av| × Rin", substitution: `Rf = ${gain} × ${Rin}`, result: `Rf = ${formatResistance(Rfv)} ${formatResUnit(Rfv)}`, explanation: "Selected nearest standard value." },
        { title: "Bandwidth", formula: "BW = GBP / |Av|", substitution: `BW = 1MHz / ${gain}`, result: `BW ≈ ${(1e6/gain/1000).toFixed(0)} kHz`, explanation: "Gain-bandwidth product limits closed-loop bandwidth." },
      ],
    },
  };
}

// ─── Non-Inverting Op-Amp ────────────────────────────────────
function generateNonInvertingOpamp(p: Record<string, number | string>): CircuitSpec {
  const gain = Number(p.gain) || 11;
  const opamp = String(p.opamp || "LM741");
  const R1 = 1000;
  const Rf = R1 * (gain - 1);
  const Rfv = nearestStandard(Rf);
  const actualGain = 1 + Rfv / R1;

  return {
    type: "Non-Inverting Op-Amp Amplifier",
    topology: "non_inverting",
    parameters: { gain, opamp },
    components: [
      { id: "r1", type: "resistor", label: "R1", value: formatResistance(R1), unit: formatResUnit(R1), x: 280, y: 320, rotation: 90 },
      { id: "rf", type: "resistor", label: "Rf", value: formatResistance(Rfv), unit: formatResUnit(Rfv), x: 300, y: 120 },
      { id: "u1", type: "opamp", label: opamp, value: opamp, unit: "", x: 320, y: 220 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 280, y: 420 },
    ],
    nodes: [
      { id: "n_in", label: "Vin", x: 50, y: 240, voltage: 0, type: "input" },
      { id: "n_ninv", label: "V+", x: 275, y: 240, voltage: 0, type: "internal" },
      { id: "n_inv", label: "V−", x: 240, y: 200, voltage: 0, type: "internal" },
      { id: "n_out", label: "Vout", x: 480, y: 220, voltage: 0, type: "output" },
      { id: "n_fb", label: "FB", x: 240, y: 120, voltage: 0, type: "internal" },
      { id: "n_gnd", label: "GND", x: 280, y: 420, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_in", to: "n_ninv", current: 0, path: [{ x: 50, y: 240 }, { x: 275, y: 240 }] },
      { from: "n_inv", to: "n_fb", current: 0, path: [{ x: 240, y: 200 }, { x: 240, y: 120 }, { x: 275, y: 120 }] },
      { from: "n_fb", to: "n_out", current: 0, path: [{ x: 325, y: 120 }, { x: 480, y: 120 }, { x: 480, y: 220 }] },
      { from: "n_inv", to: "u1_inv", current: 0, path: [{ x: 240, y: 200 }, { x: 275, y: 200 }] },
      { from: "n_inv", to: "r1", current: 0, path: [{ x: 240, y: 200 }, { x: 240, y: 295 }, { x: 280, y: 295 }] },
      { from: "r1", to: "n_gnd", current: 0, path: [{ x: 280, y: 345 }, { x: 280, y: 420 }] },
      { from: "u1", to: "n_out", current: 0, path: [{ x: 370, y: 220 }, { x: 480, y: 220 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "V(+)", voltage: 0, unit: "V (signal)" },
        { node: "V(−)", voltage: 0, unit: "V (feedback)" },
      ],
      voltageGain: round(actualGain),
      inputImpedance: 1e12,
      outputImpedance: 0,
      powerDissipation: 0,
      bandwidth: { low: 0, high: round(1e6 / actualGain), unit: "Hz" },
      frequencyResponse: generateOpAmpResponse(actualGain, 1e6),
      gainBandwidthProduct: 1e6,
      cutoffFrequency: round(1e6 / actualGain),
      rolloffRate: -20,
      calculations: [
        { title: "Voltage Gain", formula: "Av = 1 + Rf / R1", substitution: `Av = 1 + ${Rfv} / ${R1}`, result: `Av = ${actualGain.toFixed(1)}`, explanation: "Non-inverting gain is always ≥ 1." },
        { title: "Feedback Resistor", formula: "Rf = (Av − 1) × R1", substitution: `Rf = (${gain} − 1) × ${R1}`, result: `Rf = ${formatResistance(Rfv)} ${formatResUnit(Rfv)}`, explanation: "Standard value selected." },
      ],
    },
  };
}

// ─── RC Low-Pass Filter ──────────────────────────────────────
function generateRCLowPass(p: Record<string, number | string>): CircuitSpec {
  const fc = Number(p.fc) || 1000;
  const C = 100e-9;
  const R = 1 / (2 * Math.PI * fc * C);
  const Rv = nearestStandard(R);
  const fc_actual = 1 / (2 * Math.PI * Rv * C);

  return {
    type: "RC Low-Pass Filter",
    topology: "first_order_lpf",
    parameters: { cutoff: fc, order: 1 },
    components: [
      { id: "r1", type: "resistor", label: "R", value: formatResistance(Rv), unit: formatResUnit(Rv), x: 220, y: 180 },
      { id: "c1", type: "capacitor", label: "C", value: formatCapacitance(C), unit: formatCapUnit(C), x: 380, y: 260, rotation: 90 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 380, y: 380 },
    ],
    nodes: [
      { id: "n_in", label: "Vin", x: 80, y: 180, voltage: 0, type: "input" },
      { id: "n_mid", label: "Vout", x: 380, y: 180, voltage: 0, type: "output" },
      { id: "n_out", label: "Vout", x: 500, y: 180, voltage: 0, type: "output" },
      { id: "n_gnd", label: "GND", x: 380, y: 380, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_in", to: "r1", current: 0, path: [{ x: 80, y: 180 }, { x: 195, y: 180 }] },
      { from: "r1", to: "n_mid", current: 0, path: [{ x: 245, y: 180 }, { x: 380, y: 180 }] },
      { from: "n_mid", to: "c1", current: 0, path: [{ x: 380, y: 180 }, { x: 380, y: 245 }] },
      { from: "c1", to: "n_gnd", current: 0, path: [{ x: 380, y: 275 }, { x: 380, y: 380 }] },
      { from: "n_mid", to: "n_out", current: 0, path: [{ x: 380, y: 180 }, { x: 500, y: 180 }] },
    ],
    analysis: {
      dcOperatingPoint: [{ node: "fc", voltage: round(fc_actual), unit: "Hz" }],
      powerDissipation: 0,
      bandwidth: { low: 0, high: round(fc_actual), unit: "Hz" },
      frequencyResponse: generateLowPassResponse(0, fc_actual),
      cutoffFrequency: round(fc_actual),
      rolloffRate: -20,
      calculations: [
        { title: "Cutoff Frequency", formula: "fc = 1 / (2π × R × C)", substitution: `fc = 1 / (2π × ${Rv} × ${(C*1e9).toFixed(0)}nF)`, result: `fc = ${fc_actual.toFixed(0)} Hz`, explanation: "−3dB point of the filter." },
        { title: "Resistor Value", formula: "R = 1 / (2π × fc × C)", substitution: `R = 1 / (2π × ${fc} × ${(C*1e9).toFixed(0)}nF)`, result: `R ≈ ${formatResistance(Rv)} ${formatResUnit(Rv)}`, explanation: "Nearest standard resistor value selected." },
        { title: "Roll-off", formula: "−20 dB/decade", substitution: "First-order filter", result: "−20 dB/dec above fc", explanation: "Single RC stage provides 20dB/decade attenuation." },
      ],
    },
  };
}

// ─── RC High-Pass Filter ─────────────────────────────────────
function generateRCHighPass(p: Record<string, number | string>): CircuitSpec {
  const fc = Number(p.fc) || 1000;
  const C = 100e-9;
  const R = 1 / (2 * Math.PI * fc * C);
  const Rv = nearestStandard(R);
  const fc_actual = 1 / (2 * Math.PI * Rv * C);

  return {
    type: "RC High-Pass Filter",
    topology: "first_order_hpf",
    parameters: { cutoff: fc, order: 1 },
    components: [
      { id: "c1", type: "capacitor", label: "C", value: formatCapacitance(C), unit: formatCapUnit(C), x: 200, y: 180 },
      { id: "r1", type: "resistor", label: "R", value: formatResistance(Rv), unit: formatResUnit(Rv), x: 370, y: 260, rotation: 90 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 370, y: 380 },
    ],
    nodes: [
      { id: "n_in", label: "Vin", x: 80, y: 180, voltage: 0, type: "input" },
      { id: "n_mid", label: "Vout", x: 370, y: 180, voltage: 0, type: "output" },
      { id: "n_out", label: "Vout", x: 500, y: 180, voltage: 0, type: "output" },
      { id: "n_gnd", label: "GND", x: 370, y: 380, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_in", to: "c1", current: 0, path: [{ x: 80, y: 180 }, { x: 185, y: 180 }] },
      { from: "c1", to: "n_mid", current: 0, path: [{ x: 215, y: 180 }, { x: 370, y: 180 }] },
      { from: "n_mid", to: "r1", current: 0, path: [{ x: 370, y: 180 }, { x: 370, y: 235 }] },
      { from: "r1", to: "n_gnd", current: 0, path: [{ x: 370, y: 285 }, { x: 370, y: 380 }] },
      { from: "n_mid", to: "n_out", current: 0, path: [{ x: 370, y: 180 }, { x: 500, y: 180 }] },
    ],
    analysis: {
      dcOperatingPoint: [{ node: "fc", voltage: round(fc_actual), unit: "Hz" }],
      powerDissipation: 0,
      bandwidth: { low: round(fc_actual), high: 1e9, unit: "Hz" },
      frequencyResponse: generateHighPassResponse(0, fc_actual),
      cutoffFrequency: round(fc_actual),
      rolloffRate: -20,
      calculations: [
        { title: "Cutoff Frequency", formula: "fc = 1 / (2π × R × C)", substitution: `fc = 1 / (2π × ${Rv} × ${(C*1e9).toFixed(0)}nF)`, result: `fc = ${fc_actual.toFixed(0)} Hz`, explanation: "−3dB point of the high-pass filter." },
        { title: "Resistor Value", formula: "R = 1 / (2π × fc × C)", substitution: `R = 1 / (2π × ${fc} × ${(C*1e9).toFixed(0)}nF)`, result: `R ≈ ${formatResistance(Rv)} ${formatResUnit(Rv)}`, explanation: "Nearest standard resistor value selected." },
      ],
    },
  };
}

// ─── Common Collector (Emitter Follower) ─────────────────────
function generateCCAmplifier(p: Record<string, number | string>): CircuitSpec {
  const Vcc = Number(p.Vcc) || 12;
  const Ic = 5e-3;
  const beta = 200;
  const Vbe = 0.7;
  const Re = 1000;
  const Ve = Ic * Re;
  const Vb = Ve + Vbe;
  const I_divider = 10 * (Ic / beta);
  const R1 = (Vcc - Vb) / I_divider;
  const R2 = Vb / I_divider;
  const R1v = nearestStandard(R1);
  const R2v = nearestStandard(R2);

  return {
    type: "Common Collector (Emitter Follower)",
    topology: "emitter_follower",
    parameters: { Vcc, gain: "≈1 (unity)" },
    components: [
      { id: "vcc", type: "voltage_source", label: "Vcc", value: String(Vcc), unit: "V", x: 300, y: 50 },
      { id: "r1", type: "resistor", label: "R1", value: formatResistance(R1v), unit: formatResUnit(R1v), x: 160, y: 140, rotation: 90 },
      { id: "r2", type: "resistor", label: "R2", value: formatResistance(R2v), unit: formatResUnit(R2v), x: 160, y: 300, rotation: 90 },
      { id: "re", type: "resistor", label: "RE", value: "1", unit: "kΩ", x: 300, y: 330, rotation: 90 },
      { id: "q1", type: "transistor", label: "Q1", value: "2N2222", unit: "", x: 280, y: 220 },
      { id: "c1", type: "capacitor", label: "C1", value: "10", unit: "μF", x: 70, y: 210 },
      { id: "c2", type: "capacitor", label: "C2", value: "10", unit: "μF", x: 440, y: 290 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 300, y: 430 },
    ],
    nodes: [
      { id: "n_vcc", label: "Vcc", x: 300, y: 50, voltage: Vcc, type: "supply" },
      { id: "n_base", label: "Base", x: 220, y: 210, voltage: round(Vb), type: "internal" },
      { id: "n_emitter", label: "Emitter", x: 300, y: 280, voltage: round(Ve), type: "internal" },
      { id: "n_in", label: "Vin", x: 30, y: 210, voltage: 0, type: "input" },
      { id: "n_out", label: "Vout", x: 520, y: 290, voltage: round(Ve), type: "output" },
      { id: "n_gnd", label: "GND", x: 300, y: 430, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_vcc", to: "q1_c", current: Ic * 1000, path: [{ x: 300, y: 50 }, { x: 300, y: 200 }] },
      { from: "n_vcc", to: "r1", current: I_divider * 1000, path: [{ x: 300, y: 50 }, { x: 160, y: 50 }, { x: 160, y: 115 }] },
      { from: "r1", to: "n_base", current: I_divider * 1000, path: [{ x: 160, y: 165 }, { x: 160, y: 210 }, { x: 220, y: 210 }] },
      { from: "n_base", to: "r2", current: I_divider * 1000, path: [{ x: 160, y: 210 }, { x: 160, y: 275 }] },
      { from: "r2", to: "n_gnd", current: I_divider * 1000, path: [{ x: 160, y: 325 }, { x: 160, y: 430 }, { x: 300, y: 430 }] },
      { from: "n_base", to: "q1_b", current: 0, path: [{ x: 220, y: 210 }, { x: 255, y: 210 }] },
      { from: "q1_e", to: "n_emitter", current: Ic * 1000, path: [{ x: 300, y: 240 }, { x: 300, y: 280 }] },
      { from: "n_emitter", to: "re", current: Ic * 1000, path: [{ x: 300, y: 280 }, { x: 300, y: 305 }] },
      { from: "re", to: "n_gnd", current: Ic * 1000, path: [{ x: 300, y: 355 }, { x: 300, y: 430 }] },
      { from: "n_in", to: "c1", current: 0, path: [{ x: 30, y: 210 }, { x: 55, y: 210 }] },
      { from: "c1", to: "n_base", current: 0, path: [{ x: 85, y: 210 }, { x: 160, y: 210 }] },
      { from: "n_emitter", to: "c2", current: 0, path: [{ x: 300, y: 280 }, { x: 425, y: 280 }, { x: 425, y: 290 }] },
      { from: "c2", to: "n_out", current: 0, path: [{ x: 455, y: 290 }, { x: 520, y: 290 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "Vcc", voltage: Vcc, unit: "V" },
        { node: "V(Base)", voltage: round(Vb), unit: "V" },
        { node: "V(Emitter)", voltage: round(Ve), unit: "V" },
        { node: "Ic", voltage: round(Ic * 1000), unit: "mA" },
      ],
      voltageGain: 1,
      inputImpedance: round(beta * Re),
      outputImpedance: round(26 / (Ic * 1000)),
      powerDissipation: round(Vcc * Ic),
      frequencyResponse: generateAmplifierResponse(0, 50, 500000),
      cutoffFrequency: 500000,
      rolloffRate: -20,
      calculations: [
        { title: "Voltage Gain", formula: "Av ≈ 1 (unity)", substitution: "Emitter follower", result: "Av ≈ 1", explanation: "Output follows input with near-unity gain." },
        { title: "Output Impedance", formula: "Zout ≈ re = 26mV / Ic", substitution: `Zout = 26 / ${(Ic*1000).toFixed(1)}`, result: `Zout ≈ ${(26/(Ic*1000)).toFixed(1)} Ω`, explanation: "Very low output impedance — good for driving loads." },
        { title: "Input Impedance", formula: "Zin ≈ β × RE", substitution: `Zin = ${beta} × ${Re}`, result: `Zin ≈ ${(beta*Re/1000).toFixed(0)} kΩ`, explanation: "High input impedance from base looking into emitter." },
      ],
    },
  };
}

// ─── Astable Multivibrator (555 Timer) ───────────────────────
function generateAstable(p: Record<string, number | string>): CircuitSpec {
  const freq = Number(p.freq) || 1000;
  const C = 100e-9;
  const Ra = 1 / (1.44 * freq * C) * 0.5;
  const Rb = Ra;
  const Rav = nearestStandard(Ra);
  const Rbv = nearestStandard(Rb);
  const freq_actual = 1.44 / ((Rav + 2 * Rbv) * C);
  const duty = (Rav + Rbv) / (Rav + 2 * Rbv) * 100;

  return {
    type: "Astable Multivibrator (555 Timer)",
    topology: "555_astable",
    parameters: { frequency: freq, duty_cycle: round(duty) },
    components: [
      { id: "vcc", type: "voltage_source", label: "Vcc", value: "9", unit: "V", x: 300, y: 50 },
      { id: "ra", type: "resistor", label: "RA", value: formatResistance(Rav), unit: formatResUnit(Rav), x: 180, y: 140, rotation: 90 },
      { id: "rb", type: "resistor", label: "RB", value: formatResistance(Rbv), unit: formatResUnit(Rbv), x: 180, y: 260, rotation: 90 },
      { id: "c1", type: "capacitor", label: "C1", value: formatCapacitance(C), unit: formatCapUnit(C), x: 180, y: 370, rotation: 90 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 300, y: 430 },
    ],
    nodes: [
      { id: "n_vcc", label: "Vcc", x: 300, y: 50, voltage: 9, type: "supply" },
      { id: "n_dis", label: "DIS", x: 180, y: 200, voltage: 0, type: "internal" },
      { id: "n_thr", label: "THR", x: 180, y: 320, voltage: 0, type: "internal" },
      { id: "n_out", label: "OUT", x: 480, y: 200, voltage: 0, type: "output" },
      { id: "n_gnd", label: "GND", x: 300, y: 430, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_vcc", to: "ra", current: 0, path: [{ x: 300, y: 50 }, { x: 180, y: 50 }, { x: 180, y: 115 }] },
      { from: "ra", to: "n_dis", current: 0, path: [{ x: 180, y: 165 }, { x: 180, y: 200 }] },
      { from: "n_dis", to: "rb", current: 0, path: [{ x: 180, y: 200 }, { x: 180, y: 235 }] },
      { from: "rb", to: "n_thr", current: 0, path: [{ x: 180, y: 285 }, { x: 180, y: 320 }] },
      { from: "n_thr", to: "c1", current: 0, path: [{ x: 180, y: 320 }, { x: 180, y: 355 }] },
      { from: "c1", to: "n_gnd", current: 0, path: [{ x: 180, y: 385 }, { x: 180, y: 430 }, { x: 300, y: 430 }] },
      { from: "n_dis", to: "n_out", current: 0, path: [{ x: 180, y: 200 }, { x: 300, y: 200 }, { x: 480, y: 200 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "Vcc", voltage: 9, unit: "V" },
        { node: "f_out", voltage: round(freq_actual), unit: "Hz" },
        { node: "Duty", voltage: round(duty), unit: "%" },
      ],
      powerDissipation: 0,
      bandwidth: { low: round(freq_actual), high: round(freq_actual), unit: "Hz" },
      calculations: [
        { title: "Output Frequency", formula: "f = 1.44 / ((RA + 2RB) × C)", substitution: `f = 1.44 / ((${Rav} + 2×${Rbv}) × ${(C*1e9).toFixed(0)}nF)`, result: `f ≈ ${freq_actual.toFixed(0)} Hz`, explanation: "555 astable mode oscillation frequency." },
        { title: "Duty Cycle", formula: "D = (RA + RB) / (RA + 2RB) × 100%", substitution: `D = (${Rav} + ${Rbv}) / (${Rav} + 2×${Rbv}) × 100`, result: `D ≈ ${duty.toFixed(1)}%`, explanation: "Ratio of high time to total period." },
        { title: "RA & RB Selection", formula: "RA ≈ RB ≈ 1 / (1.44 × f × C × 2)", substitution: `1 / (1.44 × ${freq} × ${(C*1e9).toFixed(0)}nF × 2)`, result: `RA = RB ≈ ${formatResistance(Rav)} ${formatResUnit(Rav)}`, explanation: "Equal resistors give near 67% duty cycle." },
      ],
    },
  };
}
