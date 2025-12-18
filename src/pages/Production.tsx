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
      className={`w-6 h-6 rounded-full ${bg} ${glow} flex items-center justify-center text-white text-[9px] font-bold cursor-pointer hover:scale-125 transition-all duration-300 border border-white/40`}
      title={`#${index + 1} - ${order.patient_name}\nOS: ${order.order_number}\nResponsável: ${username || 'Não atribuído'}`}
    >
      {index + 1}
    </div>
  );
};

// Circuit Board Background Pattern
const CircuitBackground = () => (
  <div className="absolute inset-0 overflow-hidden">
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="circuitPattern" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
          {/* Main traces */}
          <path d="M0 60h30l10-10h20l10 10h50" stroke="rgba(6,182,212,0.3)" strokeWidth="2" fill="none">
            <animate attributeName="stroke-dasharray" values="0,200;200,0" dur="4s" repeatCount="indefinite"/>
          </path>
          <path d="M60 0v30l10 10v20l-10 10v50" stroke="rgba(217,70,239,0.3)" strokeWidth="2" fill="none">
            <animate attributeName="stroke-dasharray" values="0,200;200,0" dur="5s" repeatCount="indefinite"/>
          </path>
          
          {/* Junction points */}
          <circle cx="30" cy="60" r="3" fill="rgba(6,182,212,0.5)">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="60" cy="30" r="3" fill="rgba(217,70,239,0.5)">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="2.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="90" cy="60" r="3" fill="rgba(245,158,11,0.5)">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.8s" repeatCount="indefinite"/>
          </circle>
          <circle cx="60" cy="90" r="3" fill="rgba(34,197,94,0.5)">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="2.2s" repeatCount="indefinite"/>
          </circle>
          
          {/* Small traces */}
          <path d="M70 60h20" stroke="rgba(6,182,212,0.2)" strokeWidth="1" fill="none"/>
          <path d="M60 70v20" stroke="rgba(217,70,239,0.2)" strokeWidth="1" fill="none"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#circuitPattern)"/>
    </svg>
  </div>
);

