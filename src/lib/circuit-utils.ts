// Shared utility functions for circuit generators

export function round(v: number, d = 2): number {
  return parseFloat(v.toFixed(d));
}

export const E24 = [1.0,1.1,1.2,1.3,1.5,1.6,1.8,2.0,2.2,2.4,2.7,3.0,3.3,3.6,3.9,4.3,4.7,5.1,5.6,6.2,6.8,7.5,8.2,9.1];

export function nearestStandard(value: number): number {
  if (value <= 0) return 100;
  const decade = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / decade;
  let best = E24[0];
  let bestDiff = Math.abs(normalized - best);
  for (const e of E24) {
    const diff = Math.abs(normalized - e);
    if (diff < bestDiff) { best = e; bestDiff = diff; }
  }
  const diff10 = Math.abs(normalized - 10);
  if (diff10 < bestDiff) return 10 * decade;
  return best * decade;
}

export function formatResistance(r: number): string {
  if (r >= 1e6) return (r / 1e6).toFixed(r % 1e6 === 0 ? 0 : 1);
  if (r >= 1e3) return (r / 1e3).toFixed(r % 1e3 === 0 ? 0 : 1);
  return r.toFixed(0);
}

export function formatResUnit(r: number): string {
  if (r >= 1e6) return "MΩ";
  if (r >= 1e3) return "kΩ";
  return "Ω";
}

export function formatCapacitance(c: number): string {
  if (c >= 1e-6) return (c * 1e6).toFixed(c * 1e6 >= 10 ? 0 : 1);
  if (c >= 1e-9) return (c * 1e9).toFixed(0);
  return (c * 1e12).toFixed(0);
}

export function formatCapUnit(c: number): string {
  if (c >= 1e-6) return "μF";
  if (c >= 1e-9) return "nF";
  return "pF";
}

export function formatFrequency(f: number): string {
  if (f >= 1e6) return `${(f / 1e6).toFixed(1)} MHz`;
  if (f >= 1e3) return `${(f / 1e3).toFixed(1)} kHz`;
  return `${f.toFixed(0)} Hz`;
}
