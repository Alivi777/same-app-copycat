import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Edit3, Check, Plus, Trash2, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Rnd } from "react-rnd";
import type { Session } from "@supabase/supabase-js";
import { CyberpunkBackground } from "@/components/production/CyberpunkBackground";
import { AnimatedPerson3D } from "@/components/production/AnimatedPerson3D";
import { NeonControlPanel } from "@/components/production/NeonControlPanel";
import { ComputerWorkstation } from "@/components/production/ComputerWorkstation";

// User colors mapping - neon style
const USER_COLORS: Record<string, { bg: string; glow: string; text: string; hex: string }> = {
  carneiro: { bg: "bg-cyan-400", glow: "shadow-cyan-400/50", text: "text-cyan-400", hex: "#22d3ee" },
  alexandre: { bg: "bg-fuchsia-500", glow: "shadow-fuchsia-500/50", text: "text-fuchsia-500", hex: "#d946ef" },
  henrique: { bg: "bg-amber-400", glow: "shadow-amber-400/50", text: "text-amber-400", hex: "#f59e0b" },
};

const PRESET_COLORS = [
  "#22d3ee", "#d946ef", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899", "#84cc16"
];

const getUserColor = (username: string | null | undefined) => {
  if (!username) return { bg: "bg-gray-400", glow: "shadow-gray-400/50", hex: "#9ca3af" };
  const normalizedName = username.toLowerCase();
  return USER_COLORS[normalizedName] || { bg: "bg-gray-400", glow: "shadow-gray-400/50", hex: "#9ca3af" };
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
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  stationType: string;
}

interface OrderChipProps {
  order: Order;
  index: number;
  isEditMode?: boolean;
}

const OrderChip = ({ order, index, isEditMode }: OrderChipProps) => {
  const username = order.assigned_user?.username;
  const { bg, glow, hex } = getUserColor(username);
  
  return (
    <div 
      className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center text-slate-900 text-[10px] font-bold cursor-pointer hover:scale-125 transition-all duration-300 border-2 border-white/40 ${isEditMode ? 'pointer-events-none' : ''}`}
      style={{
        boxShadow: `0 0 15px ${hex}, 0 0 30px ${hex}40`,
      }}
      title={`#${index + 1} - ${order.patient_name}\nOS: ${order.order_number}\nResponsável: ${username || 'Não atribuído'}`}
    >
      {index + 1}
    </div>
  );
};

const DEFAULT_STATIONS: StationConfig[] = [
  { id: "projeto", title: "Área de Projeto", x: 0, y: 0, width: 500, height: 180, color: "#22d3ee", stationType: "projeto" },
  { id: "fresadora", title: "Fresadora", x: 520, y: 0, width: 140, height: 80, color: "#22d3ee", stationType: "fresadora" },
  { id: "vazado", title: "Vazado", x: 520, y: 100, width: 140, height: 80, color: "#d946ef", stationType: "vazado" },
  { id: "espera", title: "Área de Espera", x: 100, y: 200, width: 300, height: 100, color: "#f59e0b", stationType: "espera" },
  { id: "maquiagem", title: "Maquiagem", x: 100, y: 320, width: 200, height: 90, color: "#ec4899", stationType: "maquiagem" },
  { id: "pureto", title: "Pureto", x: 320, y: 320, width: 200, height: 90, color: "#8b5cf6", stationType: "pureto" },
  { id: "saida", title: "Saída", x: 0, y: 320, width: 80, height: 90, color: "#10b981", stationType: "saida" },
];

