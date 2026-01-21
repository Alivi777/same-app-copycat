import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { Suspense, useState } from "react";
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

// Station positions based on floor plan
const STATIONS: Record<string, { position: [number, number, number]; size: [number, number]; label: string; color: string }> = {
  projeto: { position: [0, 0, -3], size: [8, 3], label: "ÁREA DE PROJETO", color: "#22d3ee" },
  fresadora: { position: [5, 0, 0], size: [2, 2], label: "FRESADORA", color: "#22d3ee" },
  vazado: { position: [7, 0, 0], size: [2, 2], label: "VAZADO", color: "#d946ef" },
  espera: { position: [0, 0, 1], size: [4, 3], label: "ÁREA DE ESPERA", color: "#f59e0b" },
  maquiagem: { position: [-3, 0, 4], size: [3, 2], label: "MAQUIAGEM", color: "#ec4899" },
  pureto: { position: [3, 0, 4], size: [3, 2], label: "PURETO", color: "#8b5cf6" },
  saida: { position: [-6, 0, 4], size: [2, 2], label: "SAÍDA", color: "#10b981" },
};

const USER_COLORS: Record<string, string> = {
  carneiro: "#22d3ee",
  alexandre: "#d946ef", 
  henrique: "#f59e0b",
};

const USER_POSITIONS: Record<string, [number, number, number]> = {
  carneiro: [-2, 0, -3],
  alexandre: [0, 0, -3],
  henrique: [2, 0, -3],
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

// Simple Floor Component
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <planeGeometry args={[25, 18]} />
      <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.5} />
    </mesh>
  );
}

// Grid Lines
function GridLines() {
  return (
    <gridHelper args={[25, 25, "#22d3ee", "#1e3a5f"]} position={[0, 0.01, 0]} />
  );
}

