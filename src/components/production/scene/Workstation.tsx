import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface WorkstationProps {
  position: [number, number, number];
  size: [number, number];
  label: string;
  stationId: string;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  orderCount: number;
}

export function Workstation({ 
  position, 
  size, 
  label, 
  stationId, 
  isHovered, 
  onHover,
  orderCount 
}: WorkstationProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [intensity, setIntensity] = useState(0.5);
  
  const color = getStationColor(stationId);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Pulsing effect
    const pulse = Math.sin(time * 2) * 0.2 + 0.8;
    setIntensity(isHovered ? 1 : pulse * 0.5);
    
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(time * 3) * 0.02);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Base platform */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[size[0], 0.05, size[1]]} />
        <meshStandardMaterial 
          color={color}
          transparent
          opacity={0.3}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Glowing border */}
      <mesh 
        ref={glowRef}
        position={[0, 0.03, 0]}
        onPointerEnter={() => onHover(stationId)}
        onPointerLeave={() => onHover(null)}
      >
        <boxGeometry args={[size[0] + 0.1, 0.02, size[1] + 0.1]} />
        <meshBasicMaterial 
          color={color}
          transparent
          opacity={intensity}
        />
      </mesh>
      
      {/* Corner pillars */}
      {[
        [-size[0]/2 + 0.1, 0, -size[1]/2 + 0.1],
        [size[0]/2 - 0.1, 0, -size[1]/2 + 0.1],
        [-size[0]/2 + 0.1, 0, size[1]/2 - 0.1],
        [size[0]/2 - 0.1, 0, size[1]/2 - 0.1],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={intensity}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
      
      {/* Floating label using Html */}
      <Html
        position={[0, 0.8, 0]}
        center
        style={{
          pointerEvents: 'none',
        }}
      >
        <div
          className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider whitespace-nowrap"
          style={{
            background: 'rgba(10, 15, 26, 0.9)',
            border: `2px solid ${color}`,
            color: color,
            boxShadow: `0 0 20px ${color}40`,
          }}
        >
          {label}
          {orderCount > 0 && (
            <span
              className="ml-2 px-2 py-0.5 rounded-full text-[10px]"
              style={{
                backgroundColor: color,
                color: '#0a0f1a',
              }}
            >
              {orderCount}
            </span>
          )}
        </div>
      </Html>
      
      {/* Control panels on workstation */}
      {stationId !== "espera" && stationId !== "saida" && (
        <ControlPanel 
          position={[size[0]/2 - 0.3, 0.3, 0]} 
          color={color}
        />
      )}
      
      {/* Blinking indicators */}
      <BlinkingLight position={[-size[0]/2 + 0.2, 0.15, -size[1]/2 + 0.2]} color={color} />
      <BlinkingLight position={[size[0]/2 - 0.2, 0.15, -size[1]/2 + 0.2]} color={color} delay={0.5} />
    </group>
  );
}

function ControlPanel({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group ref={ref} position={position}>
      <mesh>
        <boxGeometry args={[0.3, 0.4, 0.05]} />
        <meshStandardMaterial 
          color="#1a1f2e"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Screen */}
      <mesh position={[0, 0.05, 0.03]}>
        <planeGeometry args={[0.25, 0.2]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
      
      {/* Blinking LEDs */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-0.08 + i * 0.08, -0.12, 0.03]}>
          <circleGeometry args={[0.02, 8]} />
          <meshBasicMaterial 
            color={i === 0 ? "#10b981" : i === 1 ? "#f59e0b" : "#ef4444"} 
          />
        </mesh>
      ))}
    </group>
  );
}

function BlinkingLight({ 
  position, 
  color, 
  delay = 0 
}: { 
  position: [number, number, number]; 
  color: string; 
  delay?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      const blink = Math.sin((state.clock.elapsedTime + delay) * 4) > 0.5 ? 1 : 0.2;
      (ref.current.material as THREE.MeshBasicMaterial).opacity = blink;
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial color={color} transparent />
    </mesh>
  );
}

function getStationColor(stationId: string): string {
  const colors: Record<string, string> = {
    projeto: "#22d3ee",
    fresadora: "#22d3ee",
    vazado: "#d946ef",
    espera: "#f59e0b",
    maquiagem: "#ec4899",
    pureto: "#8b5cf6",
    saida: "#10b981",
  };
  return colors[stationId] || "#22d3ee";
}
