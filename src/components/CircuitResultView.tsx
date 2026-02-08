import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircuitSpec } from "@/types/circuit";
import SchematicViewer from "@/components/SchematicViewer";
import AnalysisPanel from "@/components/AnalysisPanel";
import CurrentFlowPanel from "@/components/CurrentFlowPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, EyeOff, FileDown, Cpu, Activity, Calculator } from "lucide-react";

interface CircuitResultViewProps {
  circuit: CircuitSpec;
  prompt: string;
  onBack: () => void;
}

type ActiveTab = "schematic" | "analysis" | "flow";

const CircuitResultView: React.FC<CircuitResultViewProps> = ({ circuit, prompt, onBack }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("schematic");
  const [showFlow, setShowFlow] = useState(true);

  const tabs = [
    { id: "schematic" as const, label: "Schematic", icon: Cpu },
    { id: "flow" as const, label: "Current Flow", icon: Activity },
    { id: "analysis" as const, label: "Calculations", icon: Calculator },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{circuit.type}</h2>
              <p className="text-xs text-muted-foreground font-mono truncate max-w-md">{prompt}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="circuit"
              size="sm"
              onClick={() => setShowFlow(!showFlow)}
              className="gap-1"
            >
              {showFlow ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showFlow ? "Hide" : "Show"} Flow
            </Button>
            <Button variant="glow" size="sm" className="gap-1">
              <FileDown className="w-3 h-3" />
              Export
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-mono border-b-2 transition-all ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 container mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {activeTab === "schematic" && (
            <motion.div
              key="schematic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2 h-[500px]">
                <SchematicViewer circuit={circuit} showFlow={showFlow} />
              </div>
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="text-xs font-mono font-semibold text-primary mb-3">COMPONENTS</h3>
                  <div className="space-y-1">
                    {circuit.components
                      .filter((c) => c.type !== "ground")
                      .map((comp) => (
                        <div key={comp.id} className="flex items-center justify-between py-1 text-xs">
                          <span className="font-mono text-foreground">{comp.label}</span>
                          <span className="font-mono text-muted-foreground">
                            {comp.value} {comp.unit}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                <CurrentFlowPanel circuit={circuit} />
              </div>
            </motion.div>
          )}

          {activeTab === "flow" && (
            <motion.div
              key="flow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <div className="h-[500px]">
                <SchematicViewer circuit={circuit} showFlow={true} />
              </div>
              <div className="space-y-4">
                <CurrentFlowPanel circuit={circuit} />
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <h3 className="text-xs font-mono font-semibold text-warning">VOLTAGE DIVISION</h3>
                  {circuit.nodes
                    .filter((n) => n.type === "internal" || n.type === "supply")
                    .map((node) => (
                      <div key={node.id} className="flex items-center justify-between py-1">
                        <span className="text-xs font-mono text-muted-foreground">{node.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-warning rounded-full"
                              style={{ width: `${(node.voltage / 12) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-warning">{node.voltage}V</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "analysis" && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto"
            >
              <AnalysisPanel analysis={circuit.analysis} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CircuitResultView;