// Floating Data Particles
const DataParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(30)].map((_, i) => (
      <div
        key={i}
        className={`absolute rounded-full ${i % 3 === 0 ? 'bg-cyan-400' : i % 3 === 1 ? 'bg-fuchsia-400' : 'bg-amber-400'}`}
        style={{
          width: `${2 + Math.random() * 3}px`,
          height: `${2 + Math.random() * 3}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          opacity: 0.4,
          animation: `floatParticle ${5 + Math.random() * 5}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 3}s`,
        }}
      />
    ))}
  </div>
);

// Neon User Avatar
const UserAvatar = ({ color, name, isActive = false }: { color: string; name: string; isActive?: boolean }) => {
  const colorClasses = {
    cyan: "text-cyan-400 bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.5)]",
    fuchsia: "text-fuchsia-400 bg-fuchsia-500/20 border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.5)]",
    amber: "text-amber-400 bg-amber-500/20 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.5)]",
  };

  return (
    <div className={`flex items-center gap-2 ${isActive ? 'animate-pulse' : ''}`}>
      <div className={`w-5 h-5 rounded-full border-2 ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center`}>
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="8" r="4"/>
          <path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
        </svg>
      </div>
      <span className={`font-mono text-xs tracking-wider ${color === 'cyan' ? 'text-cyan-400' : color === 'fuchsia' ? 'text-fuchsia-400' : 'text-amber-400'}`}>
        {name}
      </span>
    </div>
  );
};

// 3D Isometric Station Component
const IsometricStation = ({ 
  title, 
  children, 
  className = "",
  style = {},
  glowColor = "cyan"
}: { 
  title: string; 
  children: React.ReactNode; 
  className?: string;
  style?: React.CSSProperties;
  glowColor?: "cyan" | "fuchsia" | "amber" | "green";
}) => {
  const glowStyles = {
    cyan: { borderColor: 'rgba(6,182,212,0.6)', boxShadow: '0 0 20px rgba(6,182,212,0.3), inset 0 0 30px rgba(6,182,212,0.1)' },
    fuchsia: { borderColor: 'rgba(217,70,239,0.6)', boxShadow: '0 0 20px rgba(217,70,239,0.3), inset 0 0 30px rgba(217,70,239,0.1)' },
    amber: { borderColor: 'rgba(245,158,11,0.6)', boxShadow: '0 0 20px rgba(245,158,11,0.3), inset 0 0 30px rgba(245,158,11,0.1)' },
    green: { borderColor: 'rgba(34,197,94,0.6)', boxShadow: '0 0 20px rgba(34,197,94,0.3), inset 0 0 30px rgba(34,197,94,0.1)' },
  };

  const textColors = {
    cyan: 'text-cyan-300',
    fuchsia: 'text-fuchsia-300',
    amber: 'text-amber-300',
    green: 'text-green-300',
  };

  return (
    <div 
      className={`absolute bg-slate-900/90 backdrop-blur-md border-2 rounded-lg overflow-hidden transition-all duration-300 hover:scale-[1.02] ${className}`}
      style={{ ...glowStyles[glowColor], ...style }}
    >
      {/* Top bar with screen effect */}
      <div className="relative">
        <div className={`text-[10px] font-bold ${textColors[glowColor]} text-center py-1.5 tracking-[0.15em] uppercase bg-gradient-to-r from-transparent via-white/5 to-transparent`}>
          <span className="drop-shadow-[0_0_8px_currentColor]">{title}</span>
        </div>
        {/* Screen scanline effect */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_2px] pointer-events-none opacity-50" />
      </div>
      
      {/* Content area */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap p-2 min-h-[40px]">
        {children}
      </div>
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l opacity-80" style={{ borderColor: glowStyles[glowColor].borderColor }} />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r opacity-80" style={{ borderColor: glowStyles[glowColor].borderColor }} />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l opacity-80" style={{ borderColor: glowStyles[glowColor].borderColor }} />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r opacity-80" style={{ borderColor: glowStyles[glowColor].borderColor }} />
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
          <span className="text-lg font-mono tracking-wider">INICIALIZANDO SISTEMA...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-indigo-950/50 to-slate-950 flex flex-col overflow-hidden relative">
      {/* Background circuit pattern */}
      <CircuitBackground />
      <DataParticles />
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/50 pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between p-3 relative z-10 flex-shrink-0">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/admin")} 
          className="text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 border border-cyan-500/30 backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="font-mono tracking-wide text-xs">VOLTAR</span>
        </Button>
        
        <div className="flex items-center gap-2 text-cyan-400">
          <Zap className="w-4 h-4 animate-pulse" />
          <span className="font-mono text-xs tracking-[0.2em] drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">LABORATÓRIO 3D</span>
          <Zap className="w-4 h-4 animate-pulse" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-3 pt-0 relative z-10 min-h-0">
        
        {/* Left Panel - Operators & Orders */}
        <div className="w-44 flex-shrink-0 flex flex-col gap-3">
          {/* Operators Panel */}
          <div className="bg-slate-900/70 backdrop-blur-md border border-cyan-500/30 rounded-xl p-3 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            <div className="space-y-2">
              <UserAvatar color="cyan" name="CARNEIRO" isActive={getOrdersByUser("carneiro").length > 0} />
              <UserAvatar color="fuchsia" name="ALEXANDRE" isActive={getOrdersByUser("alexandre").length > 0} />
              <UserAvatar color="amber" name="HENRIQUE" isActive={getOrdersByUser("henrique").length > 0} />
            </div>
          </div>

          {/* Orders List Panel */}
          <div className="flex-1 bg-slate-900/70 backdrop-blur-md border border-cyan-500/30 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col min-h-0">
            <div className="text-[10px] font-bold text-cyan-400 p-2 tracking-[0.1em] text-center border-b border-cyan-500/30 bg-cyan-500/5">
              LISTA DE PEDIDOS
            </div>
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1 text-xs font-mono">
                {activeOrders.slice(0, 10).map(({ order, index }) => {
                  const { bg, glow } = getUserColor(order.assigned_user?.username);
                  return (
                    <div 
                      key={order.id} 
                      className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 transition-all"
                    >
                      <div className={`w-4 h-4 rounded-full ${bg} ${glow} flex items-center justify-center text-white text-[8px] font-bold`}>
                        {index + 1}
                      </div>
                      <span className="text-gray-400 text-[10px] truncate">{order.patient_name}</span>
                    </div>
                  );
                })}
                {activeOrders.length > 10 && (
                  <div className="text-gray-500 text-center text-[10px] py-1">
                    +{activeOrders.length - 10} mais...
                  </div>
                )}
                {activeOrders.length === 0 && (
                  <div className="text-gray-600 text-center py-3 text-[10px] animate-pulse">
                    Aguardando...
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* 3D Isometric Floor Plan */}
        <div className="flex-1 relative min-h-0">
          {/* Main container with 3D perspective */}
          <div 
            className="relative w-full h-full rounded-xl overflow-hidden border-2 border-cyan-500/40 bg-slate-900/50 backdrop-blur-sm"
            style={{
              perspective: '1000px',
              boxShadow: '0 0 60px rgba(6,182,212,0.2), inset 0 0 100px rgba(6,182,212,0.05)'
            }}
          >
            {/* Floor plane with isometric transform */}
            <div 
              className="absolute inset-4"
              style={{
                transform: 'rotateX(55deg) rotateZ(-45deg) scale(0.85)',
                transformOrigin: 'center center',
                transformStyle: 'preserve-3d'
              }}
            >
              {/* Floor base */}
              <div 
                className="absolute inset-0 rounded-xl border-2 border-cyan-500/50 bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-indigo-950/90"
                style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 0 40px rgba(6,182,212,0.1)' }}
              >
                {/* Floor grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:40px_40px] rounded-xl" />
                
                {/* Circuit traces on floor */}
                <svg className="absolute inset-0 w-full h-full opacity-40">
                  <path d="M50% 50% L20% 30%" stroke="rgba(6,182,212,0.4)" strokeWidth="2" fill="none">
                    <animate attributeName="stroke-dasharray" values="0,500;500,0" dur="3s" repeatCount="indefinite"/>
                  </path>
                  <path d="M50% 50% L80% 30%" stroke="rgba(217,70,239,0.4)" strokeWidth="2" fill="none">
                    <animate attributeName="stroke-dasharray" values="0,500;500,0" dur="4s" repeatCount="indefinite"/>
                  </path>
                  <path d="M50% 50% L30% 80%" stroke="rgba(245,158,11,0.4)" strokeWidth="2" fill="none">
                    <animate attributeName="stroke-dasharray" values="0,500;500,0" dur="3.5s" repeatCount="indefinite"/>
                  </path>
                  <path d="M50% 50% L70% 80%" stroke="rgba(34,197,94,0.4)" strokeWidth="2" fill="none">
                    <animate attributeName="stroke-dasharray" values="0,500;500,0" dur="2.5s" repeatCount="indefinite"/>
                  </path>
                </svg>
              </div>
            </div>

            {/* Floating UI Panels (not transformed, positioned on top) */}
            
            {/* ÁREA DE PROJETO - Top */}
            <IsometricStation
              title="ÁREA DE PROJETO"
              className="w-[200px] h-[90px]"
              style={{ top: '5%', left: '25%' }}
              glowColor="cyan"
            >
              <div className="flex gap-3">
                {/* Carneiro */}
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-cyan-500/30 border border-cyan-500 flex items-center justify-center mb-1">
                    <svg className="w-2.5 h-2.5 text-cyan-400" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
                    </svg>
                  </div>
                  <div className="flex gap-0.5 flex-wrap justify-center max-w-[50px]">
                    {getOrdersByUser("carneiro").map(({ order, index }) => (
                      <OrderChip key={order.id} order={order} index={index} />
                    ))}
                  </div>
                </div>
                {/* Alexandre */}
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-fuchsia-500/30 border border-fuchsia-500 flex items-center justify-center mb-1">
                    <svg className="w-2.5 h-2.5 text-fuchsia-400" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
                    </svg>
                  </div>
                  <div className="flex gap-0.5 flex-wrap justify-center max-w-[50px]">
                    {getOrdersByUser("alexandre").map(({ order, index }) => (
                      <OrderChip key={order.id} order={order} index={index} />
                    ))}
                  </div>
                </div>
                {/* Henrique */}
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-amber-500/30 border border-amber-500 flex items-center justify-center mb-1">
                    <svg className="w-2.5 h-2.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
                    </svg>
                  </div>
                  <div className="flex gap-0.5 flex-wrap justify-center max-w-[50px]">
                    {getOrdersByUser("henrique").map(({ order, index }) => (
                      <OrderChip key={order.id} order={order} index={index} />
                    ))}
                  </div>
                </div>
              </div>
            </IsometricStation>

            {/* FRESADORA - Top Right */}
            <IsometricStation
              title="FRESADORA"
              className="w-[80px] h-[70px]"
              style={{ top: '5%', right: '15%' }}
              glowColor="cyan"
            >
              <div className="flex gap-1 flex-wrap justify-center">
                {getOrdersByStation("fresadora").map(({ order, index }) => (
                  <OrderChip key={order.id} order={order} index={index} />
                ))}
              </div>
            </IsometricStation>

            {/* VAZADO - Top Right Corner */}
            <IsometricStation
              title="VAZADO"
              className="w-[70px] h-[70px]"
              style={{ top: '5%', right: '2%' }}
              glowColor="fuchsia"
            >
              <div className="flex gap-1 flex-wrap justify-center">
                {getOrdersByStation("vazado").map(({ order, index }) => (
                  <OrderChip key={order.id} order={order} index={index} />
                ))}
              </div>
            </IsometricStation>

            {/* ÁREA DE ESPERA - Center */}
            <IsometricStation
              title="ÁREA DE ESPERA"
              className="w-[180px] h-[120px]"
              style={{ top: '35%', left: '50%', transform: 'translateX(-50%)' }}
              glowColor="cyan"
            >
              <div className="flex gap-1.5 flex-wrap justify-center items-center p-1">
                {getOrdersByStation("espera").map(({ order, index }) => (
                  <div key={order.id} className="relative">
                    <div className="absolute -top-1 -left-1 text-[8px] text-cyan-400/50 font-mono">
                      {index + 1}
                    </div>
                    <OrderChip order={order} index={index} />
                  </div>
                ))}
              </div>
            </IsometricStation>

            {/* MAQUIAGEM - Bottom Center */}
            <IsometricStation
              title="MAQUIAGEM"
              className="w-[140px] h-[60px]"
              style={{ bottom: '12%', left: '35%' }}
              glowColor="fuchsia"
            >
              <div className="flex gap-1 flex-wrap justify-center">
                {getOrdersByStation("maquiagem").map(({ order, index }) => (
                  <OrderChip key={order.id} order={order} index={index} />
                ))}
              </div>
            </IsometricStation>

            {/* PURETO - Bottom Right */}
            <IsometricStation
              title="PURETO"
              className="w-[100px] h-[60px]"
              style={{ bottom: '12%', right: '8%' }}
              glowColor="amber"
            >
              <div className="flex gap-1 flex-wrap justify-center">
                {getOrdersByStation("pureto").map(({ order, index }) => (
                  <OrderChip key={order.id} order={order} index={index} />
                ))}
              </div>
            </IsometricStation>

            {/* SAÍDA - Bottom Left */}
            <div 
              className="absolute cursor-pointer group"
              style={{ bottom: '12%', left: '8%' }}
              onClick={() => setExitDialogOpen(true)}
            >
              <div className="relative bg-slate-900/90 backdrop-blur-md border-2 rounded-lg px-4 py-3 transition-all duration-300 hover:scale-105"
                   style={{ borderColor: 'rgba(34,197,94,0.6)', boxShadow: '0 0 25px rgba(34,197,94,0.4)' }}>
                <div className="text-[10px] font-bold text-green-300 tracking-[0.1em] drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]">
                  ▼ SAÍDA
                </div>
                {completedOrders.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]">
                    {completedOrders.length}
                  </span>
                )}
              </div>
            </div>

            {/* Connecting circuit lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60">
              <defs>
                <linearGradient id="circuitGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(6,182,212,0.6)"/>
                  <stop offset="100%" stopColor="rgba(217,70,239,0.6)"/>
                </linearGradient>
              </defs>
              
              {/* Vertical connection */}
              <line x1="50%" y1="28%" x2="50%" y2="35%" stroke="url(#circuitGradient1)" strokeWidth="2" strokeDasharray="5,5">
                <animate attributeName="stroke-dashoffset" values="0;10" dur="1s" repeatCount="indefinite"/>
              </line>
              
              {/* Bottom connection */}
              <line x1="50%" y1="65%" x2="50%" y2="75%" stroke="url(#circuitGradient1)" strokeWidth="2" strokeDasharray="5,5">
                <animate attributeName="stroke-dashoffset" values="0;10" dur="1s" repeatCount="indefinite"/>
              </line>
            </svg>

            {/* Holographic frame corners */}
            <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-cyan-500/60 rounded-tl-lg" />
            <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-cyan-500/60 rounded-tr-lg" />
            <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-cyan-500/60 rounded-bl-lg" />
            <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-cyan-500/60 rounded-br-lg" />
          </div>
        </div>
      </div>

      {/* Exit Dialog */}
      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent className="max-w-lg bg-slate-900/95 backdrop-blur-xl border-2 border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
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

      {/* Floating animation keyframes */}
      <style>{`
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          25% { transform: translateY(-15px) translateX(8px); opacity: 0.6; }
          50% { transform: translateY(-8px) translateX(-8px); opacity: 0.5; }
          75% { transform: translateY(-20px) translateX(5px); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
