import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  patient_name: string;
  status: string;
  assigned_to: string | null;
  delivery_deadline: string | null;
  created_at: string;
  assigned_user?: { username: string } | null;
}

interface StationConfig {
  id: string;
  title: string;
  color: string;
}

const USER_COLORS: Record<string, { hex: string; label: string }> = {
  carneiro: { hex: "#22d3ee", label: "Carneiro" },
  alexandre: { hex: "#d946ef", label: "Alexandre" },
  henrique: { hex: "#f59e0b", label: "Henrique" },
};

const PRESET_COLORS = [
  "#22d3ee", "#d946ef", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899", "#84cc16"
];

const getUserColor = (username: string | null | undefined) => {
  if (!username) return "#9ca3af";
  const normalizedName = username.toLowerCase();
  return USER_COLORS[normalizedName]?.hex || "#9ca3af";
};

interface ProductionSidebarProps {
  orders: Order[];
  selectedPerson: string | null;
  onSelectPerson: (person: string | null) => void;
  selectedOrder: Order | null;
  onSelectOrder: (order: Order | null) => void;
  userNames: Record<string, string>;
  setUserNames: (names: Record<string, string>) => void;
  isEditMode: boolean;
  selectedStation: StationConfig | null;
  onUpdateStation: (updates: Partial<StationConfig>) => void;
  onDeleteStation: () => void;
}

