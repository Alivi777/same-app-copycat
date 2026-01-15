import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function NeonWalls() {
  const groupRef = useRef<THREE.Group>(null);
  
  // Wall configuration based on the floor plan
  const walls = [
    // Outer walls
    { start: [-10, 0, -6], end: [10, 0, -6], color: "#22d3ee" },
    { start: [10, 0, -6], end: [10, 0, 6], color: "#d946ef" },
    { start: [10, 0, 6], end: [-10, 0, 6], color: "#10b981" },
    { start: [-10, 0, 6], end: [-10, 0, -6], color: "#f59e0b" },
    
    // Interior divisions
    { start: [-6, 0, -6], end: [-6, 0, 0], color: "#22d3ee" },
    { start: [4, 0, -6], end: [4, 0, -2], color: "#d946ef" },
    { start: [-6, 0, 2], end: [0, 0, 2], color: "#ec4899" },
    { start: [0, 0, 2], end: [0, 0, 6], color: "#8b5cf6" },
  ];

  useFrame((state) => {
    // Optional: animate walls
  });

  return (
    <group ref={groupRef}>
      {walls.map((wall, index) => (
        <NeonLine 
          key={index}
          start={wall.start as [number, number, number]}
          end={wall.end as [number, number, number]}
          color={wall.color}
        />
      ))}
      
      {/* Corner accents */}
      {[
        { pos: [-10, 0, -6], color: "#22d3ee" },
        { pos: [10, 0, -6], color: "#d946ef" },
        { pos: [10, 0, 6], color: "#10b981" },
        { pos: [-10, 0, 6], color: "#f59e0b" },
      ].map((corner, i) => (
        <CornerAccent key={i} position={corner.pos as [number, number, number]} color={corner.color} />
      ))}
    </group>
  );
}

function NeonLine({ 
  start, 
  end, 
  color 
}: { 
  start: [number, number, number]; 
  end: [number, number, number]; 
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  
  // Calculate position and rotation for the wall
  const midX = (start[0] + end[0]) / 2;
  const midZ = (start[2] + end[2]) / 2;
  const length = Math.sqrt(
    Math.pow(end[0] - start[0], 2) + Math.pow(end[2] - start[2], 2)
  );
  const angle = Math.atan2(end[2] - start[2], end[0] - start[0]);

  useFrame((state) => {
    if (ref.current) {
      const material = ref.current.material as THREE.MeshBasicMaterial;
      const pulse = Math.sin(state.clock.elapsedTime * 2 + midX + midZ) * 0.3 + 0.7;
      material.opacity = pulse * 0.6;
    }
  });

  return (
    <group position={[midX, 0.5, midZ]} rotation={[0, -angle, 0]}>
      {/* Wall base */}
      <mesh ref={ref}>
        <boxGeometry args={[length, 1, 0.05]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
      
      {/* Neon tube at top */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[length, 0.05, 0.02]} />
        <meshBasicMaterial color={color} />
      </mesh>
      
      {/* Neon tube at bottom */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[length, 0.05, 0.02]} />
        <meshBasicMaterial color={color} />
      </mesh>
      
      {/* Glow effect */}
      <pointLight 
        position={[0, 0, 0.5]} 
        color={color} 
        intensity={0.5} 
        distance={3} 
      />
    </group>
  );
}

function CornerAccent({ 
  position, 
  color 
}: { 
  position: [number, number, number]; 
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.5;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      ref.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position}>
      {/* Corner pillar */}
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 1.5, 8]} />
        <meshStandardMaterial 
          color="#1a1f2e"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Glowing ring */}
      <mesh ref={ref} position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.03, 8, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      
      {/* Light */}
      <pointLight position={[0, 1.5, 0]} color={color} intensity={1} distance={5} />
    </group>
  );
}
