import { FrequencyResponsePoint } from "@/types/circuit";

/**
 * Generate frequency response data points for various circuit topologies.
 * All calculations are deterministic — no random values.
 */

// Log-spaced frequency points from startHz to endHz
function logSpace(startHz: number, endHz: number, numPoints: number): number[] {
  const logStart = Math.log10(startHz);
  const logEnd = Math.log10(endHz);
  const step = (logEnd - logStart) / (numPoints - 1);
  return Array.from({ length: numPoints }, (_, i) => Math.pow(10, logStart + i * step));
}

/** Single-pole low-pass: H(f) = Av / (1 + j·f/fc) */
export function generateLowPassResponse(
  dcGainDb: number,
  cutoffHz: number,
  startHz = 1,
  endHz = 1e7,
  numPoints = 80
): FrequencyResponsePoint[] {
  const freqs = logSpace(startHz, endHz, numPoints);
  return freqs.map((f) => {
    const ratio = f / cutoffHz;
    const gainDb = dcGainDb - 10 * Math.log10(1 + ratio * ratio);
    const phaseDeg = -Math.atan(ratio) * (180 / Math.PI);
    return { frequency: f, gainDb: Math.round(gainDb * 100) / 100, phaseDeg: Math.round(phaseDeg * 10) / 10 };
  });
}

/** Single-pole high-pass: H(f) = Av · (jf/fc) / (1 + jf/fc) */
export function generateHighPassResponse(
  passbandGainDb: number,
  cutoffHz: number,
  startHz = 1,
  endHz = 1e7,
  numPoints = 80
): FrequencyResponsePoint[] {
  const freqs = logSpace(startHz, endHz, numPoints);
  return freqs.map((f) => {
    const ratio = f / cutoffHz;
    const gainDb = passbandGainDb + 10 * Math.log10((ratio * ratio) / (1 + ratio * ratio));
    const phaseDeg = 90 - Math.atan(ratio) * (180 / Math.PI);
    return { frequency: f, gainDb: Math.round(gainDb * 100) / 100, phaseDeg: Math.round(phaseDeg * 10) / 10 };
  });
}

/** Band-pass: product of HP and LP responses */
export function generateBandPassResponse(
  passbandGainDb: number,
  lowCutoff: number,
  highCutoff: number,
  startHz = 1,
  endHz = 1e7,
  numPoints = 80
): FrequencyResponsePoint[] {
  const freqs = logSpace(startHz, endHz, numPoints);
  return freqs.map((f) => {
    const ratioL = f / lowCutoff;
    const ratioH = f / highCutoff;
    const hpGain = (ratioL * ratioL) / (1 + ratioL * ratioL);
    const lpGain = 1 / (1 + ratioH * ratioH);
    const gainDb = passbandGainDb + 10 * Math.log10(hpGain * lpGain);
    const phaseHP = 90 - Math.atan(ratioL) * (180 / Math.PI);
    const phaseLP = -Math.atan(ratioH) * (180 / Math.PI);
    return { frequency: f, gainDb: Math.round(gainDb * 100) / 100, phaseDeg: Math.round((phaseHP + phaseLP) * 10) / 10 };
  });
}

/** CE/CB amplifier: band-pass between fL and fH with mid-band gain */
export function generateAmplifierResponse(
  midBandGainDb: number,
  fLow: number,
  fHigh: number,
  startHz = 1,
  endHz = 1e7,
  numPoints = 80
): FrequencyResponsePoint[] {
  return generateBandPassResponse(midBandGainDb, fLow, fHigh, startHz, endHz, numPoints);
}

/** Op-amp with GBP: single-pole roll-off from dc gain */
export function generateOpAmpResponse(
  dcGainLinear: number,
  gbp: number = 1e6,
  startHz = 1,
  endHz = 1e7,
  numPoints = 80
): FrequencyResponsePoint[] {
  const dcGainDb = 20 * Math.log10(Math.abs(dcGainLinear));
  const cutoffHz = gbp / Math.abs(dcGainLinear);
  return generateLowPassResponse(dcGainDb, cutoffHz, startHz, endHz, numPoints);
}

/** Second-order Sallen-Key response */
export function generateSecondOrderLPResponse(
  dcGainDb: number,
  cutoffHz: number,
  Q: number = 0.707,
  startHz = 1,
  endHz = 1e7,
  numPoints = 80
): FrequencyResponsePoint[] {
  const freqs = logSpace(startHz, endHz, numPoints);
  return freqs.map((f) => {
    const u = f / cutoffHz;
    const denom = Math.sqrt(Math.pow(1 - u * u, 2) + Math.pow(u / Q, 2));
    const gainDb = dcGainDb - 20 * Math.log10(denom);
    const phaseDeg = -Math.atan2(u / Q, 1 - u * u) * (180 / Math.PI);
    return { frequency: f, gainDb: Math.round(gainDb * 100) / 100, phaseDeg: Math.round(phaseDeg * 10) / 10 };
  });
}
