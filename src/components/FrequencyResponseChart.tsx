import React from "react";
import { motion } from "framer-motion";
import { FrequencyResponsePoint } from "@/types/circuit";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Activity, TrendingDown } from "lucide-react";

interface FrequencyResponseChartProps {
  data: FrequencyResponsePoint[];
  cutoffFrequency?: number;
  bandwidth?: { low: number; high: number; unit: string };
  gainBandwidthProduct?: number;
  voltageGain?: number;
  rolloffRate?: number;
}

function formatFreq(hz: number): string {
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(1)}M`;
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(1)}k`;
  return `${hz.toFixed(0)}`;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as FrequencyResponsePoint;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs font-mono shadow-lg">
      <div className="text-muted-foreground">f = {formatFreq(d.frequency)} Hz</div>
      <div className="text-primary font-semibold">Gain: {d.gainDb.toFixed(1)} dB</div>
      <div className="text-info">Phase: {d.phaseDeg.toFixed(1)}°</div>
    </div>
  );
};

const FrequencyResponseChart: React.FC<FrequencyResponseChartProps> = ({
  data,
  cutoffFrequency,
  bandwidth,
  gainBandwidthProduct,
  voltageGain,
  rolloffRate,
}) => {
  const maxGain = Math.max(...data.map((d) => d.gainDb));
  const minGain = Math.min(...data.map((d) => d.gainDb));
  const gainAt3dB = maxGain - 3;

  // Format data with log-scale x
  const chartData = data.map((d) => ({
    ...d,
    logFreq: Math.log10(d.frequency),
  }));

  const ticks = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7].filter(
    (t) => t >= data[0]?.frequency && t <= data[data.length - 1]?.frequency
  );

  return (
    <div className="space-y-6">
      {/* Gain Magnitude Plot */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-border bg-card p-4 space-y-3"
      >
        <div className="flex items-center gap-2 text-sm font-mono font-semibold text-primary">
          <Activity className="w-4 h-4" />
          GAIN vs FREQUENCY (Bode Magnitude)
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="frequency"
                scale="log"
                domain={["dataMin", "dataMax"]}
                type="number"
                ticks={ticks}
                tickFormatter={(v) => formatFreq(v)}
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                fontFamily="monospace"
                label={{ value: "Frequency (Hz)", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                fontFamily="monospace"
                domain={[Math.floor(minGain / 10) * 10, Math.ceil(maxGain / 10) * 10 + 5]}
                label={{ value: "Gain (dB)", angle: -90, position: "insideLeft", offset: 10, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* -3dB reference line */}
              <ReferenceLine
                y={gainAt3dB}
                stroke="hsl(var(--warning))"
                strokeDasharray="5 5"
                strokeWidth={1}
                label={{ value: "-3dB", position: "right", fontSize: 9, fill: "hsl(var(--warning))" }}
              />
              {/* Cutoff frequency vertical line */}
              {cutoffFrequency && (
                <ReferenceLine
                  x={cutoffFrequency}
                  stroke="hsl(var(--warning))"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  label={{ value: `fc=${formatFreq(cutoffFrequency)}Hz`, position: "top", fontSize: 9, fill: "hsl(var(--warning))" }}
                />
              )}
              <Line
                type="monotone"
                dataKey="gainDb"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Phase Plot */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-border bg-card p-4 space-y-3"
      >
        <div className="flex items-center gap-2 text-sm font-mono font-semibold text-info">
          <TrendingDown className="w-4 h-4" />
          PHASE vs FREQUENCY (Bode Phase)
        </div>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="frequency"
                scale="log"
                domain={["dataMin", "dataMax"]}
                type="number"
                ticks={ticks}
                tickFormatter={(v) => formatFreq(v)}
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                fontFamily="monospace"
                label={{ value: "Frequency (Hz)", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                fontFamily="monospace"
                label={{ value: "Phase (°)", angle: -90, position: "insideLeft", offset: 10, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={-45} stroke="hsl(var(--warning))" strokeDasharray="5 5" strokeWidth={1} />
              <Line
                type="monotone"
                dataKey="phaseDeg"
                stroke="hsl(var(--info))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "hsl(var(--info))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Key Parameters Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-lg border border-border bg-card p-4 space-y-3"
      >
        <div className="text-sm font-mono font-semibold text-accent-foreground">
          FREQUENCY DOMAIN PARAMETERS
        </div>
        <div className="grid grid-cols-2 gap-2">
          {voltageGain !== undefined && (
            <ParamCard label="DC / Mid-band Gain" value={`${(20 * Math.log10(Math.abs(voltageGain))).toFixed(1)} dB (${Math.abs(voltageGain).toFixed(1)}×)`} />
          )}
          {cutoffFrequency && (
            <ParamCard label="Cutoff Frequency (fc)" value={`${formatFreq(cutoffFrequency)} Hz`} />
          )}
          {bandwidth && (
            <ParamCard label="Bandwidth" value={`${formatFreq(bandwidth.low)} – ${formatFreq(bandwidth.high)} ${bandwidth.unit}`} />
          )}
          {gainBandwidthProduct && (
            <ParamCard label="Gain-Bandwidth Product" value={`${formatFreq(gainBandwidthProduct)} Hz`} />
          )}
          {rolloffRate && (
            <ParamCard label="Roll-off Rate" value={`${rolloffRate} dB/decade`} />
          )}
          <ParamCard label="Peak Gain" value={`${maxGain.toFixed(1)} dB`} />
          <ParamCard label="-3dB Gain" value={`${gainAt3dB.toFixed(1)} dB`} />
        </div>
      </motion.div>
    </div>
  );
};

function ParamCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col px-3 py-2 rounded-md bg-secondary/50">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-mono font-semibold text-foreground">{value}</span>
    </div>
  );
}

export default FrequencyResponseChart;
