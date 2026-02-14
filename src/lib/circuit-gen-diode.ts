import { CircuitSpec } from "@/types/circuit";
import { round, nearestStandard, formatResistance, formatResUnit, formatCapacitance, formatCapUnit } from "./circuit-utils";

// ─── Half-Wave Rectifier ─────────────────────────────────────
export function generateHalfWaveRectifier(p: Record<string, number | string>): CircuitSpec {
  const Vin = Number(p.Vin) || 12;
  const RL = Number(p.RL) || 1000;
  const Vd = 0.7;
  const Vpeak = Vin * Math.sqrt(2);
  const Vout_peak = Vpeak - Vd;
  const Iload = Vout_peak / RL;
  const Vdc = Vout_peak / Math.PI;
  const C = 1e-3;
  const Vripple = Iload / (50 * C);

  return {
    type: "Half-Wave Rectifier",
    topology: "half_wave",
    parameters: { Vin_rms: Vin, RL },
    components: [
      { id: "vs", type: "voltage_source", label: "Vin AC", value: String(Vin), unit: "Vrms", x: 100, y: 200 },
      { id: "d1", type: "diode", label: "D1", value: "1N4007", unit: "", x: 250, y: 150 },
      { id: "rl", type: "resistor", label: "RL", value: formatResistance(RL), unit: formatResUnit(RL), x: 420, y: 260, rotation: 90 },
      { id: "c1", type: "capacitor", label: "C1", value: "1000", unit: "μF", x: 340, y: 260, rotation: 90 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 260, y: 400 },
    ],
    nodes: [
      { id: "n_in", label: "Vin", x: 100, y: 150, voltage: round(Vpeak), type: "input" },
      { id: "n_d_out", label: "D out", x: 340, y: 150, voltage: round(Vout_peak), type: "internal" },
      { id: "n_out", label: "Vout", x: 520, y: 150, voltage: round(Vdc), type: "output" },
      { id: "n_gnd", label: "GND", x: 260, y: 400, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_in", to: "d1", current: round(Iload * 1000), path: [{ x: 100, y: 150 }, { x: 235, y: 150 }] },
      { from: "d1", to: "n_d_out", current: round(Iload * 1000), path: [{ x: 265, y: 150 }, { x: 340, y: 150 }] },
      { from: "n_d_out", to: "n_out", current: round(Iload * 1000), path: [{ x: 340, y: 150 }, { x: 520, y: 150 }] },
      { from: "n_d_out", to: "c1", current: 0, path: [{ x: 340, y: 150 }, { x: 340, y: 245 }] },
      { from: "c1", to: "n_gnd", current: 0, path: [{ x: 340, y: 275 }, { x: 340, y: 400 }, { x: 260, y: 400 }] },
      { from: "n_out", to: "rl", current: round(Iload * 1000), path: [{ x: 520, y: 150 }, { x: 420, y: 150 }, { x: 420, y: 235 }] },
      { from: "rl", to: "n_gnd", current: round(Iload * 1000), path: [{ x: 420, y: 285 }, { x: 420, y: 400 }, { x: 260, y: 400 }] },
      { from: "vs", to: "n_in", current: round(Iload * 1000), path: [{ x: 100, y: 188 }, { x: 100, y: 150 }] },
      { from: "vs", to: "n_gnd", current: 0, path: [{ x: 100, y: 212 }, { x: 100, y: 400 }, { x: 260, y: 400 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "V_peak", voltage: round(Vpeak), unit: "V" },
        { node: "Vout_peak", voltage: round(Vout_peak), unit: "V" },
        { node: "Vdc", voltage: round(Vdc), unit: "V" },
        { node: "V_ripple", voltage: round(Vripple), unit: "V" },
        { node: "I_load", voltage: round(Iload * 1000), unit: "mA" },
      ],
      powerDissipation: round(Vd * Iload),
      calculations: [
        { title: "Peak Voltage", formula: "Vpeak = Vrms × √2", substitution: `${Vin} × 1.414`, result: `Vpeak = ${Vpeak.toFixed(1)} V`, explanation: "Peak value of the AC input." },
        { title: "Output Peak", formula: "Vout = Vpeak − Vd", substitution: `${Vpeak.toFixed(1)} − 0.7`, result: `Vout = ${Vout_peak.toFixed(1)} V`, explanation: "Diode forward voltage drop subtracted." },
        { title: "DC Average Voltage", formula: "Vdc = Vpeak / π", substitution: `${Vout_peak.toFixed(1)} / π`, result: `Vdc = ${Vdc.toFixed(2)} V`, explanation: "Average DC output without filter capacitor." },
        { title: "Ripple Voltage", formula: "Vr = Iload / (f × C)", substitution: `${(Iload*1000).toFixed(1)}mA / (50 × 1000μF)`, result: `Vr ≈ ${Vripple.toFixed(2)} V`, explanation: "Peak-to-peak ripple with capacitor filter." },
      ],
    },
  };
}

// ─── Bridge Rectifier ────────────────────────────────────────
export function generateBridgeRectifier(p: Record<string, number | string>): CircuitSpec {
  const Vin = Number(p.Vin) || 12;
  const RL = Number(p.RL) || 1000;
  const Vd = 0.7;
  const Vpeak = Vin * Math.sqrt(2);
  const Vout_peak = Vpeak - 2 * Vd;
  const Iload = Vout_peak / RL;
  const Vdc = (2 * Vout_peak) / Math.PI;
  const C = 1e-3;
  const Vripple = Iload / (100 * C);

  // Layout: diamond bridge with vertical diodes
  // Left column (x=180): D1 upper, D2 lower — AC+ junction at y=220
  // Right column (x=380): D3 upper, D4 lower — AC- junction at y=220
  // DC+ rail at y=100, DC- rail at y=350
  // All diodes rotation:90 (cathode top, anode bottom, current flows up)
  // D1: AC+(anode,bottom) → DC+(cathode,top)
  // D2: DC-(anode,bottom) → AC+(cathode,top) — return path
  // D3: AC-(anode,bottom) → DC+(cathode,top)
  // D4: DC-(anode,bottom) → AC-(cathode,top) — return path

  return {
    type: "Bridge Rectifier",
    topology: "full_wave_bridge",
    parameters: { Vin_rms: Vin, RL },
    components: [
      { id: "vs", type: "voltage_source", label: "Vin AC", value: String(Vin), unit: "Vrms", x: 80, y: 220 },
      { id: "d1", type: "diode", label: "D1", value: "1N4007", unit: "", x: 180, y: 155, rotation: 90 },
      { id: "d2", type: "diode", label: "D2", value: "1N4007", unit: "", x: 180, y: 290, rotation: 90 },
      { id: "d3", type: "diode", label: "D3", value: "1N4007", unit: "", x: 380, y: 155, rotation: 90 },
      { id: "d4", type: "diode", label: "D4", value: "1N4007", unit: "", x: 380, y: 290, rotation: 90 },
      { id: "c1", type: "capacitor", label: "C1", value: "1000", unit: "μF", x: 470, y: 220, rotation: 90 },
      { id: "rl", type: "resistor", label: "RL", value: formatResistance(RL), unit: formatResUnit(RL), x: 540, y: 220, rotation: 90 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 300, y: 410 },
    ],
    nodes: [
      { id: "n_ac_top", label: "AC+", x: 180, y: 220, voltage: round(Vpeak), type: "input" },
      { id: "n_ac_bot", label: "AC−", x: 380, y: 220, voltage: round(-Vpeak), type: "input" },
      { id: "n_dc_pos", label: "DC+", x: 300, y: 100, voltage: round(Vout_peak), type: "internal" },
      { id: "n_dc_neg", label: "DC−", x: 300, y: 350, voltage: 0, type: "internal" },
      { id: "n_out", label: "Vout", x: 580, y: 100, voltage: round(Vdc), type: "output" },
      { id: "n_gnd", label: "GND", x: 300, y: 410, voltage: 0, type: "ground" },
    ],
    connections: [
      // VS to AC junction nodes
      { from: "vs", to: "n_ac_top", current: round(Iload * 1000), path: [{ x: 92, y: 220 }, { x: 180, y: 220 }] },
      { from: "vs", to: "n_ac_bot", current: round(Iload * 1000), path: [{ x: 80, y: 232 }, { x: 80, y: 395 }, { x: 380, y: 395 }, { x: 380, y: 220 }] },
      // D1: AC+ (anode, bottom) up to DC+ (cathode, top)
      { from: "n_ac_top", to: "d1", current: round(Iload * 1000), path: [{ x: 180, y: 220 }, { x: 180, y: 170 }] },
      { from: "d1", to: "n_dc_pos", current: round(Iload * 1000), path: [{ x: 180, y: 140 }, { x: 180, y: 100 }] },
      // D3: AC- (anode, bottom) up to DC+ (cathode, top)
      { from: "n_ac_bot", to: "d3", current: round(Iload * 1000), path: [{ x: 380, y: 220 }, { x: 380, y: 170 }] },
      { from: "d3", to: "n_dc_pos", current: round(Iload * 1000), path: [{ x: 380, y: 140 }, { x: 380, y: 100 }] },
      // D2: DC- (anode, bottom) up to AC+ (cathode, top) — return path
      { from: "n_dc_neg", to: "d2", current: round(Iload * 1000), path: [{ x: 180, y: 350 }, { x: 180, y: 305 }] },
      { from: "d2", to: "n_ac_top", current: round(Iload * 1000), path: [{ x: 180, y: 275 }, { x: 180, y: 220 }] },
      // D4: DC- (anode, bottom) up to AC- (cathode, top) — return path
      { from: "n_dc_neg", to: "d4", current: round(Iload * 1000), path: [{ x: 380, y: 350 }, { x: 380, y: 305 }] },
      { from: "d4", to: "n_ac_bot", current: round(Iload * 1000), path: [{ x: 380, y: 275 }, { x: 380, y: 220 }] },
      // DC+ rail (horizontal)
      { from: "n_dc_pos", to: "n_out", current: round(Iload * 1000), path: [{ x: 180, y: 100 }, { x: 580, y: 100 }] },
      // DC- rail (horizontal) connecting to GND
      { from: "n_dc_neg", to: "n_gnd", current: round(Iload * 1000), path: [{ x: 180, y: 350 }, { x: 540, y: 350 }] },
      { from: "n_dc_neg", to: "n_gnd", current: 0, path: [{ x: 300, y: 350 }, { x: 300, y: 402 }] },
      // C1: DC+ rail down to DC- rail
      { from: "n_dc_pos", to: "c1", current: 0, path: [{ x: 470, y: 100 }, { x: 470, y: 205 }] },
      { from: "c1", to: "n_dc_neg", current: 0, path: [{ x: 470, y: 235 }, { x: 470, y: 350 }] },
      // RL: DC+ rail down to DC- rail
      { from: "n_out", to: "rl", current: round(Iload * 1000), path: [{ x: 540, y: 100 }, { x: 540, y: 195 }] },
      { from: "rl", to: "n_dc_neg", current: round(Iload * 1000), path: [{ x: 540, y: 245 }, { x: 540, y: 350 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "V_peak", voltage: round(Vpeak), unit: "V" },
        { node: "Vout_peak", voltage: round(Vout_peak), unit: "V" },
        { node: "Vdc", voltage: round(Vdc), unit: "V" },
        { node: "V_ripple", voltage: round(Vripple), unit: "V" },
        { node: "I_load", voltage: round(Iload * 1000), unit: "mA" },
      ],
      powerDissipation: round(2 * Vd * Iload),
      calculations: [
        { title: "Peak Voltage", formula: "Vpeak = Vrms × √2", substitution: `${Vin} × 1.414`, result: `Vpeak = ${Vpeak.toFixed(1)} V`, explanation: "Peak value of input AC." },
        { title: "Output Peak", formula: "Vout = Vpeak − 2Vd", substitution: `${Vpeak.toFixed(1)} − 2 × 0.7`, result: `Vout = ${Vout_peak.toFixed(1)} V`, explanation: "Two diode drops in bridge configuration." },
        { title: "DC Output", formula: "Vdc = 2 × Vpeak / π", substitution: `2 × ${Vout_peak.toFixed(1)} / π`, result: `Vdc = ${Vdc.toFixed(2)} V`, explanation: "Full-wave rectification doubles the average." },
        { title: "Ripple", formula: "Vr = Iload / (2f × C)", substitution: `${(Iload*1000).toFixed(1)}mA / (100 × 1000μF)`, result: `Vr = ${Vripple.toFixed(2)} V`, explanation: "Ripple frequency is 2× mains for bridge." },
      ],
    },
  };
}

// ─── Series Clipper ──────────────────────────────────────────
export function generateSeriesClipper(p: Record<string, number | string>): CircuitSpec {
  const Vin = Number(p.Vin) || 10;
  const Vref = Number(p.Vref) || 0;
  const Vd = 0.7;
  const RL = Number(p.RL) || 10000;
  const Vclip = Vref + Vd;

  return {
    type: "Series Clipper",
    topology: "series_diode_clipper",
    parameters: { Vin, Vref, RL },
    components: [
      { id: "vs", type: "voltage_source", label: "Vin", value: String(Vin), unit: "Vp", x: 80, y: 220 },
      { id: "r1", type: "resistor", label: "R", value: formatResistance(RL), unit: formatResUnit(RL), x: 220, y: 160 },
      { id: "d1", type: "diode", label: "D1", value: "1N4148", unit: "", x: 380, y: 250, rotation: 270 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 280, y: 400 },
    ],
    nodes: [
      { id: "n_in", label: "Vin", x: 80, y: 160, voltage: Vin, type: "input" },
      { id: "n_mid", label: "R out", x: 380, y: 160, voltage: round(Vclip), type: "internal" },
      { id: "n_out", label: "Vout", x: 500, y: 160, voltage: round(Vclip), type: "output" },
      { id: "n_gnd", label: "GND", x: 280, y: 400, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_in", to: "r1", current: round((Vin - Vclip) / RL * 1000), path: [{ x: 80, y: 160 }, { x: 195, y: 160 }] },
      { from: "r1", to: "n_mid", current: round((Vin - Vclip) / RL * 1000), path: [{ x: 245, y: 160 }, { x: 380, y: 160 }] },
      { from: "n_mid", to: "d1", current: 0, path: [{ x: 380, y: 160 }, { x: 380, y: 235 }] },
      { from: "d1", to: "n_gnd", current: 0, path: [{ x: 380, y: 265 }, { x: 380, y: 400 }, { x: 280, y: 400 }] },
      { from: "n_mid", to: "n_out", current: 0, path: [{ x: 380, y: 160 }, { x: 500, y: 160 }] },
      { from: "vs", to: "n_in", current: 0, path: [{ x: 80, y: 208 }, { x: 80, y: 160 }] },
      { from: "vs", to: "n_gnd", current: 0, path: [{ x: 80, y: 232 }, { x: 80, y: 400 }, { x: 280, y: 400 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "Vin_peak", voltage: Vin, unit: "V" },
        { node: "V_clip", voltage: round(Vclip), unit: "V" },
        { node: "V_diode", voltage: Vd, unit: "V" },
      ],
      powerDissipation: 0,
      calculations: [
        { title: "Clipping Level", formula: "Vclip = Vref + Vd", substitution: `${Vref} + 0.7`, result: `Vclip = ${Vclip.toFixed(1)} V`, explanation: "Output is clipped at this voltage when diode conducts." },
        { title: "Operation", formula: "Vin > Vclip → D ON → Vout = Vclip", substitution: `When Vin > ${Vclip.toFixed(1)}V`, result: "Diode clips positive peaks", explanation: "Below clipping level, output follows input." },
      ],
    },
  };
}

// ─── Positive Clamper ────────────────────────────────────────
export function generatePositiveClamper(p: Record<string, number | string>): CircuitSpec {
  const Vin = Number(p.Vin) || 10;
  const Vd = 0.7;
  const Vshift = Vin - Vd;
  const RL = Number(p.RL) || 100000;

  return {
    type: "Positive Clamper",
    topology: "positive_dc_restorer",
    parameters: { Vin_peak: Vin },
    components: [
      { id: "vs", type: "voltage_source", label: "Vin", value: String(Vin), unit: "Vp", x: 80, y: 230 },
      { id: "c1", type: "capacitor", label: "C", value: "10", unit: "μF", x: 220, y: 170 },
      { id: "d1", type: "diode", label: "D1", value: "1N4148", unit: "", x: 350, y: 250, rotation: 90 },
      { id: "rl", type: "resistor", label: "RL", value: formatResistance(RL), unit: formatResUnit(RL), x: 460, y: 280, rotation: 90 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 300, y: 400 },
    ],
    nodes: [
      { id: "n_in", label: "Vin", x: 80, y: 170, voltage: Vin, type: "input" },
      { id: "n_out", label: "Vout", x: 460, y: 170, voltage: round(Vshift), type: "output" },
      { id: "n_mid", label: "C out", x: 350, y: 170, voltage: round(Vshift), type: "internal" },
      { id: "n_gnd", label: "GND", x: 300, y: 400, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_in", to: "c1", current: 0, path: [{ x: 80, y: 170 }, { x: 205, y: 170 }] },
      { from: "c1", to: "n_mid", current: 0, path: [{ x: 235, y: 170 }, { x: 350, y: 170 }] },
      { from: "n_mid", to: "n_out", current: 0, path: [{ x: 350, y: 170 }, { x: 460, y: 170 }] },
      { from: "n_mid", to: "d1", current: 0, path: [{ x: 350, y: 170 }, { x: 350, y: 235 }] },
      { from: "d1", to: "n_gnd", current: 0, path: [{ x: 350, y: 265 }, { x: 350, y: 400 }, { x: 300, y: 400 }] },
      { from: "n_out", to: "rl", current: 0, path: [{ x: 460, y: 170 }, { x: 460, y: 255 }] },
      { from: "rl", to: "n_gnd", current: 0, path: [{ x: 460, y: 305 }, { x: 460, y: 400 }, { x: 300, y: 400 }] },
      { from: "vs", to: "n_in", current: 0, path: [{ x: 80, y: 218 }, { x: 80, y: 170 }] },
      { from: "vs", to: "n_gnd", current: 0, path: [{ x: 80, y: 242 }, { x: 80, y: 400 }, { x: 300, y: 400 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "Vin_peak", voltage: Vin, unit: "V" },
        { node: "DC_shift", voltage: round(Vshift), unit: "V" },
        { node: "Vout_max", voltage: round(2 * Vin - Vd), unit: "V" },
        { node: "Vout_min", voltage: round(-Vd), unit: "V" },
      ],
      powerDissipation: 0,
      calculations: [
        { title: "DC Shift", formula: "Vshift = Vpeak − Vd", substitution: `${Vin} − 0.7`, result: `Vshift = ${Vshift.toFixed(1)} V`, explanation: "Capacitor charges to peak input minus diode drop." },
        { title: "Output Range", formula: "Vout: −Vd to 2Vp−Vd", substitution: `−0.7V to ${(2*Vin - Vd).toFixed(1)}V`, result: `Output shifted positively`, explanation: "Entire waveform shifted up by DC offset." },
      ],
    },
  };
}

// ─── Negative Clamper ────────────────────────────────────────
export function generateNegativeClamper(p: Record<string, number | string>): CircuitSpec {
  const Vin = Number(p.Vin) || 10;
  const Vd = 0.7;
  const Vshift = -(Vin - Vd);
  const RL = Number(p.RL) || 100000;

  return {
    type: "Negative Clamper",
    topology: "negative_dc_restorer",
    parameters: { Vin_peak: Vin },
    components: [
      { id: "vs", type: "voltage_source", label: "Vin", value: String(Vin), unit: "Vp", x: 80, y: 230 },
      { id: "c1", type: "capacitor", label: "C", value: "10", unit: "μF", x: 220, y: 170 },
      { id: "d1", type: "diode", label: "D1", value: "1N4148", unit: "", x: 350, y: 250, rotation: 270 },
      { id: "rl", type: "resistor", label: "RL", value: formatResistance(RL), unit: formatResUnit(RL), x: 460, y: 280, rotation: 90 },
      { id: "gnd", type: "ground", label: "GND", value: "0", unit: "V", x: 300, y: 400 },
    ],
    nodes: [
      { id: "n_in", label: "Vin", x: 80, y: 170, voltage: Vin, type: "input" },
      { id: "n_out", label: "Vout", x: 460, y: 170, voltage: round(Vshift), type: "output" },
      { id: "n_mid", label: "C out", x: 350, y: 170, voltage: round(Vshift), type: "internal" },
      { id: "n_gnd", label: "GND", x: 300, y: 400, voltage: 0, type: "ground" },
    ],
    connections: [
      { from: "n_in", to: "c1", current: 0, path: [{ x: 80, y: 170 }, { x: 205, y: 170 }] },
      { from: "c1", to: "n_mid", current: 0, path: [{ x: 235, y: 170 }, { x: 350, y: 170 }] },
      { from: "n_mid", to: "n_out", current: 0, path: [{ x: 350, y: 170 }, { x: 460, y: 170 }] },
      { from: "n_gnd", to: "d1", current: 0, path: [{ x: 350, y: 400 }, { x: 350, y: 265 }] },
      { from: "d1", to: "n_mid", current: 0, path: [{ x: 350, y: 235 }, { x: 350, y: 170 }] },
      { from: "n_out", to: "rl", current: 0, path: [{ x: 460, y: 170 }, { x: 460, y: 255 }] },
      { from: "rl", to: "n_gnd", current: 0, path: [{ x: 460, y: 305 }, { x: 460, y: 400 }, { x: 300, y: 400 }] },
      { from: "vs", to: "n_in", current: 0, path: [{ x: 80, y: 218 }, { x: 80, y: 170 }] },
      { from: "vs", to: "n_gnd", current: 0, path: [{ x: 80, y: 242 }, { x: 80, y: 400 }, { x: 300, y: 400 }] },
    ],
    analysis: {
      dcOperatingPoint: [
        { node: "Vin_peak", voltage: Vin, unit: "V" },
        { node: "DC_shift", voltage: round(Vshift), unit: "V" },
        { node: "Vout_max", voltage: round(Vd), unit: "V" },
        { node: "Vout_min", voltage: round(-(2 * Vin - Vd)), unit: "V" },
      ],
      powerDissipation: 0,
      calculations: [
        { title: "DC Shift", formula: "Vshift = −(Vpeak − Vd)", substitution: `−(${Vin} − 0.7)`, result: `Vshift = ${Vshift.toFixed(1)} V`, explanation: "Capacitor charges to shift waveform negatively." },
        { title: "Output Range", formula: "Vout: −(2Vp−Vd) to Vd", substitution: `${(-(2*Vin-Vd)).toFixed(1)}V to 0.7V`, result: `Output shifted negatively`, explanation: "Entire waveform shifted down." },
      ],
    },
  };
}
