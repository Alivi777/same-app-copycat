import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Edit3, Check, Plus, Trash2, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Rnd } from "react-rnd";
import type { Session } from "@supabase/supabase-js";

// User colors mapping - neon style
const USER_COLORS: Record<string, { bg: string; glow: string; text: string }> = {
  carneiro: { bg: "bg-cyan-400", glow: "shadow-cyan-400/50", text: "text-cyan-400" },
  alexandre: { bg: "bg-purple-400", glow: "shadow-purple-400/50", text: "text-purple-400" },
  henrique: { bg: "bg-amber-400", glow: "shadow-amber-400/50", text: "text-amber-400" },
};

const PRESET_COLORS = [
  "#22d3ee", "#a855f7", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899", "#84cc16"
];

const getUserColor = (username: string | null | undefined): { bg: string; glow: string } => {
  if (!username) return { bg: "bg-gray-400", glow: "shadow-gray-400/50" };
  const normalizedName = username.toLowerCase();
  return USER_COLORS[normalizedName] || { bg: "bg-gray-400", glow: "shadow-gray-400/50" };
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
  const { bg, glow } = getUserColor(username);
  
  return (
    <div 
      className={`w-6 h-6 rounded-full ${bg} flex items-center justify-center text-slate-900 text-[10px] font-bold shadow-lg ${glow} cursor-pointer hover:scale-110 transition-all border-2 border-white/30 ${isEditMode ? 'pointer-events-none' : ''}`}
      title={`#${index + 1} - ${order.patient_name}\nOS: ${order.order_number}\nResponsável: ${username || 'Não atribuído'}`}
    >
      {index + 1}
    </div>
  );
};

