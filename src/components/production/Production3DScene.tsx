import { Canvas } from "@react-three/fiber";
import { OrbitControls, Float, Text, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Suspense, useState } from "react";
import * as THREE from "three";
import { LabFloor } from "./scene/LabFloor";
import { Workstation } from "./scene/Workstation";
import { Avatar3D } from "./scene/Avatar3D";
import { DataChip } from "./scene/DataChip";
import { ParticleField } from "./scene/ParticleField";
import { NeonWalls } from "./scene/NeonWalls";

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
const STATIONS = {
  projeto: { position: [0, 0, -3] as [number, number, number], size: [8, 3] as [number, number], label: "ÁREA DE PROJETO" },
  fresadora: { position: [5, 0, 0] as [number, number, number], size: [2, 2] as [number, number], label: "FRESADORA" },
  vazado: { position: [7, 0, 0] as [number, number, number], size: [2, 2] as [number, number], label: "VAZADO" },
  espera: { position: [0, 0, 0] as [number, number, number], size: [4, 3] as [number, number], label: "ÁREA DE ESPERA" },
  maquiagem: { position: [-2, 0, 3] as [number, number, number], size: [3, 2] as [number, number], label: "MAQUIAGEM" },
  pureto: { position: [3, 0, 3] as [number, number, number], size: [3, 2] as [number, number], label: "PURETO" },
  saida: { position: [-5, 0, 3] as [number, number, number], size: [2, 2] as [number, number], label: "SAÍDA" },
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

function Scene({ 
  orders, 
  selectedPerson, 
  onSelectPerson, 
  onSelectOrder,
  userNames 
}: Production3DSceneProps) {
  const [hoveredStation, setHoveredStation] = useState<string | null>(null);
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
    setSelectedOrder(selectedOrder?.id === order.id ? null : order);
    onSelectOrder(selectedOrder?.id === order.id ? null : order);
  };

  return (
    <>
      {/* Ambient and directional lights */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 5]} intensity={0.3} color="#22d3ee" />
      <directionalLight position={[-10, 10, -5]} intensity={0.2} color="#d946ef" />
      
      {/* Point lights for neon effect */}
      <pointLight position={[0, 3, -3]} intensity={2} color="#22d3ee" distance={15} />
      <pointLight position={[-5, 3, 3]} intensity={1.5} color="#10b981" distance={10} />
      <pointLight position={[5, 3, 0]} intensity={1.5} color="#d946ef" distance={10} />
      <pointLight position={[0, 3, 3]} intensity={1.5} color="#f59e0b" distance={10} />

      {/* Lab Floor with circuit pattern */}
      <LabFloor />

      {/* Neon Walls */}
      <NeonWalls />

      {/* Floating Particles */}
      <ParticleField count={200} />

      {/* Workstations */}
      {Object.entries(STATIONS).map(([key, config]) => (
        <Workstation
          key={key}
          position={config.position}
          size={config.size}
          label={config.label}
          stationId={key}
          isHovered={hoveredStation === key}
          onHover={setHoveredStation}
          orderCount={ordersByStation[key]?.length || 0}
        />
      ))}

      {/* Avatars for users in projeto area */}
      {Object.entries(USER_POSITIONS).map(([username, position]) => (
        <Avatar3D
          key={username}
          position={position}
          name={userNames[username] || username.toUpperCase()}
          color={USER_COLORS[username]}
          isSelected={selectedPerson === username}
          onClick={() => onSelectPerson(selectedPerson === username ? null : username)}
          orderCount={ordersByUser[username]?.length || 0}
        />
      ))}

      {/* Data Chips (orders) moving between stations */}
      {Object.entries(ordersByStation).map(([stationKey, stationOrders]) => {
        if (stationKey === "projeto") return null; // Orders shown near avatars
        const station = STATIONS[stationKey as keyof typeof STATIONS];
        if (!station) return null;
        
        return stationOrders.map((order, index) => {
          const row = Math.floor(index / 4);
          const col = index % 4;
          const offsetX = (col - 1.5) * 0.6;
          const offsetZ = row * 0.5;
          
          return (
            <DataChip
              key={order.id}
              position={[
                station.position[0] + offsetX,
                0.3 + index * 0.02,
                station.position[2] + offsetZ
              ]}
              order={order}
              isSelected={selectedOrder?.id === order.id}
              onClick={() => handleOrderClick(order)}
              color={USER_COLORS[order.assigned_user?.username?.toLowerCase() || ""] || "#9ca3af"}
            />
          );
        });
      })}

      {/* Orders for projeto area - near each user */}
      {Object.entries(ordersByUser).map(([username, userOrders]) => {
        const basePosition = USER_POSITIONS[username];
        if (!basePosition) return null;
        
        return userOrders.slice(0, 6).map((order, index) => {
          const angle = (index / 6) * Math.PI * 2;
          const radius = 0.8;
          
          return (
            <DataChip
              key={order.id}
              position={[
                basePosition[0] + Math.cos(angle) * radius,
                0.5 + index * 0.1,
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
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 12, 12], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene {...props} />
          
          {/* Post-processing effects */}
          <EffectComposer>
            <Bloom 
              intensity={1.5}
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
              mipmapBlur
            />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
