import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, RoundedBox } from "@react-three/drei";
import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import * as THREE from "three";

interface Order {
  id: string;
  order_number: string;
  patient_name: string;
  status: string;
  assigned_to: string | null;
  assigned_user?: { username: string } | null;
}

interface Production3DSceneProps {
  orders: Order[];
  selectedPerson: string | null;
  onSelectPerson: (person: string | null) => void;
  onSelectOrder: (order: Order | null) => void;
  userNames: Record<string, string>;
}

// Professional color palette - muted, clean
const COLORS = {
  floor: "#1a1d23",
  wall: "#252830",
  wallAccent: "#3b4252",
  grid: "#2a2f3a",
  ambient: "#4a5568",
  station: {
    projeto: "#3b82f6",
    fresadora: "#6366f1",
    vazado: "#8b5cf6",
    espera: "#64748b",
    maquiagem: "#ec4899",
    pureto: "#a855f7",
    saida: "#22c55e",
  },
  user: {
    carneiro: "#3b82f6",
    alexandre: "#8b5cf6",
    henrique: "#f59e0b",
  }
};

// Station configurations based on floor plan
const STATIONS: Record<string, { position: [number, number, number]; size: [number, number]; label: string }> = {
  projeto: { position: [0, 0, -4], size: [10, 4], label: "ÁREA DE PROJETO" },
  fresadora: { position: [6, 0, 1], size: [3, 3], label: "FRESADORA" },
  vazado: { position: [6, 0, 5], size: [3, 3], label: "VAZADO" },
  espera: { position: [-6, 0, 1], size: [3, 4], label: "ÁREA DE ESPERA" },
  maquiagem: { position: [0, 0, 5], size: [4, 3], label: "MAQUIAGEM" },
  pureto: { position: [-6, 0, 5], size: [3, 3], label: "PURETO" },
  saida: { position: [0, 0, 9], size: [5, 2], label: "SAÍDA" },
};

const USER_POSITIONS: Record<string, [number, number, number]> = {
  carneiro: [-3, 0, -4],
  alexandre: [0, 0, -4],
  henrique: [3, 0, -4],
};

// Status to station mapping
const getStation = (status: string): string => {
  switch (status) {
    case "pending": return "espera";
    case "in-progress":
    case "projetando": return "projeto";
    case "projetado": return "fresadora";
    case "fresado-definitivo":
    case "maquiagem": return "maquiagem";
    case "fresado-provisorio": return "saida";
    case "vazado": return "vazado";
    case "pureto": return "pureto";
    case "completed":
    case "entregue-provisorio": return "saida";
    default: return "espera";
  }
};

// Professional Floor
function Floor() {
  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 2]} receiveShadow>
        <planeGeometry args={[26, 22]} />
        <meshStandardMaterial color={COLORS.floor} roughness={0.8} metalness={0.2} />
      </mesh>
      
      {/* Subtle grid */}
      <gridHelper 
        args={[26, 26, COLORS.grid, COLORS.grid]} 
        position={[0, 0.01, 2]} 
      />
    </group>
  );
}

