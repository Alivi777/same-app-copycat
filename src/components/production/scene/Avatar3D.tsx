import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Html, Float } from "@react-three/drei";
import * as THREE from "three";

interface Avatar3DProps {
  position: [number, number, number];
  name: string;
  color: string;
  isSelected: boolean;
  onClick: () => void;
  orderCount: number;
}

export function Avatar3D({ 
  position, 
  name, 
  color, 
  isSelected, 
  onClick,
  orderCount 
}: Avatar3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  const threeColor = new THREE.Color(color);
  const scale = isSelected ? 1.2 : hovered ? 1.1 : 1;

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (groupRef.current) {
      // Floating animation
      groupRef.current.position.y = position[1] + Math.sin(time * 2) * 0.05;
    }
    
    if (bodyRef.current) {
      // Idle sway
      bodyRef.current.rotation.y = Math.sin(time * 0.5) * 0.1;
    }
  });

  return (
    <group 
      ref={groupRef} 
      position={position}
      scale={scale}
      onClick={onClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[0.5, 0.6, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      )}
      
      {/* Glow base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={isSelected ? 0.6 : 0.3} 
        />
      </mesh>
      
      {/* Body group */}
      <group ref={bodyRef} position={[0, 0.5, 0]}>
        {/* Lower body / legs */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.15, 0.2, 0.3, 8]} />
          <meshStandardMaterial 
            color="#1a1f2e"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        
        {/* Torso */}
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.2, 0.18, 0.4, 8]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
        
        {/* Chest light */}
        <mesh position={[0, 0.2, 0.18]}>
          <boxGeometry args={[0.1, 0.1, 0.02]} />
          <meshBasicMaterial color={color} />
        </mesh>
        
        {/* Shoulders */}
        <mesh position={[-0.25, 0.25, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={0.2}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0.25, 0.25, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={0.2}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
        
        {/* Arms */}
        <mesh position={[-0.28, 0.05, 0]} rotation={[0, 0, 0.2]}>
          <cylinderGeometry args={[0.04, 0.05, 0.35, 8]} />
          <meshStandardMaterial color="#1a1f2e" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0.28, 0.05, 0]} rotation={[0, 0, -0.2]}>
          <cylinderGeometry args={[0.04, 0.05, 0.35, 8]} />
          <meshStandardMaterial color="#1a1f2e" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Neck */}
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 0.1, 8]} />
          <meshStandardMaterial color="#1a1f2e" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Head */}
        <group position={[0, 0.55, 0]}>
          <mesh>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial 
              color={color}
              emissive={color}
              emissiveIntensity={0.2}
              metalness={0.5}
              roughness={0.4}
            />
          </mesh>
          
          {/* Visor */}
          <mesh position={[0, 0, 0.14]}>
            <boxGeometry args={[0.25, 0.08, 0.08]} />
            <meshStandardMaterial 
              color="#0a0f1a"
              metalness={1}
              roughness={0}
            />
          </mesh>
          
          {/* Visor glow */}
          <mesh position={[0, 0, 0.18]}>
            <planeGeometry args={[0.22, 0.05]} />
            <meshBasicMaterial color={color} />
          </mesh>
          
          {/* Antenna */}
          <mesh position={[0.1, 0.18, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.15, 4]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <mesh position={[0.1, 0.27, 0]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </group>
      </group>
      
      {/* Floating name tag */}
      <Float speed={2} rotationIntensity={0} floatIntensity={0.2}>
        <group position={[0, 1.3, 0]}>
          {/* Background */}
          <mesh>
            <planeGeometry args={[0.8, 0.25]} />
            <meshBasicMaterial color="#0a0f1a" transparent opacity={0.8} />
          </mesh>
          
          {/* Border */}
          <lineSegments position={[0, 0, 0.01]}>
            <edgesGeometry args={[new THREE.PlaneGeometry(0.8, 0.25)]} />
            <lineBasicMaterial color={color} />
          </lineSegments>
          
          {/* Name */}
          <Text
            position={[0, 0, 0.02]}
            fontSize={0.1}
            color={color}
            anchorX="center"
            anchorY="middle"
          >
            {name}
          </Text>
        </group>
      </Float>
      
      {/* Order count indicator */}
      {orderCount > 0 && (
        <Float speed={3} rotationIntensity={0.1} floatIntensity={0.3}>
          <group position={[0.4, 1.0, 0]}>
            <mesh>
              <circleGeometry args={[0.15, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>
            <Text
              position={[0, 0, 0.01]}
              fontSize={0.12}
              color="#0a0f1a"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              {orderCount}
            </Text>
          </group>
        </Float>
      )}
      
      {/* Hover info panel */}
      {hovered && !isSelected && (
        <Html position={[0, 1.8, 0]} center>
          <div 
            className="px-3 py-2 rounded-lg text-xs whitespace-nowrap"
            style={{
              background: 'rgba(10, 15, 26, 0.9)',
              border: `1px solid ${color}`,
              color: color,
              boxShadow: `0 0 20px ${color}40`,
            }}
          >
            <div className="font-bold">{name}</div>
            <div className="opacity-70">{orderCount} pedidos ativos</div>
          </div>
        </Html>
      )}
    </group>
  );
}
