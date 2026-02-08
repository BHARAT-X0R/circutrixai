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
      { id: "vcc", type: "voltage_source", label: "Vcc", value: "12", unit: "V", x: 325, y: 45 },
      { id: "r1", type: "resistor", label: "R1", value: "82", unit: "kΩ", x: 170, y: 130, power: Math.pow(Vcc - Vb, 2) / R1_actual },
      { id: "r2", type: "resistor", label: "R2", value: "12", unit: "kΩ", x: 170, y: 300, power: Math.pow(Vb, 2) / R2_actual },
      { id: "rc", type: "resistor", label: "RC", value: "4.7", unit: "kΩ", x: 325, y: 130, power: Math.pow(Ic, 2) * Rc_actual },
      { id: "re", type: "resistor", label: "RE", value: "470", unit: "Ω", x: 325, y: 340, power: Math.pow(Ic, 2) * Re },
      { id: "q1", type: "transistor", label: "Q1", value: "2N2222", unit: "", x: 310, y: 230 },
      { id: "c1", type: "capacitor", label: "C1", value: "1.6", unit: "μF", x: 90, y: 215 },
      { id: "c2", type: "capacitor", label: "C2", value: "0.16", unit: "μF", x: 480, y: 165 },
      { id: "ce", type: "capacitor", label: "CE", value: "3.4", unit: "μF", x: 420, y: 340 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 325, y: 430 },
    ],
    nodes: [
      { id: "n_vcc", label: "Vcc", x: 325, y: 45, voltage: 12, type: "supply" },
      { id: "n_base", label: "Base", x: 250, y: 215, voltage: parseFloat(Vb.toFixed(2)), type: "internal" },
      { id: "n_collector", label: "Collector", x: 325, y: 165, voltage: parseFloat(Vc.toFixed(2)), type: "internal" },
      { id: "n_emitter", label: "Emitter", x: 325, y: 290, voltage: parseFloat(Ve.toFixed(2)), type: "internal" },
      { id: "n_input", label: "Vin", x: 40, y: 215, voltage: 0, type: "input" },
      { id: "n_output", label: "Vout", x: 560, y: 165, voltage: parseFloat(Vc.toFixed(2)), type: "output" },
      { id: "n_gnd", label: "GND", x: 325, y: 430, voltage: 0, type: "ground" },
    ],
    connections: [
      // Vcc rail down to R1 top and Rc top
      { from: "n_vcc", to: "rc", current: Ic * 1000, path: [{ x: 325, y: 45 }, { x: 325, y: 100 }] },
      { from: "n_vcc", to: "r1", current: I_divider * 1000, path: [{ x: 325, y: 45 }, { x: 170, y: 45 }, { x: 170, y: 100 }] },
      // Rc bottom to collector
      { from: "rc", to: "n_collector", current: Ic * 1000, path: [{ x: 325, y: 155 }, { x: 325, y: 165 }] },
      // Collector to transistor top (C pin)
      { from: "n_collector", to: "q1_c", current: Ic * 1000, path: [{ x: 325, y: 165 }, { x: 325, y: 210 }] },
      // Transistor emitter (E pin) to emitter node
      { from: "q1_e", to: "n_emitter", current: Ic * 1000, path: [{ x: 325, y: 250 }, { x: 325, y: 290 }] },
      // Emitter to RE top
      { from: "n_emitter", to: "re", current: Ic * 1000, path: [{ x: 325, y: 290 }, { x: 325, y: 315 }] },
      // RE bottom to GND
      { from: "re", to: "n_gnd", current: Ic * 1000, path: [{ x: 325, y: 365 }, { x: 325, y: 430 }] },
      // R1 bottom to base node
      { from: "r1", to: "n_base", current: I_divider * 1000, path: [{ x: 170, y: 155 }, { x: 170, y: 215 }, { x: 250, y: 215 }] },
      // Base node to transistor base (B pin)
      { from: "n_base", to: "q1_b", current: Ic / beta * 1000, path: [{ x: 250, y: 215 }, { x: 285, y: 215 }] },
      // Base junction down to R2 top
      { from: "n_base", to: "r2", current: I_divider * 1000, path: [{ x: 170, y: 215 }, { x: 170, y: 275 }] },
      // R2 bottom to GND
      { from: "r2", to: "n_gnd", current: I_divider * 1000, path: [{ x: 170, y: 325 }, { x: 170, y: 430 }, { x: 325, y: 430 }] },
      // Input through C1 to base
      { from: "n_input", to: "c1", current: 0, path: [{ x: 40, y: 215 }, { x: 75, y: 215 }] },
      { from: "c1", to: "n_base", current: 0, path: [{ x: 105, y: 215 }, { x: 170, y: 215 }] },
      // Collector to C2 to output
      { from: "n_collector", to: "c2", current: 0, path: [{ x: 325, y: 165 }, { x: 465, y: 165 }] },
      { from: "c2", to: "n_output", current: 0, path: [{ x: 495, y: 165 }, { x: 560, y: 165 }] },
      // CE bypass cap: emitter node to GND via CE
      { from: "n_emitter", to: "ce", current: 0, path: [{ x: 325, y: 290 }, { x: 420, y: 290 }, { x: 420, y: 315 }] },
      { from: "ce", to: "n_gnd", current: 0, path: [{ x: 420, y: 365 }, { x: 420, y: 430 }, { x: 325, y: 430 }] },
      // GND rail
      { from: "n_gnd", to: "gnd", current: 0, path: [{ x: 325, y: 430 }, { x: 325, y: 430 }] },
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
