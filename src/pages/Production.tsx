import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Session } from "@supabase/supabase-js";

// User colors mapping
const USER_COLORS: Record<string, string> = {
  carneiro: "bg-blue-500",
  alexandre: "bg-purple-500",
  henrique: "bg-amber-700",
};

const getUserColor = (username: string | null | undefined): string => {
  if (!username) return "bg-gray-400";
  const normalizedName = username.toLowerCase();
  return USER_COLORS[normalizedName] || "bg-gray-400";
};

// Status to station mapping
const getStation = (status: string, hasAssignedUser: boolean): string => {
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
  const colorClass = getUserColor(username);
  
  return (
    <div 
      className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-white text-xs font-bold shadow-md cursor-pointer hover:scale-110 transition-transform`}
      title={`#${index + 1} - ${order.patient_name}\nOS: ${order.order_number}\nResponsável: ${username || 'Não atribuído'}`}
    >
      {index + 1}
    </div>
  );
};

interface WorkStationProps {
  title: string;
  orders: { order: Order; index: number }[];
  className?: string;
  onClick?: () => void;
  isClickable?: boolean;
  count?: number;
}

const WorkStation = ({ title, orders, className = "", onClick, isClickable = false, count }: WorkStationProps) => {
  return (
    <div 
      className={`bg-card/80 backdrop-blur-sm border border-border rounded-lg p-3 ${className} ${isClickable ? 'cursor-pointer hover:bg-card/90 transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center justify-between">
        <span>{title}</span>
        {count !== undefined && (
          <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px]">
            {count}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 min-h-[40px]">
        {orders.map(({ order, index }) => (
          <OrderChip key={order.id} order={order} index={index} />
        ))}
      </div>
    </div>
  );
};

interface UserBenchProps {
  username: string;
  orders: { order: Order; index: number }[];
  colorClass: string;
}

const UserBench = ({ username, orders, colorClass }: UserBenchProps) => {
  return (
    <div className="bg-card/60 border border-border rounded-lg p-2 min-w-[100px]">
      <div className={`text-xs font-bold mb-2 px-2 py-1 rounded ${colorClass} text-white text-center`}>
        {username}
      </div>
      <div className="flex flex-wrap gap-1.5 min-h-[36px] justify-center">
        {orders.map(({ order, index }) => (
          <OrderChip key={order.id} order={order} index={index} />
        ))}
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

  // Create indexed orders (index based on arrival order)
  const indexedOrders = orders.map((order, index) => ({ order, index }));

  // Filter orders by station
  const getOrdersByStation = (station: string) => {
    return indexedOrders.filter(({ order }) => {
      const orderStation = getStation(order.status, !!order.assigned_to);
      return orderStation === station;
    });
  };

  // Get orders by user for project area
  const getOrdersByUser = (username: string) => {
    return indexedOrders.filter(({ order }) => {
      const station = getStation(order.status, !!order.assigned_to);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-xl font-bold text-white">Visualização da Produção</h1>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-white/70">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span>Carneiro</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
            <span>Alexandre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-amber-700"></div>
            <span>Henrique</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-gray-400"></div>
            <span>Não atribuído</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-100px)]">
        {/* Left Sidebar - Orders List */}
        <div className="w-48 bg-card/50 backdrop-blur-sm border border-border rounded-lg p-3 flex-shrink-0">
          <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wide">Lista de Pedidos</h3>
          <ScrollArea className="h-[calc(100%-40px)]">
            <div className="space-y-1.5 pr-2">
              {activeOrders.map(({ order, index }) => (
                <div 
                  key={order.id} 
                  className="flex items-center gap-2 text-xs p-1.5 rounded bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <div className={`w-5 h-5 rounded-full ${getUserColor(order.assigned_user?.username)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                    {index + 1}
                  </div>
                  <span className="text-foreground truncate">{order.patient_name}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main Production Floor */}
        <div className="flex-1 relative">
          {/* Background Image */}
          <div 
            className="absolute inset-0 opacity-20 bg-contain bg-center bg-no-repeat rounded-lg"
            style={{ backgroundImage: 'url(/planta-lab.png)' }}
          />
          
          {/* Production Layout Grid */}
          <div className="relative z-10 h-full grid grid-cols-4 grid-rows-3 gap-3 p-3">
            {/* Row 1: Projeto Area (spans 2 cols), Fresadora, Vazado */}
            <div className="col-span-2 bg-card/70 backdrop-blur-sm border border-border rounded-lg p-3">
              <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Área de Projeto
              </div>
              <div className="flex gap-3 justify-center flex-wrap">
                <UserBench 
                  username="Carneiro" 
                  orders={getOrdersByUser("carneiro")} 
                  colorClass="bg-blue-500"
                />
                <UserBench 
                  username="Alexandre" 
                  orders={getOrdersByUser("alexandre")} 
                  colorClass="bg-purple-500"
                />
                <UserBench 
                  username="Henrique" 
                  orders={getOrdersByUser("henrique")} 
                  colorClass="bg-amber-700"
                />
              </div>
            </div>
            
            <WorkStation 
              title="Fresadora" 
              orders={getOrdersByStation("fresadora")} 
              className="bg-orange-500/20 border-orange-500/30"
            />
            
            <WorkStation 
              title="Vazado" 
              orders={getOrdersByStation("vazado")} 
              className="bg-cyan-500/20 border-cyan-500/30"
            />

            {/* Row 2: Área de Espera (spans 3 cols), empty space */}
            <div className="col-span-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Área de Espera
              </div>
              <div className="flex flex-wrap gap-2 min-h-[60px]">
                {getOrdersByStation("espera").map(({ order, index }) => (
                  <OrderChip key={order.id} order={order} index={index} />
                ))}
              </div>
            </div>
            
            <div className="row-span-2"></div>

            {/* Row 3: Saída, Maquiagem, Pureto */}
            <WorkStation 
              title="Saída" 
              orders={[]}
              className="bg-green-500/20 border-green-500/30 cursor-pointer hover:bg-green-500/30"
              onClick={() => setExitDialogOpen(true)}
              isClickable={true}
              count={completedOrders.length}
            />
            
            <WorkStation 
              title="Maquiagem" 
              orders={getOrdersByStation("maquiagem")} 
              className="bg-pink-500/20 border-pink-500/30"
            />
            
            <WorkStation 
              title="Pureto" 
              orders={getOrdersByStation("pureto")} 
              className="bg-indigo-500/20 border-indigo-500/30"
            />
          </div>
        </div>
      </div>

      {/* Exit Dialog - Shows completed orders */}
      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Trabalhos Finalizados ({completedOrders.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {completedOrders.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  Nenhum trabalho finalizado ainda.
                </p>
              ) : (
                completedOrders.map(({ order, index }) => (
                  <div 
                    key={order.id} 
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full ${getUserColor(order.assigned_user?.username)} flex items-center justify-center text-white text-sm font-bold`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{order.patient_name}</div>
                      <div className="text-xs text-muted-foreground">OS: {order.order_number}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.assigned_user?.username || 'N/A'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
