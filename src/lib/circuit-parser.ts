export type CircuitType =
  | "ce_amplifier"
  | "cc_amplifier"
  | "cb_amplifier"
  | "darlington_pair"
  | "single_tuned_amplifier"
  | "multistage_amplifier"
  | "voltage_divider"
  | "inverting_opamp"
  | "non_inverting_opamp"
  | "voltage_follower_opamp"
  | "summing_amplifier"
  | "integrator_opamp"
  | "differentiator_opamp"
  | "rc_low_pass"
  | "rc_high_pass"
  | "band_pass_filter"
  | "active_low_pass"
  | "active_high_pass"
  | "astable_multivibrator"
  | "monostable_555"
  | "wien_bridge_oscillator"
  | "hartley_oscillator"
  | "colpitts_oscillator"
  | "phase_shift_oscillator"
  | "crystal_oscillator"
  | "half_wave_rectifier"
  | "bridge_rectifier"
  | "series_clipper"
  | "positive_clamper"
  | "negative_clamper";

export interface ParsedIntent {
  circuitType: CircuitType;
  params: Record<string, number | string>;
}

interface PatternRule {
  type: CircuitType;
  patterns: RegExp[];
  paramExtractors: Record<string, RegExp>;
  defaults: Record<string, number | string>;
}