// Professional walls with divisions
function Walls() {
  const wallHeight = 2.5;
  const wallThickness = 0.15;
  
  const walls = useMemo(() => [
    // Outer walls
    { pos: [0, wallHeight/2, -7] as [number, number, number], size: [26, wallHeight, wallThickness] as [number, number, number] },
    { pos: [0, wallHeight/2, 11] as [number, number, number], size: [26, wallHeight, wallThickness] as [number, number, number] },
    { pos: [-13, wallHeight/2, 2] as [number, number, number], size: [wallThickness, wallHeight, 18] as [number, number, number] },
    { pos: [13, wallHeight/2, 2] as [number, number, number], size: [wallThickness, wallHeight, 18] as [number, number, number] },
    
    // Interior divisions
    { pos: [-4, wallHeight/2, -1.5] as [number, number, number], size: [wallThickness, wallHeight, 5] as [number, number, number] }, // Left of projeto
    { pos: [4, wallHeight/2, -1.5] as [number, number, number], size: [wallThickness, wallHeight, 5] as [number, number, number] }, // Right of projeto
    { pos: [0, wallHeight/2, 3] as [number, number, number], size: [8, wallHeight, wallThickness] as [number, number, number] }, // Below projeto
    { pos: [-9, wallHeight/2, 3] as [number, number, number], size: [8, wallHeight, wallThickness] as [number, number, number] }, // Espera/Pureto divider
    { pos: [9, wallHeight/2, 3] as [number, number, number], size: [8, wallHeight, wallThickness] as [number, number, number] }, // Fresadora/Vazado divider
    { pos: [4, wallHeight/2, 7] as [number, number, number], size: [wallThickness, wallHeight, 8] as [number, number, number] }, // Maquiagem right
    { pos: [-4, wallHeight/2, 7] as [number, number, number], size: [wallThickness, wallHeight, 8] as [number, number, number] }, // Maquiagem left
  ], [wallHeight, wallThickness]);

  return (
    <group>
      {walls.map((wall, i) => (
        <mesh key={i} position={wall.pos} castShadow receiveShadow>
          <boxGeometry args={wall.size} />
          <meshStandardMaterial 
            color={COLORS.wall}
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      ))}
      
      {/* Wall top accent strips */}
      {walls.map((wall, i) => (
        <mesh key={`accent-${i}`} position={[wall.pos[0], wallHeight + 0.02, wall.pos[2]]}>
          <boxGeometry args={[wall.size[0], 0.04, wall.size[2]]} />
          <meshStandardMaterial 
            color={COLORS.wallAccent}
            roughness={0.5}
            metalness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

// Professional workstation
function ProfessionalStation({ 
  stationId,
  position, 
  size, 
  label,
  orderCount 
}: { 
  stationId: string;
  position: [number, number, number]; 
  size: [number, number];
  label: string;
  orderCount: number;
}) {
  const color = COLORS.station[stationId as keyof typeof COLORS.station] || COLORS.ambient;
  
  return (
    <group position={position}>
      {/* Floor marking */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[size[0] - 0.2, size[1] - 0.2]} />
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={0.15}
          roughness={0.8}
        />
      </mesh>
      
      {/* Border line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[Math.min(size[0], size[1]) * 0.45, Math.min(size[0], size[1]) * 0.48, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
      
      {/* Label */}
      <Html position={[0, 0.1, 0]} center style={{ pointerEvents: 'none' }}>
        <div
          className="px-4 py-2 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap backdrop-blur-sm"
          style={{
            background: 'rgba(26, 29, 35, 0.9)',
            border: `1px solid ${color}40`,
            color: color,
          }}
        >
          {label}
          {orderCount > 0 && (
            <span
              className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ backgroundColor: color, color: '#1a1d23' }}
            >
              {orderCount}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

// Improved professional robot/avatar
function ProfessionalAvatar({
  position,
  name,
  color,
  isSelected,
  onClick,
  orderCount
}: {
  position: [number, number, number];
  name: string;
  color: string;
  isSelected: boolean;
  onClick: () => void;
  orderCount: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Subtle idle animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <group 
      ref={groupRef}
      position={position}
      onClick={onClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Selection indicator */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.55, 0.65, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
      )}
      
      {/* Base platform */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 0.06, 16]} />
        <meshStandardMaterial color="#2a2f3a" metalness={0.6} roughness={0.3} />
      </mesh>
      
      {/* Body - sleek cylinder */}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.7, 16]} />
        <meshStandardMaterial 
          color="#3b4252"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      
      {/* Chest accent strip */}
      <mesh position={[0, 0.5, 0.23]}>
        <boxGeometry args={[0.15, 0.25, 0.02]} />
        <meshBasicMaterial color={color} />
      </mesh>
      
      {/* Shoulders */}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[0.55, 0.08, 0.25]} />
        <meshStandardMaterial color="#3b4252" metalness={0.7} roughness={0.3} />
      </mesh>
      
      {/* Arms */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.32, 0.5, 0]}>
          <mesh position={[0, -0.1, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.35, 8]} />
            <meshStandardMaterial color="#2a2f3a" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.32, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      ))}
      
      {/* Neck */}
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.08, 8]} />
        <meshStandardMaterial color="#2a2f3a" metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* Head - rounded box style */}
      <group position={[0, 1.0, 0]}>
        <RoundedBox args={[0.32, 0.28, 0.26]} radius={0.05} smoothness={4}>
          <meshStandardMaterial color="#3b4252" metalness={0.7} roughness={0.3} />
        </RoundedBox>
        
        {/* Visor */}
        <mesh position={[0, 0, 0.13]}>
          <boxGeometry args={[0.26, 0.1, 0.02]} />
          <meshStandardMaterial color="#0f1115" metalness={1} roughness={0} />
        </mesh>
        
        {/* Visor glow */}
        <mesh position={[0, 0, 0.14]}>
          <planeGeometry args={[0.22, 0.06]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} />
        </mesh>
        
        {/* Status light */}
        <mesh position={[0, 0.14, 0.12]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color={orderCount > 0 ? "#22c55e" : "#64748b"} />
        </mesh>
      </group>
      
      {/* Name tag */}
      <Html position={[0, 1.4, 0]} center style={{ pointerEvents: 'none' }}>
        <div
          className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap backdrop-blur-sm"
          style={{
            background: 'rgba(26, 29, 35, 0.95)',
            border: `1px solid ${color}60`,
            color: color,
          }}
        >
          {name}
          {orderCount > 0 && (
            <span
              className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold"
              style={{ backgroundColor: color, color: '#1a1d23' }}
            >
              {orderCount}
            </span>
          )}
        </div>
      </Html>
      
      {/* Hover info */}
      {hovered && !isSelected && (
        <Html position={[0, 1.7, 0]} center>
          <div 
            className="px-3 py-2 rounded-lg text-xs whitespace-nowrap backdrop-blur-sm"
            style={{
              background: 'rgba(26, 29, 35, 0.95)',
              border: `1px solid ${color}40`,
              color: '#e2e8f0',
            }}
          >
            <div className="font-semibold" style={{ color }}>{name}</div>
            <div className="text-gray-400 text-[10px]">{orderCount} pedidos ativos</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Animated Data Chip with transition
function AnimatedDataChip({
  targetPosition,
  color,
  order,
  isSelected,
  onClick
}: {
  targetPosition: [number, number, number];
  color: string;
  order: Order;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [currentPos, setCurrentPos] = useState<[number, number, number]>(targetPosition);
  const [hovered, setHovered] = useState(false);
  
  // Store previous position for animation
  const prevPosRef = useRef<[number, number, number]>(targetPosition);
  const animationProgress = useRef(1);
  
  useEffect(() => {
    // When target changes, start animation
    if (
      prevPosRef.current[0] !== targetPosition[0] ||
      prevPosRef.current[1] !== targetPosition[1] ||
      prevPosRef.current[2] !== targetPosition[2]
    ) {
      animationProgress.current = 0;
    }
  }, [targetPosition]);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Animate position transition
      if (animationProgress.current < 1) {
        animationProgress.current = Math.min(1, animationProgress.current + delta * 2);
        const t = easeOutCubic(animationProgress.current);
        
        const newX = THREE.MathUtils.lerp(prevPosRef.current[0], targetPosition[0], t);
        const newY = THREE.MathUtils.lerp(prevPosRef.current[1], targetPosition[1], t);
        const newZ = THREE.MathUtils.lerp(prevPosRef.current[2], targetPosition[2], t);
        
        setCurrentPos([newX, newY, newZ]);
        
        if (animationProgress.current >= 1) {
          prevPosRef.current = targetPosition;
        }
      }
      
      // Subtle floating animation
      meshRef.current.position.y = currentPos[1] + Math.sin(state.clock.elapsedTime * 2 + currentPos[0]) * 0.02;
    }
  });
  
  return (
    <group 
      ref={meshRef}
      position={currentPos}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <RoundedBox 
        args={[0.4, 0.1, 0.28]} 
        radius={0.02} 
        smoothness={4}
        scale={isSelected || hovered ? 1.15 : 1}
      >
        <meshStandardMaterial 
          color={color}
          metalness={0.5}
          roughness={0.4}
          emissive={color}
          emissiveIntensity={isSelected ? 0.3 : 0.1}
        />
      </RoundedBox>
      
      {/* Status indicator line */}
      <mesh position={[0, 0.055, 0]}>
        <boxGeometry args={[0.3, 0.01, 0.02]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
      </mesh>
      
      {/* Info popup */}
      {(hovered || isSelected) && (
        <Html position={[0, 0.35, 0]} center>
          <div 
            className="px-3 py-2 rounded-lg text-xs min-w-[130px] pointer-events-none backdrop-blur-sm"
            style={{
              background: 'rgba(26, 29, 35, 0.95)',
              border: `1px solid ${color}60`,
              color: '#e2e8f0',
            }}
          >
            <div style={{ color }} className="font-semibold">{order.order_number}</div>
            <div className="text-gray-400 text-[10px]">{order.patient_name}</div>
            <div className="text-gray-500 text-[9px] mt-1">{order.status}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Easing function for smooth animations
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function Scene({ 
  orders, 
  selectedPerson, 
  onSelectPerson, 
  onSelectOrder,
  userNames 
}: Production3DSceneProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Group orders by station
  const ordersByStation = useMemo(() => {
    return orders.reduce((acc, order) => {
      const station = getStation(order.status);
      if (!acc[station]) acc[station] = [];
      acc[station].push(order);
      return acc;
    }, {} as Record<string, Order[]>);
  }, [orders]);

  // Group orders by user (for projeto station)
  const ordersByUser = useMemo(() => {
    return orders.reduce((acc, order) => {
      const station = getStation(order.status);
      if (station === "projeto" && order.assigned_user?.username) {
        const username = order.assigned_user.username.toLowerCase();
        if (!acc[username]) acc[username] = [];
        acc[username].push(order);
      }
      return acc;
    }, {} as Record<string, Order[]>);
  }, [orders]);

  const handleOrderClick = (order: Order) => {
    const newSelection = selectedOrder?.id === order.id ? null : order;
    setSelectedOrder(newSelection);
    onSelectOrder(newSelection);
  };

  return (
    <>
      {/* Professional lighting */}
      <ambientLight intensity={0.4} color="#e2e8f0" />
      <directionalLight 
        position={[10, 15, 10]} 
        intensity={0.6} 
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[0, 8, 0]} intensity={0.4} color="#e2e8f0" distance={25} />
      
      {/* Subtle colored accents */}
      <pointLight position={[-8, 3, -4]} intensity={0.2} color={COLORS.station.projeto} distance={12} />
      <pointLight position={[8, 3, 4]} intensity={0.2} color={COLORS.station.fresadora} distance={12} />

      {/* Environment */}
      <Floor />
      <Walls />

      {/* Workstations */}
      {Object.entries(STATIONS).map(([key, config]) => (
        <ProfessionalStation
          key={key}
          stationId={key}
          position={config.position}
          size={config.size}
          label={config.label}
          orderCount={ordersByStation[key]?.length || 0}
        />
      ))}

      {/* Avatars */}
      {Object.entries(USER_POSITIONS).map(([username, position]) => (
        <ProfessionalAvatar
          key={username}
          position={position}
          name={userNames[username] || username.toUpperCase()}
          color={COLORS.user[username as keyof typeof COLORS.user] || COLORS.ambient}
          isSelected={selectedPerson === username}
          onClick={() => onSelectPerson(selectedPerson === username ? null : username)}
          orderCount={ordersByUser[username]?.length || 0}
        />
      ))}

      {/* Data Chips for non-projeto stations */}
      {Object.entries(ordersByStation).map(([stationKey, stationOrders]) => {
        if (stationKey === "projeto") return null;
        const station = STATIONS[stationKey];
        if (!station) return null;
        
        return stationOrders.slice(0, 12).map((order, index) => {
          const row = Math.floor(index / 4);
          const col = index % 4;
          const offsetX = (col - 1.5) * 0.55;
          const offsetZ = row * 0.45 - 0.5;
          
          const userColor = COLORS.user[order.assigned_user?.username?.toLowerCase() as keyof typeof COLORS.user] || COLORS.ambient;
          
          return (
            <AnimatedDataChip
              key={order.id}
              targetPosition={[
                station.position[0] + offsetX,
                0.15,
                station.position[2] + offsetZ
              ]}
              order={order}
              isSelected={selectedOrder?.id === order.id}
              onClick={() => handleOrderClick(order)}
              color={userColor}
            />
          );
        });
      })}

      {/* Data Chips near avatars for projeto station */}
      {Object.entries(ordersByUser).map(([username, userOrders]) => {
        const basePosition = USER_POSITIONS[username];
        if (!basePosition) return null;
        
        const userColor = COLORS.user[username as keyof typeof COLORS.user] || COLORS.ambient;
        
        return userOrders.slice(0, 6).map((order, index) => {
          const row = Math.floor(index / 3);
          const col = index % 3;
          const offsetX = (col - 1) * 0.55;
          const offsetZ = row * 0.45 + 0.8;
          
          return (
            <AnimatedDataChip
              key={order.id}
              targetPosition={[
                basePosition[0] + offsetX,
                0.15,
                basePosition[2] + offsetZ
              ]}
              order={order}
              isSelected={selectedOrder?.id === order.id}
              onClick={() => handleOrderClick(order)}
              color={userColor}
            />
          );
        });
      })}

      {/* Camera controls */}
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={30}
        target={[0, 0, 2]}
      />
    </>
  );
}

export function Production3DScene(props: Production3DSceneProps) {
  return (
    <div className="w-full h-full" style={{ minHeight: '500px', background: '#0f1115' }}>
      <Canvas
        camera={{ position: [0, 14, 18], fov: 45 }}
        gl={{ antialias: true }}
        shadows
      >
        <color attach="background" args={['#0f1115']} />
        <fog attach="fog" args={['#0f1115', 20, 45]} />
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
