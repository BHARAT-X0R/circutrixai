import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PromptEditor from "@/components/PromptEditor";
import CircuitResultView from "@/components/CircuitResultView";
import { synthesizeCircuit } from "@/lib/circuit-engine";
import { CircuitSpec } from "@/types/circuit";
const Index = () => {
  const [circuit, setCircuit] = useState<CircuitSpec | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const handleSubmit = (text: string) => {
    setPrompt(text);
    setIsProcessing(true);

    // Simulate processing delay
    setTimeout(() => {
      setCircuit(synthesizeCircuit(text));
      setIsProcessing(false);
    }, 1500);
  };
  const handleBack = () => {
    setCircuit(null);
    setPrompt("");
  };
  return <div className="min-h-screen bg-background blueprint-grid-lg">
      <AnimatePresence mode="wait">
        {!circuit && !isProcessing ? <motion.div key="prompt" initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="min-h-screen flex items-center justify-center px-4 bg-slate-400">
            <PromptEditor onSubmit={handleSubmit} />
          </motion.div> : isProcessing ? <motion.div key="processing" initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
              <p className="text-sm font-mono text-primary animate-pulse">
                Synthesizing circuit...
              </p>
              <p className="text-xs font-mono text-muted-foreground max-w-xs">
                Parsing intent → Selecting template → Computing values → Validating
              </p>
            </div>
          </motion.div> : <motion.div key="result" initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }}>
            <CircuitResultView circuit={circuit!} prompt={prompt} onBack={handleBack} />
          </motion.div>}
      </AnimatePresence>
    </div>;
};
export default Index;