const rules: PatternRule[] = [
  // ── Diode circuits ──
  {
    type: "half_wave_rectifier",
    patterns: [/half[\s-]?wave\s*(rectifier)?/i],
    paramExtractors: {
      Vin: /(\d+\.?\d*)\s*v\s*(rms|ac|input|in)?/i,
      RL: /(\d+\.?\d*)\s*(k?Ω|kohm|ohm)?\s*(load)?/i,
    },
    defaults: { Vin: 12, RL: 1000 },
  },
  {
    type: "bridge_rectifier",
    patterns: [/bridge\s*rectifier/i, /full[\s-]?wave\s*(bridge|rectifier)/i],
    paramExtractors: {
      Vin: /(\d+\.?\d*)\s*v\s*(rms|ac|input|in)?/i,
      RL: /(\d+\.?\d*)\s*(k?Ω|kohm|ohm)?\s*(load)?/i,
    },
    defaults: { Vin: 12, RL: 1000 },
  },
  {
    type: "series_clipper",
    patterns: [/clipper/i, /clipping\s*circuit/i],
    paramExtractors: {
      Vin: /(\d+\.?\d*)\s*v\s*(peak|p|input|in)?/i,
      Vref: /(\d+\.?\d*)\s*v\s*(ref|reference|bias)/i,
    },
    defaults: { Vin: 10, Vref: 0 },
  },
  {
    type: "positive_clamper",
    patterns: [/positive\s*clamp(er|ing)/i],
    paramExtractors: {
      Vin: /(\d+\.?\d*)\s*v\s*(peak|p|input|in)?/i,
    },
    defaults: { Vin: 10 },
  },
  {
    type: "negative_clamper",
    patterns: [/negative\s*clamp(er|ing)/i, /clamp(er|ing)/i],
    paramExtractors: {
      Vin: /(\d+\.?\d*)\s*v\s*(peak|p|input|in)?/i,
    },
    defaults: { Vin: 10 },
  },
  // ── Op-amp extended ──
  {
    type: "voltage_follower_opamp",
    patterns: [/voltage\s*follower/i, /unity[\s-]?gain\s*buffer/i, /opamp\s*buffer/i],
    paramExtractors: {
      opamp: /(lm741|tl071|tl072|lm358|op07|ne5532)/i,
    },
    defaults: { opamp: "LM741" },
  },
  {
    type: "summing_amplifier",
    patterns: [/summing\s*(amp|amplifier)/i, /adder\s*circuit/i],
    paramExtractors: {
      gain: /gain\s*[-=:]?\s*-?(\d+\.?\d*)/i,
      inputs: /(\d+)\s*(input|channel)/i,
      opamp: /(lm741|tl071|tl072|lm358|op07|ne5532)/i,
    },
    defaults: { gain: 1, inputs: 3, opamp: "LM741" },
  },
  {
    type: "integrator_opamp",
    patterns: [/integrat(or|ing)\s*(circuit|opamp|op[\s-]?amp)?/i],
    paramExtractors: {
      fc: /(\d+\.?\d*)\s*(k?hz)/i,
      opamp: /(lm741|tl071|tl072|lm358|op07|ne5532)/i,
    },
    defaults: { fc: 1000, opamp: "LM741" },
  },
  {
    type: "differentiator_opamp",
    patterns: [/differentiat(or|ing)\s*(circuit|opamp|op[\s-]?amp)?/i],
    paramExtractors: {
      fc: /(\d+\.?\d*)\s*(k?hz)/i,
      opamp: /(lm741|tl071|tl072|lm358|op07|ne5532)/i,
    },
    defaults: { fc: 1000, opamp: "LM741" },
  },
  // ── Filters extended ──
  {
    type: "band_pass_filter",
    patterns: [/band[\s-]?pass\s*(filter)?/i, /bpf/i],
    paramExtractors: {
      fl: /(\d+\.?\d*)\s*(hz)\s*(low|lower)?/i,
      fh: /(\d+\.?\d*)\s*(k?hz)\s*(high|upper)?/i,
    },
    defaults: { fl: 500, fh: 5000 },
  },
  {
    type: "active_low_pass",
    patterns: [/active\s*low[\s-]?pass/i, /sallen[\s-]?key\s*low/i, /2nd\s*order\s*low[\s-]?pass/i, /second\s*order\s*low[\s-]?pass/i],
    paramExtractors: {
      fc: /(\d+\.?\d*)\s*(k?hz)/i,
      opamp: /(lm741|tl071|tl072|lm358|op07|ne5532)/i,
    },
    defaults: { fc: 1000, opamp: "LM741" },
  },
  {
    type: "active_high_pass",
    patterns: [/active\s*high[\s-]?pass/i, /sallen[\s-]?key\s*high/i, /2nd\s*order\s*high[\s-]?pass/i, /second\s*order\s*high[\s-]?pass/i],
    paramExtractors: {
      fc: /(\d+\.?\d*)\s*(k?hz)/i,
      opamp: /(lm741|tl071|tl072|lm358|op07|ne5532)/i,
    },
    defaults: { fc: 1000, opamp: "LM741" },
  },
  // ── Oscillators extended ──
  {
    type: "wien_bridge_oscillator",
    patterns: [/wien\s*(bridge)?\s*(oscillator)?/i],
    paramExtractors: {
      freq: /(\d+\.?\d*)\s*(k?hz)/i,
      opamp: /(lm741|tl071|tl072|lm358|op07|ne5532)/i,
    },
    defaults: { freq: 1000, opamp: "LM741" },
  },
  {
    type: "hartley_oscillator",
    patterns: [/hartley/i],
    paramExtractors: {
      freq: /(\d+\.?\d*)\s*(k?hz|mhz)/i,
      Vcc: /vcc\s*[-=:]?\s*(\d+\.?\d*)/i,
    },
    defaults: { freq: 100000, Vcc: 12 },
  },
  {
    type: "colpitts_oscillator",
    patterns: [/colpitts/i],
    paramExtractors: {
      freq: /(\d+\.?\d*)\s*(k?hz|mhz)/i,
      Vcc: /vcc\s*[-=:]?\s*(\d+\.?\d*)/i,
    },
    defaults: { freq: 100000, Vcc: 12 },
  },
  {
    type: "phase_shift_oscillator",
    patterns: [/phase[\s-]?shift\s*(oscillator)?/i, /rc\s*phase/i],
    paramExtractors: {
      freq: /(\d+\.?\d*)\s*(k?hz)/i,
      Vcc: /vcc\s*[-=:]?\s*(\d+\.?\d*)/i,
    },
    defaults: { freq: 1000, Vcc: 12 },
  },
  {
    type: "crystal_oscillator",
    patterns: [/crystal\s*(oscillator)?/i, /pierce\s*(oscillator)?/i, /xtal/i, /quartz/i],
    paramExtractors: {
      freq: /(\d+\.?\d*)\s*(k?hz|mhz)/i,
      Vcc: /vcc\s*[-=:]?\s*(\d+\.?\d*)/i,
    },
    defaults: { freq: 4000000, Vcc: 5 },
  },
  {
    type: "monostable_555",
    patterns: [/monostable/i, /one[\s-]?shot/i, /555\s*mono/i],
    paramExtractors: {
      pulseWidth: /(\d+\.?\d*)\s*(ms|s)/i,
    },
    defaults: { pulseWidth: 0.001 },
  },
  // ── Transistor extended ──
  {
    type: "single_tuned_amplifier",
    patterns: [/single\s*tuned/i, /tuned\s*amplifier/i, /lc\s*tuned/i, /resonant\s*amplifier/i],
    paramExtractors: {
      Vcc: /vcc\s*[-=:]?\s*(\d+\.?\d*)/i,
      freq: /(\d+\.?\d*)\s*(k?hz)/i,
    },
    defaults: { Vcc: 12, freq: 10000 },
  },
  {
    type: "multistage_amplifier",
    patterns: [/multi[\s-]?stage/i, /two[\s-]?stage/i, /cascad(e|ed)\s*(amplifier|ce)?/i, /2[\s-]?stage/i],
    paramExtractors: {
      Vcc: /vcc\s*[-=:]?\s*(\d+\.?\d*)/i,
      gain: /gain\s*[-=:]?\s*(\d+\.?\d*)/i,
    },
    defaults: { Vcc: 12, gain: 200 },
  },
  {
    type: "cb_amplifier",
    patterns: [/common\s*base/i, /cb\s*amplifier/i, /grounded[\s-]?base/i],
    paramExtractors: {
      Vcc: /vcc\s*[-=:]?\s*(\d+\.?\d*)/i,
      gain: /gain\s*[-=:]?\s*(\d+\.?\d*)/i,
    },
    defaults: { Vcc: 12, gain: 0 },
  },
  {
    type: "darlington_pair",
    patterns: [/darlington/i, /super[\s-]?beta/i],
    paramExtractors: {
      Vcc: /vcc\s*[-=:]?\s*(\d+\.?\d*)/i,
    },
    defaults: { Vcc: 12 },
  },
  // ── Original circuits (order matters — more specific first) ──
  {
    type: "voltage_divider",
    patterns: [/voltage\s*divider/i, /resistive\s*divider/i, /v[\s-]*divider/i],
    paramExtractors: {
      Vin: /(\d+\.?\d*)\s*v\s*(input|in|supply)/i,
      Vout: /(\d+\.?\d*)\s*v\s*(output|out)/i,
      Iload: /(\d+\.?\d*)\s*(m?a)\s*(load)?/i,
    },
    defaults: { Vin: 12, Vout: 5, Iload: 1 },
  },
  {
    type: "inverting_opamp",
    patterns: [/(^|[^\w-])inverting\s*(op[\s-]?amp|amplifier)/i, /(^|[^\w-])inv\s*opamp/i],
    paramExtractors: {
      gain: /gain\s*[-=:]?\s*-?(\d+\.?\d*)/i,
      opamp: /(lm741|tl071|tl072|lm358|op07|ne5532)/i,
    },
    defaults: { gain: 10, opamp: "LM741" },
  },
  {
    type: "non_inverting_opamp",
    patterns: [/non[\s-]?inverting\s*(op[\s-]?amp|amplifier)/i, /non[\s-]?inv\s*opamp/i],
    paramExtractors: {
      gain: /gain\s*[-=:]?\s*(\d+\.?\d*)/i,
      opamp: /(lm741|tl071|tl072|lm358|op07|ne5532)/i,
    },
    defaults: { gain: 11, opamp: "LM741" },
  },
  {
    type: "rc_low_pass",
    patterns: [/low[\s-]?pass\s*(filter|rc)?/i, /lpf/i],
    paramExtractors: {
      fc: /(\d+\.?\d*)\s*(k?hz)\s*/i,
    },
    defaults: { fc: 1000 },
  },
  {
    type: "rc_high_pass",
    patterns: [/high[\s-]?pass\s*(filter|rc)?/i, /hpf/i],
    paramExtractors: {
      fc: /(\d+\.?\d*)\s*(k?hz)\s*/i,
    },
    defaults: { fc: 1000 },
  },
  {
    type: "cc_amplifier",
    patterns: [
      /common\s*collector/i,
      /emitter\s*follower/i,
      /cc\s*amplifier/i,
      /buffer\s*(amplifier|stage)/i,
    ],
    paramExtractors: {
      Vcc: /vcc\s*[-=:]?\s*(\d+\.?\d*)/i,
    },
    defaults: { Vcc: 12 },
  },
  {
    type: "astable_multivibrator",
    patterns: [/astable/i, /multivibrator/i, /square\s*wave\s*(oscillator|generator)?/i, /555\s*timer/i],
    paramExtractors: {
      freq: /(\d+\.?\d*)\s*(k?hz)/i,
    },
    defaults: { freq: 1000 },
  },
  {
    type: "ce_amplifier",
    patterns: [
      /common\s*emitter/i,
      /ce\s*amplifier/i,
      /bjt\s*amplifier/i,
      /transistor\s*amplifier/i,
      /amplifier/i,
    ],
    paramExtractors: {
      gain: /gain\s*[-=:]?\s*(\d+\.?\d*)/i,
      Vcc: /vcc\s*[-=:]?\s*(\d+\.?\d*)/i,
      RL: /load\s*[-=:]?\s*(\d+\.?\d*)\s*(k?Ω|kohm|ohm)?/i,
    },
    defaults: { gain: 50, Vcc: 12, RL: 10000 },
  },
];