const DEFAULT_STATIONS: StationConfig[] = [
  { id: "projeto", title: "Área de Projeto", x: 0, y: 0, width: 400, height: 120, color: "#22d3ee", stationType: "projeto" },
  { id: "fresadora", title: "Fresadora", x: 420, y: 0, width: 120, height: 55, color: "#22d3ee", stationType: "fresadora" },
  { id: "vazado", title: "Vazado", x: 420, y: 65, width: 120, height: 55, color: "#22d3ee", stationType: "vazado" },
  { id: "espera", title: "Área de Espera", x: 100, y: 140, width: 250, height: 100, color: "#22d3ee", stationType: "espera" },
  { id: "maquiagem", title: "Maquiagem", x: 100, y: 260, width: 180, height: 70, color: "#22d3ee", stationType: "maquiagem" },
  { id: "pureto", title: "Pureto", x: 300, y: 260, width: 180, height: 70, color: "#22d3ee", stationType: "pureto" },
  { id: "saida", title: "Saída", x: 0, y: 260, width: 80, height: 70, color: "#10b981", stationType: "saida" },
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
        <div className="text-cyan-400 animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4 flex flex-col overflow-hidden relative">
      {/* Circuit pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="circuit" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 10 H8 M12 10 H20 M10 0 V8 M10 12 V20" stroke="currentColor" strokeWidth="0.5" fill="none" className="text-cyan-400"/>
              <circle cx="10" cy="10" r="2" fill="currentColor" className="text-cyan-400"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit)"/>
        </svg>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0 relative z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-cyan-400 hover:bg-cyan-400/10 border border-cyan-500/30">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <div className="flex gap-2">
          {isEditMode && (
            <>
              <Button variant="outline" size="sm" onClick={handleAddStation} className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-400/10">
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetLayout} className="text-amber-400 border-amber-500/30 hover:bg-amber-400/10">
                <RotateCcw className="h-4 w-4 mr-1" /> Reset
              </Button>
            </>
          )}
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            onClick={handleToggleEditMode}
            className={isEditMode ? "bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold" : "text-cyan-400 border-cyan-500/30 hover:bg-cyan-400/10"}
          >
            {isEditMode ? <><Check className="h-4 w-4 mr-1" /> Salvar</> : <><Edit3 className="h-4 w-4 mr-1" /> Editar</>}
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0 relative z-10">
        {/* Left Sidebar */}
        <div className="w-44 flex-shrink-0 space-y-3 flex flex-col">
          {/* User Legend */}
          <div className={`space-y-2 bg-slate-800/50 rounded-lg p-3 border border-cyan-500/20 ${isEditMode ? 'ring-2 ring-cyan-400/50' : ''}`}>
            {Object.entries(USER_COLORS).map(([key, colors]) => (
              <div key={key} className="flex items-center gap-2">
                <svg className={`w-5 h-5 ${colors.text} flex-shrink-0`} viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
                </svg>
                {isEditMode ? (
                  <Input value={userNames[key]} onChange={(e) => setUserNames({...userNames, [key]: e.target.value})} className={`${colors.text} text-xs bg-slate-700/50 border-cyan-500/50 h-6 px-1`} />
                ) : (
                  <span className={`font-bold ${colors.text} text-xs uppercase`}>{userNames[key]}</span>
                )}
              </div>
            ))}
          </div>

          {/* Orders List */}
          <div className="bg-slate-800/50 rounded-lg p-3 flex-1 min-h-0 flex flex-col border border-cyan-500/20">
            <h3 className="font-bold text-cyan-300 mb-2 text-xs uppercase">Lista de Pedidos</h3>
            <ScrollArea className="flex-1">
              <div className="space-y-0.5 text-[10px]">
                {activeOrders.length === 0 ? (
                  <div className="text-cyan-400/50">1. EXEMPLO</div>
                ) : (
                  activeOrders.map(({ order, index }) => (
                    <div key={order.id} className="text-cyan-100/80">{index + 1}. {order.patient_name}</div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Edit Panel */}
          {isEditMode && selectedStation && (
            <div className="bg-slate-800/80 rounded-lg p-3 border border-cyan-500/30 space-y-2">
              <h4 className="text-cyan-300 text-xs font-bold">Editar Estação</h4>
              <Input
                value={stations.find(s => s.id === selectedStation)?.title || ''}
                onChange={(e) => handleStationUpdate(selectedStation, { title: e.target.value })}
                placeholder="Título"
                className="h-7 text-xs bg-slate-700/50 border-cyan-500/50 text-cyan-100"
              />
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    className={`w-5 h-5 rounded border-2 ${stations.find(s => s.id === selectedStation)?.color === color ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleStationUpdate(selectedStation, { color })}
                  />
                ))}
              </div>
              <Button variant="destructive" size="sm" className="w-full h-7 text-xs" onClick={() => handleDeleteStation(selectedStation)}>
                <Trash2 className="h-3 w-3 mr-1" /> Excluir
              </Button>
            </div>
          )}
        </div>

        {/* Main Floor Plan */}
        <div className="flex-1 min-h-0">
          <div className="relative h-full bg-slate-800/30 rounded-xl border-2 border-cyan-500/40 shadow-2xl shadow-cyan-500/10 overflow-hidden">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
            
            <div className="relative w-full h-full p-2">
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
                    className={`w-full h-full rounded-lg border-2 backdrop-blur-sm flex flex-col overflow-hidden transition-all ${
                      selectedStation === station.id ? 'ring-2 ring-white shadow-lg' : ''
                    } ${isEditMode ? 'hover:ring-2 hover:ring-cyan-400/50' : ''}`}
                    style={{ 
                      borderColor: `${station.color}50`,
                      backgroundColor: `${station.color}10`
                    }}
                    onClick={(e) => {
                      if (!isEditMode && station.stationType === 'saida') {
                        setExitDialogOpen(true);
                      }
                    }}
                  >
                    <div 
                      className="text-center py-1 text-xs font-bold uppercase tracking-wide"
                      style={{ color: station.color }}
                    >
                      {station.title}
                      {!isEditMode && station.stationType === 'saida' && completedOrders.length > 0 && (
                        <span className="ml-2 bg-emerald-500 text-slate-900 text-[10px] px-1.5 py-0.5 rounded-full">{completedOrders.length}</span>
                      )}
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center gap-1 flex-wrap p-1 overflow-hidden">
                      {station.stationType === 'projeto' ? (
                        <div className="flex gap-4 justify-center w-full">
                          {Object.entries(USER_COLORS).map(([key, colors]) => (
                            <div key={key} className="flex flex-col items-center gap-1">
                              <svg className={`w-4 h-4 ${colors.text}`} viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
                              </svg>
                              <div className="bg-slate-700/50 border border-current rounded px-1 py-0.5 min-w-[40px] min-h-[24px] flex items-center justify-center gap-0.5 flex-wrap" style={{ borderColor: `${colors.text.includes('cyan') ? '#22d3ee' : colors.text.includes('purple') ? '#a855f7' : '#f59e0b'}30` }}>
                                {getOrdersByUser(key).map(({ order, index }) => (
                                  <OrderChip key={order.id} order={order} index={index} isEditMode={isEditMode} />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        getOrdersByStation(station.stationType).map(({ order, index }) => (
                          <OrderChip key={order.id} order={order} index={index} isEditMode={isEditMode} />
                        ))
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
        <DialogContent className="max-w-lg bg-slate-900 border border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-cyan-300">
              <Package className="h-5 w-5" />
              Trabalhos Finalizados ({completedOrders.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {completedOrders.length === 0 ? (
                <p className="text-cyan-400/50 text-sm text-center py-4">Nenhum trabalho finalizado.</p>
              ) : (
                completedOrders.map(({ order, index }) => {
                  const { bg, glow } = getUserColor(order.assigned_user?.username);
                  return (
                    <div key={order.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-cyan-500/10">
                      <div className={`w-8 h-8 rounded-full ${bg} ${glow} shadow-lg flex items-center justify-center text-slate-900 text-sm font-bold`}>{index + 1}</div>
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
    </div>
  );
}
