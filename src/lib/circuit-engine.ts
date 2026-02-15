import { CircuitSpec } from "@/types/circuit";
import { parsePrompt } from "@/lib/circuit-parser";
import { generateCircuit } from "@/lib/circuit-generators";

export function synthesizeCircuit(prompt: string): CircuitSpec {
  const intent = parsePrompt(prompt);
  return generateCircuit(intent);
}

export const examplePrompts = [
  "Design a CE amplifier with gain 50, Vcc 12V, load 10kΩ",
  "Build an inverting op-amp with gain -10, using LM741",
  "Create a low-pass filter with cutoff 1kHz",
  "Design a voltage divider: 12V input, 5V output, 1mA load",
  "Build an astable multivibrator with 1kHz square wave",
  "Design an emitter follower buffer with Vcc 12V",
  "Half-wave rectifier with 12V AC input",
  "Bridge rectifier with 24V AC, 1kΩ load",
  "Design a clipper circuit with 10V input",
  "Positive clamper with 5V peak input",
  "Summing amplifier with 3 inputs, gain 1",
  "Op-amp integrator with fc = 1kHz",
  "Op-amp differentiator, fc 500Hz",
  "Voltage follower buffer using TL072",
  "Band-pass filter, 500Hz to 5kHz",
  "Active low-pass filter, cutoff 2kHz",
  "Active high-pass filter, 1kHz cutoff",
  "Wien bridge oscillator at 1kHz",
  "Monostable 555 timer, 10ms pulse",
  "Common base amplifier, Vcc 12V",
  "Darlington pair driver, Vcc 12V",
  "Single tuned amplifier at 10kHz",
  "Two-stage cascaded CE amplifier with gain 200",
  "Non-inverting op-amp amplifier with gain 20",
  "High-pass filter, fc = 500Hz",
];