export default function Production() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  
  const [stations, setStations] = useState<StationConfig[]>(() => {
    const saved = localStorage.getItem('production-stations-v2');
    return saved ? JSON.parse(saved) : DEFAULT_STATIONS;
  });

  const [userNames, setUserNames] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('production-user-names');
    return saved ? JSON.parse(saved) : { carneiro: "CARNEIRO", alexandre: "ALEXANDRE", henrique: "HENRIQUE" };
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setSession(session);

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();

      if (!roles) {
        toast({ title: "Acesso negado", description: "Você não tem permissão para acessar esta página.", variant: "destructive" });
        navigate("/");
        return;
      }
      setIsAdmin(true);
      fetchOrders();
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/login");
    });

    const channel = supabase
      .channel('production-orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe();

    return () => { subscription.unsubscribe(); supabase.removeChannel(channel); };
  }, [navigate, toast]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`id, order_number, patient_name, status, assigned_to, delivery_deadline, created_at, assigned_user:profiles!orders_assigned_to_fkey(username)`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEditMode = () => {
    if (isEditMode) {
      localStorage.setItem('production-stations-v2', JSON.stringify(stations));
      localStorage.setItem('production-user-names', JSON.stringify(userNames));
      toast({ title: "Alterações salvas", description: "Layout salvo com sucesso." });
      setSelectedStation(null);
    }
    setIsEditMode(!isEditMode);
  };

  const handleResetLayout = () => {
    setStations(DEFAULT_STATIONS);
    localStorage.removeItem('production-stations-v2');
    toast({ title: "Layout resetado", description: "Layout restaurado para o padrão." });
  };

  const handleAddStation = () => {
    const newStation: StationConfig = {
      id: `station-${Date.now()}`,
      title: "Nova Estação",
      x: 50,
      y: 50,
      width: 150,
      height: 80,
      color: "#22d3ee",
      stationType: "custom"
    };
    setStations([...stations, newStation]);
  };

  const handleDeleteStation = (id: string) => {
    setStations(stations.filter(s => s.id !== id));
    setSelectedStation(null);
  };

  const handleStationUpdate = (id: string, updates: Partial<StationConfig>) => {
    setStations(stations.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const indexedOrders = orders.map((order, index) => ({ order, index }));
  
  const getOrdersByStation = (stationType: string) => {
    return indexedOrders.filter(({ order }) => getStation(order.status) === stationType);
  };

  const getOrdersByUser = (username: string) => {
    return indexedOrders.filter(({ order }) => {
      const station = getStation(order.status);
      const assignedUsername = order.assigned_user?.username?.toLowerCase();
      return station === "projeto" && assignedUsername === username.toLowerCase();
    });
  };

  const activeOrders = indexedOrders.filter(({ order }) => 
    !['completed', 'entregue-provisorio', 'fresado-provisorio'].includes(order.status)
  );

  const completedOrders = indexedOrders.filter(({ order }) => 
    ['completed', 'entregue-provisorio', 'fresado-provisorio'].includes(order.status)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-fuchsia-500/30 border-b-fuchsia-500 rounded-full animate-spin" style={{ animationDirection: 'reverse' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 flex flex-col overflow-hidden relative">
      {/* Animated Cyberpunk Background */}
      <CyberpunkBackground />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0 relative z-10">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/admin")} 
          className="text-cyan-400 hover:bg-cyan-400/20 border border-cyan-500/50 backdrop-blur-sm"
          style={{ boxShadow: '0 0 15px rgba(34, 211, 238, 0.2)' }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400 bg-clip-text text-transparent animate-pulse">
          PRODUÇÃO
        </h1>
        
        <div className="flex gap-2">
          {isEditMode && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddStation} 
                className="text-cyan-400 border-cyan-500/50 hover:bg-cyan-400/20 backdrop-blur-sm"
              >
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleResetLayout} 
                className="text-amber-400 border-amber-500/50 hover:bg-amber-400/20 backdrop-blur-sm"
              >
                <RotateCcw className="h-4 w-4 mr-1" /> Reset
              </Button>
            </>
          )}
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            onClick={handleToggleEditMode}
            className={isEditMode 
              ? "bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-600 hover:to-fuchsia-600 text-white font-bold border-0" 
              : "text-cyan-400 border-cyan-500/50 hover:bg-cyan-400/20 backdrop-blur-sm"
            }
            style={{ boxShadow: isEditMode ? '0 0 20px rgba(34, 211, 238, 0.4)' : undefined }}
          >
            {isEditMode ? <><Check className="h-4 w-4 mr-1" /> Salvar</> : <><Edit3 className="h-4 w-4 mr-1" /> Editar</>}
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0 relative z-10">
        {/* Left Sidebar */}
        <div className="w-52 flex-shrink-0 space-y-3 flex flex-col">
          {/* User Legend with 3D Avatars */}
          <NeonControlPanel title="Equipe" color="#22d3ee" isEditMode={isEditMode}>
            <div className="flex justify-around py-2">
              {Object.entries(USER_COLORS).map(([key, colors]) => (
                <div key={key} className="flex flex-col items-center gap-1">
                  {isEditMode ? (
                    <>
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${colors.hex}30`, border: `2px solid ${colors.hex}` }}
                      >
                        <span className="text-xs font-bold" style={{ color: colors.hex }}>
                          {userNames[key]?.charAt(0) || key.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <Input 
                        value={userNames[key]} 
                        onChange={(e) => setUserNames({...userNames, [key]: e.target.value})} 
                        className="text-[10px] bg-slate-800/50 border-cyan-500/30 h-5 px-1 w-16 text-center"
                        style={{ color: colors.hex }}
                      />
                    </>
                  ) : (
                    <AnimatedPerson3D
                      name={userNames[key]}
                      color={colors.text}
                      colorHex={colors.hex}
                      isSelected={selectedPerson === key}
                      onClick={() => setSelectedPerson(selectedPerson === key ? null : key)}
                      orderCount={getOrdersByUser(key).length}
                    />
                  )}
                </div>
              ))}
            </div>
          </NeonControlPanel>

          {/* Orders List */}
          <NeonControlPanel title="Fila de Pedidos" color="#f59e0b">
            <ScrollArea className="h-40">
              <div className="space-y-1">
                {activeOrders.length === 0 ? (
                  <div className="text-amber-400/50 text-xs text-center py-4">
                    Nenhum pedido ativo
                  </div>
                ) : (
                  activeOrders.map(({ order, index }) => {
                    const { hex } = getUserColor(order.assigned_user?.username);
                    return (
                      <div 
                        key={order.id} 
                        className="flex items-center gap-2 p-1.5 rounded-md transition-all hover:bg-white/5"
                        style={{ borderLeft: `3px solid ${hex}` }}
                      >
                        <div 
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{ 
                            backgroundColor: `${hex}30`,
                            color: hex,
                            boxShadow: `0 0 8px ${hex}40`
                          }}
                        >
                          {index + 1}
                        </div>
                        <span className="text-[10px] text-cyan-100/80 truncate flex-1">
                          {order.patient_name}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </NeonControlPanel>

          {/* Edit Panel */}
          {isEditMode && selectedStation && (
            <NeonControlPanel title="Editar Estação" color="#d946ef">
              <div className="space-y-2">
                <Input
                  value={stations.find(s => s.id === selectedStation)?.title || ''}
                  onChange={(e) => handleStationUpdate(selectedStation, { title: e.target.value })}
                  placeholder="Título"
                  className="h-7 text-xs bg-slate-800/50 border-fuchsia-500/30 text-fuchsia-100"
                />
                <div className="flex gap-1.5 flex-wrap">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded-md transition-all hover:scale-110 ${
                        stations.find(s => s.id === selectedStation)?.color === color 
                          ? 'ring-2 ring-white scale-110' 
                          : ''
                      }`}
                      style={{ 
                        backgroundColor: color,
                        boxShadow: `0 0 10px ${color}60`
                      }}
                      onClick={() => handleStationUpdate(selectedStation, { color })}
                    />
                  ))}
                </div>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="w-full h-7 text-xs bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30" 
                  onClick={() => handleDeleteStation(selectedStation)}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Excluir Estação
                </Button>
              </div>
            </NeonControlPanel>
          )}

          {/* Selected Person Info */}
          {selectedPerson && !isEditMode && (
            <NeonControlPanel title={`${userNames[selectedPerson]} - Detalhes`} color={USER_COLORS[selectedPerson]?.hex || "#22d3ee"}>
              <div className="space-y-2">
                <div className="text-xs text-cyan-100/70">
                  Pedidos ativos: <span className="font-bold text-white">{getOrdersByUser(selectedPerson).length}</span>
                </div>
                <div className="space-y-1">
                  {getOrdersByUser(selectedPerson).slice(0, 3).map(({ order, index }) => (
                    <div key={order.id} className="text-[10px] text-cyan-100/60 truncate">
                      #{index + 1} - {order.patient_name}
                    </div>
                  ))}
                  {getOrdersByUser(selectedPerson).length > 3 && (
                    <div className="text-[10px] text-cyan-400">
                      +{getOrdersByUser(selectedPerson).length - 3} mais...
                    </div>
                  )}
                </div>
              </div>
            </NeonControlPanel>
          )}
        </div>

        {/* Main Floor Plan */}
        <div className="flex-1 min-h-0">
          <div 
            className="relative h-full rounded-xl overflow-hidden backdrop-blur-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
              border: '2px solid rgba(34, 211, 238, 0.3)',
              boxShadow: '0 0 40px rgba(34, 211, 238, 0.1), inset 0 0 60px rgba(34, 211, 238, 0.05)',
            }}
          >
            {/* Grid overlay */}
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.3) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            
            <div className="relative w-full h-full p-3">
              {stations.map((station) => (
                <Rnd
                  key={station.id}
                  size={{ width: station.width, height: station.height }}
                  position={{ x: station.x, y: station.y }}
                  onDragStop={(e, d) => isEditMode && handleStationUpdate(station.id, { x: d.x, y: d.y })}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    if (isEditMode) {
                      handleStationUpdate(station.id, {
                        width: parseInt(ref.style.width),
                        height: parseInt(ref.style.height),
                        x: position.x,
                        y: position.y
                      });
                    }
                  }}
                  disableDragging={!isEditMode}
                  enableResizing={isEditMode}
                  bounds="parent"
                  onClick={() => isEditMode && setSelectedStation(station.id)}
                  className={`${isEditMode ? 'cursor-move' : ''}`}
                >
                  <div 
                    className={`w-full h-full rounded-xl backdrop-blur-md flex flex-col overflow-hidden transition-all duration-300 ${
                      selectedStation === station.id ? 'ring-2 ring-white' : ''
                    } ${isEditMode ? 'hover:ring-2 hover:ring-white/50' : ''}`}
                    style={{ 
                      border: `2px solid ${station.color}60`,
                      background: `linear-gradient(135deg, ${station.color}15 0%, ${station.color}05 100%)`,
                      boxShadow: `0 0 30px ${station.color}20, inset 0 1px 0 ${station.color}30`,
                    }}
                    onClick={(e) => {
                      if (!isEditMode && station.stationType === 'saida') {
                        setExitDialogOpen(true);
                      }
                    }}
                  >
                    {/* Station Header */}
                    <div 
                      className="text-center py-2 border-b flex items-center justify-center gap-2"
                      style={{ 
                        borderColor: `${station.color}30`,
                        background: `linear-gradient(90deg, transparent, ${station.color}10, transparent)`,
                      }}
                    >
                      <div 
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: station.color, boxShadow: `0 0 8px ${station.color}` }}
                      />
                      <span 
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: station.color, textShadow: `0 0 10px ${station.color}50` }}
                      >
                        {station.title}
                      </span>
                      {!isEditMode && station.stationType === 'saida' && completedOrders.length > 0 && (
                        <span 
                          className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{ 
                            backgroundColor: `${station.color}30`,
                            color: station.color,
                            boxShadow: `0 0 10px ${station.color}40`
                          }}
                        >
                          {completedOrders.length}
                        </span>
                      )}
                    </div>
                    
                    {/* Station Content */}
                    <div className="flex-1 flex items-center justify-center gap-2 flex-wrap p-3 overflow-hidden">
                      {station.stationType === 'projeto' ? (
                        <div className="flex gap-8 justify-center w-full items-end">
                          {Object.entries(USER_COLORS).map(([key, colors]) => {
                            const userOrders = getOrdersByUser(key);
                            const isUserSelected = selectedPerson === key;
                            return (
                              <div 
                                key={key} 
                                className={`flex flex-col items-center gap-2 transition-all duration-300 cursor-pointer ${
                                  isUserSelected ? 'scale-110' : 'hover:scale-105'
                                }`}
                                onClick={() => !isEditMode && setSelectedPerson(isUserSelected ? null : key)}
                              >
                                {/* Computer Workstation */}
                                <ComputerWorkstation
                                  colorHex={colors.hex}
                                  orders={userOrders}
                                  isSelected={isUserSelected}
                                />
                                
                                {/* 3D Person */}
                                <AnimatedPerson3D
                                  name={userNames[key]}
                                  color={colors.text}
                                  colorHex={colors.hex}
                                  isSelected={isUserSelected}
                                  onClick={() => {}}
                                  orderCount={userOrders.length}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex gap-2 flex-wrap justify-center">
                          {getOrdersByStation(station.stationType).map(({ order, index }) => (
                            <OrderChip key={order.id} order={order} index={index} isEditMode={isEditMode} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Rnd>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Exit Dialog */}
      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent 
          className="max-w-lg border-0"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            boxShadow: '0 0 40px rgba(16, 185, 129, 0.2)',
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <Package className="h-5 w-5" />
              Trabalhos Finalizados ({completedOrders.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {completedOrders.length === 0 ? (
                <p className="text-emerald-400/50 text-sm text-center py-4">Nenhum trabalho finalizado.</p>
              ) : (
                completedOrders.map(({ order, index }) => {
                  const { hex } = getUserColor(order.assigned_user?.username);
                  return (
                    <div 
                      key={order.id} 
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{
                        background: `linear-gradient(90deg, ${hex}10, transparent)`,
                        border: `1px solid ${hex}30`,
                      }}
                    >
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ 
                          backgroundColor: `${hex}30`,
                          color: hex,
                          boxShadow: `0 0 15px ${hex}40`
                        }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-cyan-100">{order.patient_name}</div>
                        <div className="text-xs text-cyan-400/50">OS: {order.order_number}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
