import React from "react";
import { motion } from "framer-motion";
import { CircuitSpec } from "@/types/circuit";
import { Activity } from "lucide-react";

interface CurrentFlowPanelProps {
  circuit: CircuitSpec;
}

const CurrentFlowPanel: React.FC<CurrentFlowPanelProps> = ({ circuit }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-lg border border-border bg-card p-4 space-y-4"
    >
      <div className="flex items-center gap-2 text-sm font-mono font-semibold text-accent">
        <Activity className="w-4 h-4" />
        CURRENT FLOW ANALYSIS
      </div>

      {/* Current paths */}
      <div className="space-y-3">
        {circuit.connections
          .filter((c) => c.current > 0)
          .map((conn, i) => {
            const fromNode = circuit.nodes.find((n) => n.id === conn.from);
            const toNode = circuit.nodes.find((n) => n.id === conn.to);
            if (!fromNode || !toNode) return null;

            const voltageDrop = Math.abs(fromNode.voltage - toNode.voltage);

            return (
              <div
                key={i}
                className="rounded-md bg-secondary/50 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
                    <span className="text-xs font-mono text-foreground">
                      {fromNode.label} → {toNode.label}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-accent">
                    {conn.current.toFixed(2)} mA
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">V drop: </span>
                    <span className="font-mono text-warning">{voltageDrop.toFixed(2)} V</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Power: </span>
                    <span className="font-mono text-destructive">
                      {(voltageDrop * conn.current).toFixed(2)} mW
                    </span>
                  </div>
                </div>
                {/* Flow bar */}
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((conn.current / 2) * 100, 100)}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                  />
                </div>
              </div>
            );
          })}
      </div>

      {/* Voltage Map */}
      <div className="space-y-2">
        <p className="text-xs font-mono text-muted-foreground">VOLTAGE MAP</p>
        <div className="flex items-end gap-1 h-24">
          {circuit.nodes
            .filter((n) => n.type !== "ground")
            .sort((a, b) => b.voltage - a.voltage)
            .map((node, i) => {
              const maxV = Math.max(...circuit.nodes.map((n) => n.voltage));
              const height = maxV > 0 ? (node.voltage / maxV) * 100 : 0;
              return (
                <motion.div
                  key={node.id}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, 5)}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  className="flex-1 rounded-t-sm bg-warning/60 relative group cursor-help"
                >
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-warning whitespace-nowrap">
                    {node.voltage}V
                  </div>
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-muted-foreground whitespace-nowrap">
                    {node.label}
                  </div>
                </motion.div>
              );
            })}
        </div>
      </div>
    </motion.div>
  );
};

export default CurrentFlowPanel;
