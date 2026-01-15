import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Html, Float } from "@react-three/drei";
import * as THREE from "three";

interface Order {
  id: string;
  order_number: string;
  patient_name: string;
  status: string;
}

interface DataChipProps {
  position: [number, number, number];
  order: Order;
  isSelected: boolean;
  onClick: () => void;
  color: string;
}

export function DataChip({ 
  position, 
  order, 
  isSelected, 
  onClick, 
  color 
}: DataChipProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  const scale = isSelected ? 1.3 : hovered ? 1.15 : 1;

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (groupRef.current) {
      // Floating animation
      groupRef.current.position.y = position[1] + Math.sin(time * 3 + position[0]) * 0.03;
      
      // Rotation when selected
      if (isSelected) {
        groupRef.current.rotation.y = time * 0.5;
      } else {
        groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.1;
      }
    }
  });

  return (
    <group 
      ref={groupRef} 
      position={position}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Main chip body */}
      <mesh castShadow>
        <boxGeometry args={[0.4, 0.08, 0.25]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.5 : 0.2}
          metalness={0.7}
          roughness={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Circuit lines on chip */}
      <mesh position={[0, 0.045, 0]}>
        <planeGeometry args={[0.35, 0.2]} />
        <meshBasicMaterial color="#0a0f1a" transparent opacity={0.5} />
      </mesh>
      
      {/* Chip connectors (pins) */}
      {[-0.15, -0.05, 0.05, 0.15].map((x, i) => (
        <mesh key={i} position={[x, -0.05, 0.15]}>
          <boxGeometry args={[0.03, 0.02, 0.05]} />
          <meshStandardMaterial 
            color="#f59e0b"
            emissive="#f59e0b"
            emissiveIntensity={0.3}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      ))}
      {[-0.15, -0.05, 0.05, 0.15].map((x, i) => (
        <mesh key={`b${i}`} position={[x, -0.05, -0.15]}>
          <boxGeometry args={[0.03, 0.02, 0.05]} />
          <meshStandardMaterial 
            color="#f59e0b"
            emissive="#f59e0b"
            emissiveIntensity={0.3}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      ))}
      
      {/* Status LED */}
      <mesh position={[0.15, 0.05, 0]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color="#10b981" />
      </mesh>
      
      {/* Pulse ring when selected */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <ringGeometry args={[0.25, 0.3, 16]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={0.5}
          />
        </mesh>
      )}
      
      {/* Hover/Selected info panel */}
      {(hovered || isSelected) && (
        <Html position={[0, 0.4, 0]} center>
          <div 
            className="px-3 py-2 rounded-lg text-xs min-w-[150px] pointer-events-none"
            style={{
              background: 'rgba(10, 15, 26, 0.95)',
              border: `2px solid ${color}`,
              color: '#e2e8f0',
              boxShadow: `0 0 30px ${color}60`,
            }}
          >
            <div 
              className="font-bold text-sm mb-1"
              style={{ color }}
            >
              OS: {order.order_number}
            </div>
            <div className="text-cyan-100/80">{order.patient_name}</div>
            <div 
              className="text-[10px] mt-1 px-2 py-0.5 rounded inline-block"
              style={{ 
                background: `${color}30`,
                color 
              }}
            >
              {getStatusLabel(order.status)}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pendente",
    "in-progress": "Em Andamento",
    projetando: "Projetando",
    projetado: "Projetado",
    fresado: "Fresado",
    "fresado-definitivo": "Fresado Definitivo",
    "fresado-provisorio": "Fresado Provisório",
    maquiagem: "Maquiagem",
    vazado: "Vazado",
    pureto: "Pureto",
    completed: "Concluído",
    "entregue-provisorio": "Entregue Provisório",
  };
  return labels[status] || status;
}
