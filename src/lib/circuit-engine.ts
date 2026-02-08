import { CircuitSpec } from "@/types/circuit";

export function generateCEAmplifier(): CircuitSpec {
  const Vcc = 12;
  const Av = 50;
  const RL = 10000;
  const beta = 200;
  const Vce_sat = 0.2;
  const Vbe = 0.7;

  // Design calculations
  const Ic = 1e-3; // 1mA quiescent
  const Rc = (Vcc * 0.4) / Ic; // ~4.8kΩ → use 4.7kΩ
  const Rc_actual = 4700;
  const Re = Rc_actual / 10; // 470Ω
  const Ve = Ic * Re;
  const Vb = Ve + Vbe;
  const I_divider = 10 * (Ic / beta);
  const R2 = Vb / I_divider;
  const R1 = (Vcc - Vb) / I_divider;
  const R1_actual = 82000;
  const R2_actual = 12000;
  const Vc = Vcc - Ic * Rc_actual;

  // Coupling caps for 100Hz low cutoff
  const C1 = 1 / (2 * Math.PI * 100 * 1000);
  const C2 = 1 / (2 * Math.PI * 100 * RL);
  const Ce = 1 / (2 * Math.PI * 100 * Re);

  return {
    type: "Common Emitter Amplifier",
    topology: "voltage_divider_bias",
    parameters: {
      Vcc,
      targetGain: Av,
      loadResistance: RL,
      bandwidth: "100Hz – 100kHz",
    },
    components: [
      { id: "vcc", type: "voltage_source", label: "Vcc", value: "12", unit: "V", x: 400, y: 40 },
      { id: "r1", type: "resistor", label: "R1", value: "82", unit: "kΩ", x: 200, y: 120, power: Math.pow(Vcc - Vb, 2) / R1_actual },
      { id: "r2", type: "resistor", label: "R2", value: "12", unit: "kΩ", x: 200, y: 280, power: Math.pow(Vb, 2) / R2_actual },
      { id: "rc", type: "resistor", label: "RC", value: "4.7", unit: "kΩ", x: 400, y: 120, power: Math.pow(Ic, 2) * Rc_actual },
      { id: "re", type: "resistor", label: "RE", value: "470", unit: "Ω", x: 400, y: 320, power: Math.pow(Ic, 2) * Re },
      { id: "q1", type: "transistor", label: "Q1", value: "2N2222", unit: "", x: 350, y: 220 },
      { id: "c1", type: "capacitor", label: "C1", value: "1.6", unit: "μF", x: 100, y: 200 },
      { id: "c2", type: "capacitor", label: "C2", value: "0.16", unit: "μF", x: 520, y: 200 },
      { id: "ce", type: "capacitor", label: "CE", value: "3.4", unit: "μF", x: 480, y: 320 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 300, y: 420 },
    ],
    nodes: [
      { id: "n_vcc", label: "Vcc", x: 400, y: 40, voltage: 12, type: "supply" },
      { id: "n_base", label: "Base", x: 300, y: 200, voltage: parseFloat(Vb.toFixed(2)), type: "internal" },
      { id: "n_collector", label: "Collector", x: 400, y: 170, voltage: parseFloat(Vc.toFixed(2)), type: "internal" },
      { id: "n_emitter", label: "Emitter", x: 400, y: 280, voltage: parseFloat(Ve.toFixed(2)), type: "internal" },
      { id: "n_input", label: "Vin", x: 50, y: 200, voltage: 0, type: "input" },
      { id: "n_output", label: "Vout", x: 580, y: 170, voltage: parseFloat(Vc.toFixed(2)), type: "output" },
      { id: "n_gnd", label: "GND", x: 300, y: 420, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_vcc", to: "n_collector", current: Ic * 1000, path: [{ x: 400, y: 40 }, { x: 400, y: 170 }] },
      { from: "n_collector", to: "n_output", current: 0, path: [{ x: 400, y: 170 }, { x: 580, y: 170 }] },
      { from: "n_vcc", to: "n_base", current: I_divider * 1000, path: [{ x: 400, y: 40 }, { x: 200, y: 40 }, { x: 200, y: 200 }, { x: 300, y: 200 }] },
      { from: "n_base", to: "n_gnd", current: I_divider * 1000, path: [{ x: 200, y: 200 }, { x: 200, y: 420 }, { x: 300, y: 420 }] },
      { from: "n_emitter", to: "n_gnd", current: Ic * 1000, path: [{ x: 400, y: 280 }, { x: 400, y: 420 }, { x: 300, y: 420 }] },
      { from: "n_input", to: "n_base", current: 0, path: [{ x: 50, y: 200 }, { x: 300, y: 200 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "Vcc", voltage: 12, unit: "V" },
        { node: "V(Base)", voltage: parseFloat(Vb.toFixed(2)), unit: "V" },
        { node: "V(Collector)", voltage: parseFloat(Vc.toFixed(2)), unit: "V" },
        { node: "V(Emitter)", voltage: parseFloat(Ve.toFixed(2)), unit: "V" },
        { node: "Ic", voltage: Ic * 1000, unit: "mA" },
      ],
      voltageGain: parseFloat((Rc_actual / (26 / Ic / 1000)).toFixed(1)),
      inputImpedance: parseFloat(((beta * 26) / (Ic * 1000)).toFixed(0)),
      outputImpedance: Rc_actual,
      powerDissipation: parseFloat((Vcc * Ic * 1.2).toFixed(3)),
      bandwidth: { low: 100, high: 100000, unit: "Hz" },
      calculations: [
        {
          title: "Collector Current (Ic)",
          formula: "Ic = Vcc × 0.4 / Rc",
          substitution: "Ic = 12 × 0.4 / 4700",
          result: `Ic ≈ ${(Ic * 1000).toFixed(2)} mA`,
          explanation: "Set quiescent collector current for class-A operation in the middle of the load line.",
        },
        {
          title: "Base Voltage (Vb)",
          formula: "Vb = Ve + Vbe = Ic × Re + 0.7",
          substitution: `Vb = ${(Ic * 1000).toFixed(2)}mA × 470Ω + 0.7V`,
          result: `Vb = ${Vb.toFixed(2)} V`,
          explanation: "Base voltage is set by the voltage divider R1-R2 to establish the operating point.",
        },
        {
          title: "Voltage Divider R1, R2",
          formula: "R2 = Vb / I_divider, R1 = (Vcc - Vb) / I_divider",
          substitution: `I_divider = 10 × Ic/β = ${(I_divider * 1e6).toFixed(1)} μA`,
          result: `R1 = 82 kΩ, R2 = 12 kΩ`,
          explanation: "Divider current chosen as 10× base current for bias stability.",
        },
        {
          title: "Collector Voltage (Vc)",
          formula: "Vc = Vcc - Ic × Rc",
          substitution: `Vc = 12 - ${(Ic * 1000).toFixed(2)}mA × 4.7kΩ`,
          result: `Vc = ${Vc.toFixed(2)} V`,
          explanation: "Must be > Vce(sat) for linear operation. Ideally ~Vcc/2 for max swing.",
        },
        {
          title: "Voltage Gain (Av)",
          formula: "Av = -Rc / re, where re = 26mV / Ic",
          substitution: `Av = -4700 / (26 / ${(Ic * 1000).toFixed(1)})`,
          result: `Av ≈ ${(Rc_actual / (26 / Ic / 1000)).toFixed(1)}`,
          explanation: "Small-signal voltage gain with bypassed emitter resistor.",
        },
        {
          title: "Coupling Capacitor C1",
          formula: "C1 = 1 / (2π × f_low × R_in)",
          substitution: "C1 = 1 / (2π × 100 × 1000)",
          result: `C1 ≈ 1.6 μF`,
          explanation: "Input coupling capacitor sets the low-frequency -3dB point.",
        },
      ],
    },
  };
}

export const examplePrompts = [
  "Design a CE amplifier with gain 50, bandwidth 100Hz to 100kHz, Vcc 12V, load 10kΩ",
  "Build an inverting op-amp with gain -10, using LM741",
  "Create a 2nd order Butterworth low-pass filter, fc = 1kHz",
  "Design a voltage divider: 12V input, 5V output, 1mA load",
  "Build an astable multivibrator with 1kHz square wave output",
];