function extractFrequency(prompt: string): number | null {
  const match = prompt.match(/(\d+\.?\d*)\s*(khz|kHz|KHz)/i);
  if (match) return parseFloat(match[1]) * 1000;
  const matchHz = prompt.match(/(\d+\.?\d*)\s*hz/i);
  if (matchHz) return parseFloat(matchHz[1]);
  return null;
}

function extractPulseWidth(prompt: string): number | null {
  const matchMs = prompt.match(/(\d+\.?\d*)\s*ms/i);
  if (matchMs) return parseFloat(matchMs[1]) / 1000;
  const matchS = prompt.match(/(\d+\.?\d*)\s*s(?!e)/i);
  if (matchS) return parseFloat(matchS[1]);
  return null;
}

function extractLoadResistance(prompt: string): number | null {
  const loadFirst = prompt.match(/(?:load|rl)\s*[-=:]?\s*(\d+\.?\d*)\s*(k?Ω|kohm|ohm)?/i);
  const valueFirst = prompt.match(/(\d+\.?\d*)\s*(k?Ω|kohm|ohm)\s*(?:load|rl)?/i);
  const match = loadFirst || valueFirst;
  if (!match) return null;

  let value = parseFloat(match[1]);
  const unit = match[2] || "";
  if (/k/i.test(unit)) value *= 1000;
  return value;
}

