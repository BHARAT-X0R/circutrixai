export type CircuitType =
  | "ce_amplifier"
  | "cc_amplifier"
  | "voltage_divider"
  | "inverting_opamp"
  | "non_inverting_opamp"
  | "rc_low_pass"
  | "rc_high_pass"
  | "astable_multivibrator";

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
    patterns: [/inverting\s*(op[\s-]?amp|amplifier)/i, /inv\s*opamp/i],
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
        } else if (key === "opamp") {
          params[key] = m[1].toUpperCase();
        } else if (key === "RL") {
          let val = parseFloat(m[1]);
          if (m[2] && /k/i.test(m[2])) val *= 1000;
          params[key] = val;
        } else if (key === "Iload") {
          let val = parseFloat(m[1]);
          if (m[2] && /ma/i.test(m[2])) val = val; // already mA
          params[key] = val;
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
