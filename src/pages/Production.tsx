import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Cpu, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Session } from "@supabase/supabase-js";

// User colors mapping - neon style
const USER_COLORS: Record<string, { bg: string; glow: string; text: string }> = {
  carneiro: { bg: "bg-cyan-500", glow: "shadow-[0_0_15px_rgba(6,182,212,0.8)]", text: "text-cyan-400" },
  alexandre: { bg: "bg-fuchsia-500", glow: "shadow-[0_0_15px_rgba(217,70,239,0.8)]", text: "text-fuchsia-400" },
  henrique: { bg: "bg-amber-500", glow: "shadow-[0_0_15px_rgba(245,158,11,0.8)]", text: "text-amber-400" },
};

const getUserColor = (username: string | null | undefined): { bg: string; glow: string } => {
  if (!username) return { bg: "bg-gray-500", glow: "shadow-[0_0_10px_rgba(156,163,175,0.5)]" };
  const normalizedName = username.toLowerCase();
  return USER_COLORS[normalizedName] || { bg: "bg-gray-500", glow: "shadow-[0_0_10px_rgba(156,163,175,0.5)]" };
};

// Status to station mapping
const getStation = (status: string): string => {
  switch (status) {
    case "pending":
      return "espera";
    case "in-progress":
    case "projetando":
      return "projeto";
    case "projetado":
      return "fresadora";
    case "fresado-definitivo":
    case "maquiagem":
      return "maquiagem";
    case "fresado-provisorio":
      return "saida";
    case "vazado":
      return "vazado";
    case "pureto":
      return "pureto";
    case "completed":
    case "entregue-provisorio":
      return "saida";
    default:
      return "espera";
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

interface OrderChipProps {
  order: Order;
  index: number;
}

const OrderChip = ({ order, index }: OrderChipProps) => {
  const username = order.assigned_user?.username;
  const { bg, glow } = getUserColor(username);
  
  return (
    <div 
      className={`w-7 h-7 rounded-full ${bg} ${glow} flex items-center justify-center text-white text-[10px] font-bold cursor-pointer hover:scale-125 transition-all duration-300 border-2 border-white/30 animate-pulse`}
      title={`#${index + 1} - ${order.patient_name}\nOS: ${order.order_number}\nResponsável: ${username || 'Não atribuído'}`}
    >
      {index + 1}
    </div>
  );
};

// Animated Circuit Pattern
const CircuitPattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
        <path d="M10 10h20v0h10M40 10v20M40 30h20M60 30v20M60 50h20M80 50v20M80 70h10" 
              stroke="currentColor" strokeWidth="1" fill="none" className="text-cyan-500">
          <animate attributeName="stroke-dasharray" values="0,200;200,0" dur="3s" repeatCount="indefinite"/>
        </path>
        <circle cx="10" cy="10" r="2" className="fill-cyan-500">
          <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="40" cy="30" r="2" className="fill-fuchsia-500">
          <animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite"/>
        </circle>
        <circle cx="80" cy="70" r="2" className="fill-amber-500">
          <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite"/>
        </circle>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#circuit)"/>
  </svg>
);

// Floating Particles
const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 2}s`,
        }}
      />
    ))}
  </div>
);

// Neon User Icon
const NeonUserIcon = ({ color, isActive = false }: { color: string; isActive?: boolean }) => (
  <div className={`relative ${isActive ? 'animate-pulse' : ''}`}>
    <svg className={`w-6 h-6 ${color} drop-shadow-[0_0_8px_currentColor]`} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="8" r="4"/>
      <path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
    </svg>
    {isActive && (
      <div className={`absolute inset-0 ${color} blur-md opacity-50`}>
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="8" r="4"/>
          <path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
        </svg>
      </div>
    )}
  </div>
);

// Station Panel Component
const StationPanel = ({ 
  title, 
  children, 
  className = "",
  glowColor = "cyan"
}: { 
  title: string; 
  children: React.ReactNode; 
  className?: string;
  glowColor?: "cyan" | "fuchsia" | "amber" | "green";
}) => {
  const glowClasses = {
    cyan: "shadow-[0_0_20px_rgba(6,182,212,0.3)] border-cyan-500/50",
    fuchsia: "shadow-[0_0_20px_rgba(217,70,239,0.3)] border-fuchsia-500/50",
    amber: "shadow-[0_0_20px_rgba(245,158,11,0.3)] border-amber-500/50",
    green: "shadow-[0_0_20px_rgba(34,197,94,0.3)] border-green-500/50",
  };

  const titleColors = {
    cyan: "text-cyan-400",
    fuchsia: "text-fuchsia-400",
    amber: "text-amber-400",
    green: "text-green-400",
  };

  return (
    <div className={`relative bg-slate-900/80 backdrop-blur-sm border-2 ${glowClasses[glowColor]} rounded-lg overflow-hidden ${className}`}>
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-current opacity-60" style={{ borderColor: glowColor === 'cyan' ? '#06b6d4' : glowColor === 'fuchsia' ? '#d946ef' : glowColor === 'amber' ? '#f59e0b' : '#22c55e' }} />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-current opacity-60" style={{ borderColor: glowColor === 'cyan' ? '#06b6d4' : glowColor === 'fuchsia' ? '#d946ef' : glowColor === 'amber' ? '#f59e0b' : '#22c55e' }} />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-current opacity-60" style={{ borderColor: glowColor === 'cyan' ? '#06b6d4' : glowColor === 'fuchsia' ? '#d946ef' : glowColor === 'amber' ? '#f59e0b' : '#22c55e' }} />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-current opacity-60" style={{ borderColor: glowColor === 'cyan' ? '#06b6d4' : glowColor === 'fuchsia' ? '#d946ef' : glowColor === 'amber' ? '#f59e0b' : '#22c55e' }} />
      
      <div className={`text-[9px] font-bold ${titleColors[glowColor]} text-center py-1 tracking-widest uppercase border-b border-current/20`}>
        <span className="drop-shadow-[0_0_5px_currentColor]">{title}</span>
      </div>
      <div className="flex-1 flex items-center justify-center gap-1 flex-wrap p-2">
        {children}
      </div>
    </div>
  );
};

export default function Production() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      setSession(session);

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();

      if (!roles) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta página.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      fetchOrders();
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    // Subscribe to real-time updates
    const channel = supabase
      .channel('production-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [navigate, toast]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          patient_name,
          status,
          assigned_to,
          delivery_deadline,
          created_at,
          assigned_user:profiles!orders_assigned_to_fkey(username)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create indexed orders
  const indexedOrders = orders.map((order, index) => ({ order, index }));

  // Filter orders by station
  const getOrdersByStation = (station: string) => {
    return indexedOrders.filter(({ order }) => {
      const orderStation = getStation(order.status);
      return orderStation === station;
    });
  };

  // Get orders by user for project area
  const getOrdersByUser = (username: string) => {
    return indexedOrders.filter(({ order }) => {
      const station = getStation(order.status);
      const assignedUsername = order.assigned_user?.username?.toLowerCase();
      return station === "projeto" && assignedUsername === username.toLowerCase();
    });
  };

  // Active orders (not completed)
  const activeOrders = indexedOrders.filter(({ order }) => 
    order.status !== 'completed' && order.status !== 'entregue-provisorio' && order.status !== 'fresado-provisorio'
  );

  // Completed orders for exit dialog
  const completedOrders = indexedOrders.filter(({ order }) => 
    order.status === 'completed' || order.status === 'entregue-provisorio' || order.status === 'fresado-provisorio'
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-cyan-400">
          <Cpu className="w-8 h-8 animate-spin" />
          <span className="text-lg font-mono tracking-wider">CARREGANDO SISTEMA...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 flex flex-col overflow-hidden relative">
      {/* Background effects */}
      <CircuitPattern />
      <FloatingParticles />
      
      {/* Scanline effect */}
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-30" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0 relative z-10">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/admin")} 
          className="text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 border border-cyan-500/30 backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="font-mono tracking-wide">VOLTAR</span>
        </Button>
        
        <div className="flex items-center gap-2 text-cyan-400">
          <Zap className="w-5 h-5 animate-pulse" />
          <span className="font-mono text-sm tracking-widest">PLANTA LAB 3D</span>
          <Zap className="w-5 h-5 animate-pulse" />
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0 relative z-10">
        {/* Left Side - User Legend + Orders List */}
        <div className="w-48 flex-shrink-0 space-y-3 flex flex-col">
          {/* User Legend */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-3 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <div className="text-xs font-bold text-cyan-400 mb-2 tracking-widest text-center border-b border-cyan-500/30 pb-2">
              OPERADORES
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-1.5 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors group">
                <NeonUserIcon color="text-cyan-400" isActive={getOrdersByUser("carneiro").length > 0} />
                <span className="font-mono text-cyan-400 text-sm tracking-wider group-hover:drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">CARNEIRO</span>
              </div>
              <div className="flex items-center gap-3 p-1.5 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors group">
                <NeonUserIcon color="text-fuchsia-400" isActive={getOrdersByUser("alexandre").length > 0} />
                <span className="font-mono text-fuchsia-400 text-sm tracking-wider group-hover:drop-shadow-[0_0_5px_rgba(217,70,239,0.8)]">ALEXANDRE</span>
              </div>
              <div className="flex items-center gap-3 p-1.5 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors group">
                <NeonUserIcon color="text-amber-400" isActive={getOrdersByUser("henrique").length > 0} />
                <span className="font-mono text-amber-400 text-sm tracking-wider group-hover:drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]">HENRIQUE</span>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 rounded-lg flex-1 min-h-0 flex flex-col shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <div className="text-xs font-bold text-cyan-400 p-2 tracking-widest text-center border-b border-cyan-500/30">
              FILA DE ORDENS
            </div>
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1 text-xs font-mono">
                {activeOrders.map(({ order, index }) => {
                  const { bg, glow } = getUserColor(order.assigned_user?.username);
                  return (
                    <div 
                      key={order.id} 
                      className={`flex items-center gap-2 p-1.5 rounded bg-slate-800/50 hover:bg-slate-800 transition-all hover:translate-x-1`}
                    >
                      <div className={`w-5 h-5 rounded-full ${bg} ${glow} flex items-center justify-center text-white text-[8px] font-bold`}>
                        {index + 1}
                      </div>
                      <span className="text-gray-300 truncate">{order.patient_name}</span>
                    </div>
                  );
                })}
                {activeOrders.length === 0 && (
                  <div className="text-gray-500 text-center py-4 animate-pulse">
                    AGUARDANDO DADOS...
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main Floor Plan */}
        <div className="flex-1 min-h-0">
          <div className="relative h-full bg-slate-900/60 backdrop-blur-sm border-2 border-cyan-500/40 rounded-xl shadow-[0_0_40px_rgba(6,182,212,0.2)] overflow-hidden">
            {/* Grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
            
            {/* Top Section - Area de Projeto */}
            <div className="absolute top-2 left-2 right-[180px] h-[32%] bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-cyan-500/40 rounded-lg shadow-[0_0_25px_rgba(6,182,212,0.15)]">
              <div className="text-[10px] font-bold text-cyan-400 text-center pt-1 tracking-[0.2em] drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
                ◈ ÁREA DE PROJETO ◈
              </div>
              
              {/* User workstations */}
              <div className="flex justify-center gap-4 mt-2 px-2">
                {/* Carneiro desk */}
                <div className="flex flex-col items-center group">
                  <NeonUserIcon color="text-cyan-400" isActive={getOrdersByUser("carneiro").length > 0} />
                  <div className="text-[8px] text-cyan-400/70 font-mono mb-1">CARNEIRO</div>
                  <div className="border border-cyan-500/50 rounded-lg w-16 h-10 flex items-center justify-center gap-1 flex-wrap p-1 bg-slate-800/60 shadow-[inset_0_0_10px_rgba(6,182,212,0.1)]">
                    {getOrdersByUser("carneiro").map(({ order, index }) => (
                      <OrderChip key={order.id} order={order} index={index} />
                    ))}
                  </div>
                </div>
                
                {/* Alexandre desk */}
                <div className="flex flex-col items-center group">
                  <NeonUserIcon color="text-fuchsia-400" isActive={getOrdersByUser("alexandre").length > 0} />
                  <div className="text-[8px] text-fuchsia-400/70 font-mono mb-1">ALEXANDRE</div>
                  <div className="border border-fuchsia-500/50 rounded-lg w-16 h-10 flex items-center justify-center gap-1 flex-wrap p-1 bg-slate-800/60 shadow-[inset_0_0_10px_rgba(217,70,239,0.1)]">
                    {getOrdersByUser("alexandre").map(({ order, index }) => (
                      <OrderChip key={order.id} order={order} index={index} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right side workstation in project area - Henrique */}
            <div className="absolute top-[10%] right-[125px] flex flex-col items-center">
              <NeonUserIcon color="text-amber-400" isActive={getOrdersByUser("henrique").length > 0} />
              <div className="text-[8px] text-amber-400/70 font-mono mb-1">HENRIQUE</div>
              <div className="border border-amber-500/50 rounded-lg w-14 h-9 flex items-center justify-center gap-1 flex-wrap p-1 bg-slate-800/60 shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]">
                {getOrdersByUser("henrique").map(({ order, index }) => (
                  <OrderChip key={order.id} order={order} index={index} />
                ))}
              </div>
            </div>

            {/* Fresadora */}
            <StationPanel 
              title="⚙ FRESADORA" 
              className="absolute top-2 right-[70px] w-[55px] h-[60px]"
              glowColor="cyan"
            >
              {getOrdersByStation("fresadora").map(({ order, index }) => (
                <OrderChip key={order.id} order={order} index={index} />
              ))}
            </StationPanel>

            {/* Vazado - Top Right Corner */}
            <StationPanel 
              title="◉ VAZADO" 
              className="absolute top-2 right-2 w-[60px] h-[80px] z-10"
              glowColor="fuchsia"
            >
              {getOrdersByStation("vazado").map(({ order, index }) => (
                <OrderChip key={order.id} order={order} index={index} />
              ))}
            </StationPanel>

            {/* Area de Espera */}
            <StationPanel 
              title="◇ ÁREA DE ESPERA ◇" 
              className="absolute top-[36%] left-[18%] w-[40%] h-[38%]"
              glowColor="cyan"
            >
              {getOrdersByStation("espera").map(({ order, index }) => (
                <OrderChip key={order.id} order={order} index={index} />
              ))}
            </StationPanel>

            {/* Connector lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(6,182,212,0.5)" />
                  <stop offset="50%" stopColor="rgba(217,70,239,0.5)" />
                  <stop offset="100%" stopColor="rgba(34,197,94,0.5)" />
                </linearGradient>
              </defs>
              {/* Vertical line */}
              <line x1="78%" y1="30%" x2="78%" y2="75%" stroke="url(#lineGradient)" strokeWidth="2" strokeDasharray="5,5">
                <animate attributeName="stroke-dashoffset" values="0;10" dur="1s" repeatCount="indefinite"/>
              </line>
            </svg>

            {/* Bottom Row */}
            {/* Saída */}
            <div 
              className="absolute bottom-3 left-3 cursor-pointer group"
              onClick={() => setExitDialogOpen(true)}
            >
              <div className="flex items-center gap-2 bg-gradient-to-r from-green-900/80 to-green-800/60 border border-green-500/50 rounded-lg px-3 py-2 shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all hover:scale-105">
                <div className="text-xs font-bold text-green-400 tracking-widest drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]">
                  ⬡ SAÍDA
                </div>
                {completedOrders.length > 0 && (
                  <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]">
                    {completedOrders.length}
                  </span>
                )}
              </div>
            </div>

            {/* Maquiagem */}
            <StationPanel 
              title="✧ MAQUIAGEM ✧" 
              className="absolute bottom-3 left-[18%] w-[40%] h-[16%]"
              glowColor="fuchsia"
            >
              {getOrdersByStation("maquiagem").map(({ order, index }) => (
                <OrderChip key={order.id} order={order} index={index} />
              ))}
            </StationPanel>

            {/* Pureto */}
            <StationPanel 
              title="△ PURETO △" 
              className="absolute bottom-3 right-2 w-[115px] h-[16%]"
              glowColor="amber"
            >
              {getOrdersByStation("pureto").map(({ order, index }) => (
                <OrderChip key={order.id} order={order} index={index} />
              ))}
            </StationPanel>

            {/* Small entrance indicator */}
            <div className="absolute top-[40%] left-[5%] w-10 h-10 border border-cyan-500/30 rounded-lg flex items-center justify-center bg-slate-800/40">
              <div className="text-cyan-400/60 text-lg">⬔</div>
            </div>
          </div>
        </div>
      </div>

      {/* Exit Dialog - Shows completed orders */}
      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent className="max-w-lg bg-slate-900 border border-green-500/50 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-400">
              <Package className="h-5 w-5" />
              <span className="font-mono tracking-wider">TRABALHOS FINALIZADOS ({completedOrders.length})</span>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {completedOrders.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4 font-mono">
                  NENHUM TRABALHO FINALIZADO.
                </p>
              ) : (
                completedOrders.map(({ order, index }) => {
                  const { bg, glow } = getUserColor(order.assigned_user?.username);
                  return (
                    <div 
                      key={order.id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-all border border-green-500/20"
                    >
                      <div className={`w-8 h-8 rounded-full ${bg} ${glow} flex items-center justify-center text-white text-sm font-bold`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-200">{order.patient_name}</div>
                        <div className="text-xs text-gray-500 font-mono">OS: {order.order_number}</div>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {order.assigned_user?.username || 'N/A'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* CSS for floating animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.6; }
          25% { transform: translateY(-10px) translateX(5px); opacity: 1; }
          50% { transform: translateY(-5px) translateX(-5px); opacity: 0.8; }
          75% { transform: translateY(-15px) translateX(3px); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
