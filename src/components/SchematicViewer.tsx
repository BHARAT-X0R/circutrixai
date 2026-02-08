import React from "react";
import { CircuitSpec } from "@/types/circuit";

interface SchematicViewerProps {
  circuit: CircuitSpec;
  showFlow: boolean;
}

const componentColors: Record<string, string> = {
  resistor: "hsl(185, 80%, 50%)",
  capacitor: "hsl(160, 70%, 45%)",
  transistor: "hsl(40, 90%, 55%)",
  voltage_source: "hsl(0, 72%, 55%)",
  ground: "hsl(215, 15%, 50%)",
  opamp: "hsl(210, 80%, 60%)",
  diode: "hsl(280, 60%, 55%)",
  inductor: "hsl(30, 80%, 50%)",
};

const SchematicViewer: React.FC<SchematicViewerProps> = ({ circuit, showFlow }) => {
  return (
    <div className="w-full h-full bg-card rounded-lg border border-border overflow-hidden relative">
      <div className="absolute inset-0 blueprint-grid opacity-50" />
      <svg viewBox="0 0 650 460" className="w-full h-full relative z-10">
        {/* Connections */}
        {circuit.connections.map((conn, i) => (
          <g key={`conn-${i}`}>
            <polyline
              points={conn.path.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="hsl(185, 80%, 50%)"
              strokeWidth="2"
              opacity={0.4}
            />
            {showFlow && conn.current > 0 && (
              <polyline
                points={conn.path.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="hsl(160, 70%, 45%)"
                strokeWidth="2.5"
                className="animate-trace"
              />
            )}
          </g>
        ))}

        {/* Components */}
        {circuit.components.map((comp) => {
          const color = componentColors[comp.type] || "hsl(185, 80%, 50%)";
          return (
            <g key={comp.id}>
              {comp.type === "resistor" && (
                <g transform={`translate(${comp.x - 15}, ${comp.y - 8})`}>
                  <rect width="30" height="16" rx="2" fill="none" stroke={color} strokeWidth="1.5" />
                  <line x1="-10" y1="8" x2="0" y2="8" stroke={color} strokeWidth="1.5" />
                  <line x1="30" y1="8" x2="40" y2="8" stroke={color} strokeWidth="1.5" />
                </g>
              )}
              {comp.type === "capacitor" && (
                <g transform={`translate(${comp.x}, ${comp.y})`}>
                  <line x1="-3" y1="-10" x2="-3" y2="10" stroke={color} strokeWidth="2" />
                  <line x1="3" y1="-10" x2="3" y2="10" stroke={color} strokeWidth="2" />
                  <line x1="-3" y1="0" x2="-15" y2="0" stroke={color} strokeWidth="1.5" />
                  <line x1="3" y1="0" x2="15" y2="0" stroke={color} strokeWidth="1.5" />
                </g>
              )}
              {comp.type === "transistor" && (
                <g transform={`translate(${comp.x}, ${comp.y})`}>
                  <circle r="18" fill="none" stroke={color} strokeWidth="1.5" />
                  <line x1="-8" y1="-10" x2="-8" y2="10" stroke={color} strokeWidth="2" />
                  <line x1="-8" y1="-6" x2="8" y2="-14" stroke={color} strokeWidth="1.5" />
                  <line x1="-8" y1="6" x2="8" y2="14" stroke={color} strokeWidth="1.5" />
                  <polygon points="4,12 8,14 4,16" fill={color} />
                  <text x="-30" y="5" fontSize="9" fill={color} fontFamily="monospace">B</text>
                  <text x="12" y="-10" fontSize="9" fill={color} fontFamily="monospace">C</text>
                  <text x="12" y="18" fontSize="9" fill={color} fontFamily="monospace">E</text>
                </g>
              )}
              {comp.type === "voltage_source" && (
                <g transform={`translate(${comp.x}, ${comp.y})`}>
                  <circle r="12" fill="none" stroke={color} strokeWidth="1.5" />
                  <text x="-4" y="-2" fontSize="10" fill={color} fontFamily="monospace">+</text>
                  <text x="-3" y="9" fontSize="10" fill={color} fontFamily="monospace">−</text>
                </g>
              )}
              {comp.type === "ground" && (
                <g transform={`translate(${comp.x}, ${comp.y})`}>
                  <line x1="0" y1="-8" x2="0" y2="0" stroke={color} strokeWidth="1.5" />
                  <line x1="-12" y1="0" x2="12" y2="0" stroke={color} strokeWidth="1.5" />
                  <line x1="-8" y1="4" x2="8" y2="4" stroke={color} strokeWidth="1.5" />
                  <line x1="-4" y1="8" x2="4" y2="8" stroke={color} strokeWidth="1.5" />
                </g>
              )}
              {comp.type === "opamp" && (
                <g transform={`translate(${comp.x}, ${comp.y})`}>
                  <polygon points="-20,-25 -20,25 25,0" fill="none" stroke={color} strokeWidth="1.5" />
                  <text x="-14" y="-8" fontSize="10" fill={color} fontFamily="monospace">−</text>
                  <text x="-14" y="12" fontSize="10" fill={color} fontFamily="monospace">+</text>
                </g>
              )}
              {comp.type === "inductor" && (
                <g transform={`translate(${comp.x}, ${comp.y})`}>
                  <path d="M-15,0 C-12,-8 -6,-8 -3,0 C0,-8 6,-8 9,0 C12,-8 18,-8 21,0" fill="none" stroke={color} strokeWidth="1.5" />
                  <line x1="-15" y1="0" x2="-25" y2="0" stroke={color} strokeWidth="1.5" />
                  <line x1="21" y1="0" x2="31" y2="0" stroke={color} strokeWidth="1.5" />
                </g>
              )}
              {comp.type === "diode" && (
                <g transform={`translate(${comp.x}, ${comp.y})`}>
                  <polygon points="-6,-8 -6,8 6,0" fill="none" stroke={color} strokeWidth="1.5" />
                  <line x1="6" y1="-8" x2="6" y2="8" stroke={color} strokeWidth="1.5" />
                  <line x1="-6" y1="0" x2="-15" y2="0" stroke={color} strokeWidth="1.5" />
                  <line x1="6" y1="0" x2="15" y2="0" stroke={color} strokeWidth="1.5" />
                </g>
              )}
              {/* Label */}
              <text
                x={comp.x}
                y={comp.y - 22}
                textAnchor="middle"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="600"
                fill="hsl(200, 20%, 90%)"
              >
                {comp.label}
              </text>
              <text
                x={comp.x}
                y={comp.y + 30}
                textAnchor="middle"
                fontSize="9"
                fontFamily="monospace"
                fill="hsl(215, 15%, 50%)"
              >
                {comp.value} {comp.unit}
              </text>
            </g>
          );
        })}

        {/* Voltage nodes */}
        {showFlow &&
          circuit.nodes.map((node) => (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r="4" fill="hsl(40, 90%, 55%)" className="animate-pulse-glow" />
              <rect
                x={node.x + 8}
                y={node.y - 12}
                width={`${(node.voltage.toString().length + 2) * 7}`.toString()}
                height="16"
                rx="3"
                fill="hsl(220, 22%, 10%)"
                stroke="hsl(40, 90%, 55%)"
                strokeWidth="0.5"
                opacity="0.9"
              />
              <text
                x={node.x + 12}
                y={node.y}
                fontSize="9"
                fontFamily="monospace"
                fontWeight="600"
                fill="hsl(40, 90%, 55%)"
              >
                {node.voltage}V
              </text>
            </g>
          ))}
      </svg>
    </div>
  );
};

export default SchematicViewer;
