import React from "react";
import { motion } from "framer-motion";
import { CircuitAnalysis } from "@/types/circuit";
import { Calculator, Zap, Activity, Gauge } from "lucide-react";

interface AnalysisPanelProps {
  analysis: CircuitAnalysis;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis }) => {
  return (
    <div className="space-y-6">
      {/* DC Operating Point */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="rounded-lg border border-border bg-card p-4 space-y-3"
      >
        <div className="flex items-center gap-2 text-sm font-mono font-semibold text-primary">
          <Zap className="w-4 h-4" />
          DC OPERATING POINT
        </div>
        <div className="grid grid-cols-2 gap-2">
          {analysis.dcOperatingPoint.map((point, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 rounded-md bg-secondary/50">
              <span className="text-xs font-mono text-muted-foreground">{point.node}</span>
              <span className="text-sm font-mono font-semibold text-warning">
                {point.voltage} {point.unit}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Key Parameters */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-border bg-card p-4 space-y-3"
      >
        <div className="flex items-center gap-2 text-sm font-mono font-semibold text-accent">
          <Gauge className="w-4 h-4" />
          KEY PARAMETERS
        </div>
        <div className="space-y-2">
          {analysis.voltageGain && (
            <ParamRow label="Voltage Gain (Av)" value={`${analysis.voltageGain}`} unit="" />
          )}
          {analysis.inputImpedance && (
            <ParamRow label="Input Impedance" value={`${analysis.inputImpedance}`} unit="Ω" />
          )}
          {analysis.outputImpedance && (
            <ParamRow label="Output Impedance" value={`${analysis.outputImpedance}`} unit="Ω" />
          )}
          {analysis.bandwidth && (
            <ParamRow
              label="Bandwidth"
              value={`${analysis.bandwidth.low} – ${analysis.bandwidth.high >= 1000 ? `${analysis.bandwidth.high / 1000}k` : analysis.bandwidth.high}`}
              unit={analysis.bandwidth.unit}
            />
          )}
          <ParamRow label="Power Dissipation" value={`${analysis.powerDissipation}`} unit="W" />
        </div>
      </motion.div>

      {/* Calculations */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-lg border border-border bg-card p-4 space-y-3"
      >
        <div className="flex items-center gap-2 text-sm font-mono font-semibold text-info">
          <Calculator className="w-4 h-4" />
          DESIGN CALCULATIONS
        </div>
        <div className="space-y-4">
          {analysis.calculations.map((calc, i) => (
            <div key={i} className="border-l-2 border-primary/30 pl-3 space-y-1">
              <p className="text-sm font-semibold text-foreground">{calc.title}</p>
              <p className="font-mono text-xs text-primary">{calc.formula}</p>
              <p className="font-mono text-xs text-muted-foreground">{calc.substitution}</p>
              <p className="font-mono text-xs font-bold text-warning">{calc.result}</p>
              <p className="text-xs text-muted-foreground">{calc.explanation}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

function ParamRow({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-md bg-secondary/50">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-mono font-semibold text-foreground">
        {value} {unit}
      </span>
    </div>
  );
}

export default AnalysisPanel;