export function ProductionSidebar({
  orders,
  selectedPerson,
  onSelectPerson,
  selectedOrder,
  onSelectOrder,
  userNames,
  setUserNames,
  isEditMode,
  selectedStation,
  onUpdateStation,
  onDeleteStation,
}: ProductionSidebarProps) {
  const activeOrders = orders.filter(order => 
    !['completed', 'entregue-provisorio', 'fresado-provisorio'].includes(order.status)
  );

  const getOrdersByUser = (username: string) => {
    return orders.filter(order => {
      const assignedUsername = order.assigned_user?.username?.toLowerCase();
      return assignedUsername === username.toLowerCase();
    });
  };

  return (
    <div className="w-64 h-full flex flex-col gap-4 p-4">
      {/* Team Legend Panel */}
      <div 
        className="rounded-xl backdrop-blur-md overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)',
          border: '1px solid rgba(34, 211, 238, 0.3)',
          boxShadow: '0 0 20px rgba(34, 211, 238, 0.1)',
        }}
      >
        <div 
          className="px-4 py-2 border-b"
          style={{ 
            borderColor: 'rgba(34, 211, 238, 0.2)',
            background: 'linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.1), transparent)'
          }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Equipe
          </h3>
        </div>
        <div className="p-3 space-y-2">
          {Object.entries(USER_COLORS).map(([key, { hex, label }]) => {
            const isSelected = selectedPerson === key;
            const orderCount = getOrdersByUser(key).length;
            
            return (
              <button
                key={key}
                onClick={() => onSelectPerson(isSelected ? null : key)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-300 ${
                  isSelected ? 'ring-1 ring-white/50' : 'hover:bg-white/5'
                }`}
                style={{
                  background: isSelected ? `${hex}20` : 'transparent',
                  borderLeft: `3px solid ${hex}`,
                }}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-slate-900"
                  style={{ 
                    backgroundColor: hex,
                    boxShadow: `0 0 15px ${hex}60`
                  }}
                >
                  {isEditMode ? (
                    <span>{userNames[key]?.charAt(0) || key.charAt(0).toUpperCase()}</span>
                  ) : (
                    orderCount
                  )}
                </div>
                <div className="flex-1 text-left">
                  {isEditMode ? (
                    <Input 
                      value={userNames[key]} 
                      onChange={(e) => setUserNames({...userNames, [key]: e.target.value})} 
                      className="h-6 text-xs bg-slate-800/50 border-cyan-500/30 px-2"
                      style={{ color: hex }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-sm font-medium" style={{ color: hex }}>
                      {userNames[key] || label}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Queue Panel */}
      <div 
        className="flex-1 rounded-xl backdrop-blur-md overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)',
          border: '1px solid rgba(249, 158, 11, 0.3)',
          boxShadow: '0 0 20px rgba(249, 158, 11, 0.1)',
        }}
      >
        <div 
          className="px-4 py-2 border-b flex items-center justify-between"
          style={{ 
            borderColor: 'rgba(249, 158, 11, 0.2)',
            background: 'linear-gradient(90deg, transparent, rgba(249, 158, 11, 0.1), transparent)'
          }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Fila de Pedidos
          </h3>
          <span 
            className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ 
              backgroundColor: 'rgba(249, 158, 11, 0.2)',
              color: '#f59e0b',
            }}
          >
            {activeOrders.length}
          </span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {activeOrders.length === 0 ? (
              <div className="text-amber-400/50 text-xs text-center py-8">
                Nenhum pedido ativo
              </div>
            ) : (
              activeOrders.map((order, index) => {
                const color = getUserColor(order.assigned_user?.username);
                const isSelected = selectedOrder?.id === order.id;
                
                return (
                  <button
                    key={order.id}
                    onClick={() => onSelectOrder(isSelected ? null : order)}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all duration-300 text-left ${
                      isSelected ? 'ring-1 ring-white/50' : 'hover:bg-white/5'
                    }`}
                    style={{
                      background: isSelected ? `${color}15` : 'transparent',
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ 
                        backgroundColor: `${color}30`,
                        color: color,
                        boxShadow: `0 0 8px ${color}40`
                      }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-cyan-100 truncate font-medium">
                        {order.patient_name}
                      </div>
                      <div className="text-[10px] text-cyan-400/50 truncate">
                        OS: {order.order_number}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Selected Order Details */}
      {selectedOrder && !isEditMode && (
        <div 
          className="rounded-xl backdrop-blur-md overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)',
            border: `1px solid ${getUserColor(selectedOrder.assigned_user?.username)}50`,
            boxShadow: `0 0 20px ${getUserColor(selectedOrder.assigned_user?.username)}20`,
          }}
        >
          <div 
            className="px-4 py-2 border-b"
            style={{ 
              borderColor: `${getUserColor(selectedOrder.assigned_user?.username)}20`,
              background: `linear-gradient(90deg, transparent, ${getUserColor(selectedOrder.assigned_user?.username)}10, transparent)`
            }}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: getUserColor(selectedOrder.assigned_user?.username) }}>
              Detalhes do Pedido
            </h3>
          </div>
          <div className="p-3 space-y-2">
            <div className="text-sm text-cyan-100 font-medium">{selectedOrder.patient_name}</div>
            <div className="text-xs text-cyan-400/70">OS: {selectedOrder.order_number}</div>
            <div className="text-xs text-cyan-400/70">Status: {selectedOrder.status}</div>
            {selectedOrder.assigned_user?.username && (
              <div className="text-xs" style={{ color: getUserColor(selectedOrder.assigned_user.username) }}>
                Responsável: {selectedOrder.assigned_user.username}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Station Panel */}
      {isEditMode && selectedStation && (
        <div 
          className="rounded-xl backdrop-blur-md overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)',
            border: '1px solid rgba(217, 70, 239, 0.3)',
            boxShadow: '0 0 20px rgba(217, 70, 239, 0.1)',
          }}
        >
          <div 
            className="px-4 py-2 border-b"
            style={{ 
              borderColor: 'rgba(217, 70, 239, 0.2)',
              background: 'linear-gradient(90deg, transparent, rgba(217, 70, 239, 0.1), transparent)'
            }}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-fuchsia-400">
              Editar Estação
            </h3>
          </div>
          <div className="p-3 space-y-3">
            <Input
              value={selectedStation.title}
              onChange={(e) => onUpdateStation({ title: e.target.value })}
              placeholder="Título"
              className="h-8 text-xs bg-slate-800/50 border-fuchsia-500/30 text-fuchsia-100"
            />
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded-md transition-all hover:scale-110 ${
                    selectedStation.color === color ? 'ring-2 ring-white scale-110' : ''
                  }`}
                  style={{ 
                    backgroundColor: color,
                    boxShadow: `0 0 10px ${color}60`
                  }}
                  onClick={() => onUpdateStation({ color })}
                />
              ))}
            </div>
            <Button 
              variant="destructive" 
              size="sm" 
              className="w-full h-7 text-xs bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30" 
              onClick={onDeleteStation}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Excluir Estação
            </Button>
          </div>
        </div>
      )}

      {/* Selected Person Details */}
      {selectedPerson && !isEditMode && (
        <div 
          className="rounded-xl backdrop-blur-md overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)',
            border: `1px solid ${USER_COLORS[selectedPerson]?.hex || '#22d3ee'}50`,
            boxShadow: `0 0 20px ${USER_COLORS[selectedPerson]?.hex || '#22d3ee'}20`,
          }}
        >
          <div 
            className="px-4 py-2 border-b"
            style={{ 
              borderColor: `${USER_COLORS[selectedPerson]?.hex || '#22d3ee'}20`,
              background: `linear-gradient(90deg, transparent, ${USER_COLORS[selectedPerson]?.hex || '#22d3ee'}10, transparent)`
            }}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: USER_COLORS[selectedPerson]?.hex || '#22d3ee' }}>
              {userNames[selectedPerson]} - Detalhes
            </h3>
          </div>
          <div className="p-3 space-y-2">
            <div className="text-xs text-cyan-100/70">
              Pedidos ativos: <span className="font-bold text-white">{getOrdersByUser(selectedPerson).length}</span>
            </div>
            <div className="space-y-1">
              {getOrdersByUser(selectedPerson).slice(0, 5).map((order, index) => (
                <button
                  key={order.id}
                  onClick={() => onSelectOrder(order)}
                  className="w-full text-left text-[10px] text-cyan-100/60 truncate hover:text-cyan-100 transition-colors p-1 rounded hover:bg-white/5"
                >
                  #{index + 1} - {order.patient_name}
                </button>
              ))}
              {getOrdersByUser(selectedPerson).length > 5 && (
                <div className="text-[10px]" style={{ color: USER_COLORS[selectedPerson]?.hex }}>
                  +{getOrdersByUser(selectedPerson).length - 5} mais...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