// Simple Workstation
function SimpleWorkstation({ 
  position, 
  size, 
  label, 
  color,
  orderCount 
}: { 
  position: [number, number, number]; 
  size: [number, number];
  label: string;
  color: string;
  orderCount: number;
}) {
  return (
    <group position={position}>
      {/* Platform */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[size[0], 0.05, size[1]]} />
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={0.4}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Border */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[size[0] + 0.1, 0.03, size[1] + 0.1]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
      
      {/* Corner pillars */}
      {[
        [-size[0]/2 + 0.1, 0.25, -size[1]/2 + 0.1],
        [size[0]/2 - 0.1, 0.25, -size[1]/2 + 0.1],
        [-size[0]/2 + 0.1, 0.25, size[1]/2 - 0.1],
        [size[0]/2 - 0.1, 0.25, size[1]/2 - 0.1],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <cylinderGeometry args={[0.06, 0.06, 0.5, 8]} />
          <meshStandardMaterial 
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
      
      {/* Label */}
      <Html position={[0, 0.7, 0]} center style={{ pointerEvents: 'none' }}>
        <div
          className="px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider whitespace-nowrap"
          style={{
            background: 'rgba(10, 15, 26, 0.95)',
            border: `2px solid ${color}`,
            color: color,
            boxShadow: `0 0 20px ${color}50`,
          }}
        >
          {label}
          {orderCount > 0 && (
            <span
              className="ml-2 px-2 py-0.5 rounded-full"
              style={{ backgroundColor: color, color: '#0a0f1a' }}
            >
              {orderCount}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

// Simple Avatar
function SimpleAvatar({
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
  return (
    <group position={position} onClick={onClick}>
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.5, 0.6, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      )}
      
      {/* Glow base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
      
      {/* Body */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.5, 8]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Visor */}
      <mesh position={[0, 0.85, 0.18]}>
        <boxGeometry args={[0.28, 0.08, 0.05]} />
        <meshBasicMaterial color="#0a0f1a" />
      </mesh>
      
      {/* Name tag */}
      <Html position={[0, 1.3, 0]} center style={{ pointerEvents: 'none' }}>
        <div
          className="px-2 py-1 rounded text-xs font-bold whitespace-nowrap"
          style={{
            background: 'rgba(10, 15, 26, 0.95)',
            border: `2px solid ${color}`,
            color: color,
            boxShadow: `0 0 15px ${color}50`,
          }}
        >
          {name}
          {orderCount > 0 && (
            <span
              className="ml-1 px-1.5 py-0.5 rounded-full text-[10px]"
              style={{ backgroundColor: color, color: '#0a0f1a' }}
            >
              {orderCount}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

// Simple Data Chip
function SimpleDataChip({
  position,
  color,
  order,
  isSelected,
  onClick
}: {
  position: [number, number, number];
  color: string;
  order: Order;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <group 
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <mesh scale={isSelected || hovered ? 1.2 : 1}>
        <boxGeometry args={[0.35, 0.08, 0.25]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.6 : 0.3}
        />
      </mesh>
      
      {/* Show info on hover/select */}
      {(hovered || isSelected) && (
        <Html position={[0, 0.4, 0]} center>
          <div 
            className="px-2 py-1.5 rounded text-xs min-w-[120px] pointer-events-none"
            style={{
              background: 'rgba(10, 15, 26, 0.95)',
              border: `2px solid ${color}`,
              color: '#e2e8f0',
              boxShadow: `0 0 20px ${color}50`,
            }}
          >
            <div style={{ color }} className="font-bold">{order.order_number}</div>
            <div className="text-cyan-100/80 text-[10px]">{order.patient_name}</div>
          </div>
        </Html>
      )}
    </group>
  );
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
  const ordersByStation = orders.reduce((acc, order) => {
    const station = getStation(order.status);
    if (!acc[station]) acc[station] = [];
    acc[station].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  // Group orders by user (for projeto station)
  const ordersByUser = orders.reduce((acc, order) => {
    const station = getStation(order.status);
    if (station === "projeto" && order.assigned_user?.username) {
      const username = order.assigned_user.username.toLowerCase();
      if (!acc[username]) acc[username] = [];
      acc[username].push(order);
    }
    return acc;
  }, {} as Record<string, Order[]>);

  const handleOrderClick = (order: Order) => {
    const newSelection = selectedOrder?.id === order.id ? null : order;
    setSelectedOrder(newSelection);
    onSelectOrder(newSelection);
  };

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} color="#ffffff" />
      <pointLight position={[0, 5, -3]} intensity={1} color="#22d3ee" distance={20} />
      <pointLight position={[-5, 5, 3]} intensity={0.8} color="#10b981" distance={15} />
      <pointLight position={[5, 5, 0]} intensity={0.8} color="#d946ef" distance={15} />
      <pointLight position={[0, 5, 4]} intensity={0.8} color="#f59e0b" distance={15} />

      {/* Floor */}
      <Floor />
      <GridLines />

      {/* Workstations */}
      {Object.entries(STATIONS).map(([key, config]) => (
        <SimpleWorkstation
          key={key}
          position={config.position}
          size={config.size}
          label={config.label}
          color={config.color}
          orderCount={ordersByStation[key]?.length || 0}
        />
      ))}

      {/* Avatars */}
      {Object.entries(USER_POSITIONS).map(([username, position]) => (
        <SimpleAvatar
          key={username}
          position={position}
          name={userNames[username] || username.toUpperCase()}
          color={USER_COLORS[username]}
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
          const offsetX = (col - 1.5) * 0.5;
          const offsetZ = row * 0.4;
          
          return (
            <SimpleDataChip
              key={order.id}
              position={[
                station.position[0] + offsetX,
                0.2 + index * 0.01,
                station.position[2] + offsetZ + 0.3
              ]}
              order={order}
              isSelected={selectedOrder?.id === order.id}
              onClick={() => handleOrderClick(order)}
              color={USER_COLORS[order.assigned_user?.username?.toLowerCase() || ""] || "#9ca3af"}
            />
          );
        });
      })}

      {/* Data Chips near avatars for projeto station */}
      {Object.entries(ordersByUser).map(([username, userOrders]) => {
        const basePosition = USER_POSITIONS[username];
        if (!basePosition) return null;
        
        return userOrders.slice(0, 6).map((order, index) => {
          const angle = (index / 6) * Math.PI * 2;
          const radius = 0.7;
          
          return (
            <SimpleDataChip
              key={order.id}
              position={[
                basePosition[0] + Math.cos(angle) * radius,
                0.3 + index * 0.08,
                basePosition[2] + Math.sin(angle) * radius + 0.5
              ]}
              order={order}
              isSelected={selectedOrder?.id === order.id}
              onClick={() => handleOrderClick(order)}
              color={USER_COLORS[username]}
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
        maxDistance={25}
        target={[0, 0, 0]}
      />
    </>
  );
}

export function Production3DScene(props: Production3DSceneProps) {
  return (
    <div className="w-full h-full" style={{ minHeight: '500px', background: '#0f172a' }}>
      <Canvas
        camera={{ position: [0, 12, 12], fov: 50 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0f172a']} />
        <fog attach="fog" args={['#0f172a', 15, 35]} />
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
