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
  "Create a high-pass filter, fc = 500Hz",
  "Non-inverting op-amp amplifier with gain 20",
];