export function parsePrompt(prompt: string): ParsedIntent {
  for (const rule of rules) {
    const matched = rule.patterns.some((p) => p.test(prompt));
    if (!matched) continue;

    const params: Record<string, number | string> = { ...rule.defaults };

    for (const [key, regex] of Object.entries(rule.paramExtractors)) {
      const m = prompt.match(regex);
      if (m) {
        if (key === "fc" || key === "freq") {
          const freq = extractFrequency(prompt);
          if (freq) params[key] = freq;
        } else if (key === "pulseWidth") {
          const pw = extractPulseWidth(prompt);
          if (pw) params[key] = pw;
        } else if (key === "opamp") {
          params[key] = m[1].toUpperCase();
        } else if (key === "RL") {
          const resistance = extractLoadResistance(prompt);
          if (resistance) params[key] = resistance;
        } else if (key === "Iload") {
          const val = parseFloat(m[1]);
          params[key] = val;
        } else if (key === "inputs") {
          params[key] = parseInt(m[1]);
        } else {
          params[key] = parseFloat(m[1]);
        }
      }
    }

    return { circuitType: rule.type, params };
  }

  // Fallback to CE amplifier
  return {
    circuitType: "ce_amplifier",
    params: { gain: 50, Vcc: 12, RL: 10000 },
  };
}
