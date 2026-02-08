import React from "react";
import { motion } from "framer-motion";
import { Zap, Send, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { examplePrompts } from "@/lib/circuit-engine";

interface PromptEditorProps {
  onSubmit: (prompt: string) => void;
}

const PromptEditor: React.FC<PromptEditorProps> = ({ onSubmit }) => {
  const [prompt, setPrompt] = React.useState("");

  const handleSubmit = () => {
    if (prompt.trim()) onSubmit(prompt.trim());
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-4"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-mono">
          <Zap className="w-3 h-3" />
          AI-POWERED CIRCUIT SYNTHESIS
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          <span className="text-foreground">Prompt</span>
          <span className="text-primary text-glow">2</span>
          <span className="text-foreground">Circuit</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Describe your circuit in plain English. Get verified schematics, calculations, and analysis instantly.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative"
      >
        <div className="rounded-xl border border-border bg-card p-1 glow-primary">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Design a CE amplifier with gain 50, bandwidth 100Hz to 100kHz, Vcc 12V, load 10kΩ..."
            className="w-full min-h-[120px] bg-transparent text-foreground placeholder:text-muted-foreground p-4 rounded-lg resize-none focus:outline-none font-mono text-sm"
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <span className="text-xs text-muted-foreground font-mono">
              {prompt.length > 0 ? `${prompt.length} chars` : "Enter + Shift for newline"}
            </span>
            <Button
              variant="glow"
              size="lg"
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Synthesize Circuit
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="space-y-3"
      >
        <p className="text-xs text-muted-foreground font-mono text-center">EXAMPLE PROMPTS</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {examplePrompts.map((ex, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ex)}
              className="group flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-secondary/50 text-xs text-secondary-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="truncate max-w-[260px]">{ex}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default PromptEditor;
