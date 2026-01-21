import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit3, Check, Plus, RotateCcw, Package, Maximize2, Minimize2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Session } from "@supabase/supabase-js";
import { Production3DScene } from "@/components/production/Production3DScene";
import { ProductionSidebar } from "@/components/production/ProductionSidebar";

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

const USER_COLORS: Record<string, { hex: string }> = {
  carneiro: { hex: "#22d3ee" },
  alexandre: { hex: "#d946ef" },
  henrique: { hex: "#f59e0b" },
};

const getUserColor = (username: string | null | undefined) => {
  if (!username) return "#9ca3af";
  const normalizedName = username.toLowerCase();
  return USER_COLORS[normalizedName]?.hex || "#9ca3af";
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
  const [selectedStation, setSelectedStation] = useState<StationConfig | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleSelectOrder = (order: Order | null) => {
    setSelectedOrder(order);
  };
  
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

  const handleDeleteStation = () => {
    if (selectedStation) {
      setStations(stations.filter(s => s.id !== selectedStation.id));
      setSelectedStation(null);
    }
  };

  const handleStationUpdate = (updates: Partial<StationConfig>) => {
    if (selectedStation) {
      setStations(stations.map(s => s.id === selectedStation.id ? { ...s, ...updates } : s));
      setSelectedStation({ ...selectedStation, ...updates });
    }
  };

  const completedOrders = orders.filter(order => 
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
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col overflow-hidden relative">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between p-4 flex-shrink-0 relative z-10 border-b border-cyan-500/20">
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
        
        <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400 bg-clip-text text-transparent">
          PRODUÇÃO 3D
        </h1>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-cyan-400 border-cyan-500/50 hover:bg-cyan-400/20 backdrop-blur-sm"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExitDialogOpen(true)}
            className="text-emerald-400 border-emerald-500/50 hover:bg-emerald-400/20 backdrop-blur-sm"
          >
            <Package className="h-4 w-4 mr-1" />
            Finalizados ({completedOrders.length})
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 relative z-10">
        {/* Left Sidebar */}
        {!isFullscreen && (
          <ProductionSidebar
            orders={orders}
            selectedPerson={selectedPerson}
            onSelectPerson={setSelectedPerson}
            selectedOrder={selectedOrder}
            onSelectOrder={handleSelectOrder}
            userNames={userNames}
            setUserNames={setUserNames}
            isEditMode={isEditMode}
            selectedStation={selectedStation}
            onUpdateStation={handleStationUpdate}
            onDeleteStation={handleDeleteStation}
          />
        )}

        {/* 3D Scene */}
        <div className="flex-1 relative">
          <div 
            className="absolute inset-2 rounded-xl overflow-hidden"
            style={{
              border: '2px solid rgba(34, 211, 238, 0.3)',
              boxShadow: '0 0 40px rgba(34, 211, 238, 0.1), inset 0 0 60px rgba(34, 211, 238, 0.05)',
            }}
          >
            <Production3DScene
              orders={orders}
              selectedPerson={selectedPerson}
              onSelectPerson={setSelectedPerson}
              onSelectOrder={handleSelectOrder}
              userNames={userNames}
            />
          </div>

          {/* 3D Scene Controls Hint */}
          <div 
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full backdrop-blur-md text-xs text-cyan-400/70"
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(34, 211, 238, 0.2)',
            }}
          >
            🖱️ Arraste para rotacionar • Scroll para zoom • Clique nos elementos para selecionar
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
                completedOrders.map((order, index) => {
                  const hex = getUserColor(order.assigned_user?.username);
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
    </div>
  );
}
