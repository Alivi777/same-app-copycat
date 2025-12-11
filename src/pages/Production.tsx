import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Session } from "@supabase/supabase-js";

// User colors mapping - matching the sketch
const USER_COLORS: Record<string, { bg: string; text: string }> = {
  carneiro: { bg: "bg-blue-500", text: "text-blue-600" },
  alexandre: { bg: "bg-purple-500", text: "text-purple-600" },
  henrique: { bg: "bg-amber-700", text: "text-amber-700" },
};

const getUserColor = (username: string | null | undefined): string => {
  if (!username) return "bg-gray-400";
  const normalizedName = username.toLowerCase();
  return USER_COLORS[normalizedName]?.bg || "bg-gray-400";
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
  const colorClass = getUserColor(username);
  
  return (
    <div 
      className={`w-7 h-7 rounded-full ${colorClass} flex items-center justify-center text-white text-xs font-bold shadow-md cursor-pointer hover:scale-110 transition-transform border-2 border-white`}
      title={`#${index + 1} - ${order.patient_name}\nOS: ${order.order_number}\nResponsável: ${username || 'Não atribuído'}`}
    >
      {index + 1}
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-gray-600 hover:bg-gray-100">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Painel
        </Button>
      </div>

      <div className="flex gap-8">
        {/* Left Side - User Legend + Orders List */}
        <div className="w-52 flex-shrink-0 space-y-6">
          {/* User Legend */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="8" r="4"/>
                <path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
              </svg>
              <span className="font-medium text-gray-800">CARNEIRO</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="8" r="4"/>
                <path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
              </svg>
              <span className="font-medium text-gray-800">ALEXANDRE</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-amber-700" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="8" r="4"/>
                <path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
              </svg>
              <span className="font-medium text-gray-800">HENRIQUE</span>
            </div>
          </div>

          {/* Orders List */}
          <div className="border-2 border-gray-800 p-3">
            <h3 className="font-bold text-gray-800 mb-2">LISTA DE PEDIDOS</h3>
            <ScrollArea className="h-[300px]">
              <div className="space-y-1 text-sm">
                {activeOrders.map(({ order, index }) => (
                  <div key={order.id} className="text-gray-700">
                    {index + 1}. {order.patient_name}
                  </div>
                ))}
                {activeOrders.length === 0 && (
                  <>
                    <div className="text-gray-400">1. EXEMPLO</div>
                    <div className="text-gray-400">2.</div>
                    <div className="text-gray-400">3.</div>
                    <div className="text-gray-400">4.</div>
                    <div className="text-gray-400">5.</div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main Floor Plan */}
        <div className="flex-1">
          <div className="border-2 border-gray-800 relative" style={{ aspectRatio: '1.4/1' }}>
            {/* Top Section - Area de Projeto */}
            <div className="absolute top-0 left-0 right-[280px] h-[35%] border-b-2 border-r-2 border-gray-800">
              <div className="text-xs font-bold text-gray-800 text-center pt-1">ÁREA DE PROJETO</div>
              
              {/* User workstations */}
              <div className="flex justify-center gap-4 mt-2 px-4">
                {/* Carneiro desk */}
                <div className="flex flex-col items-center">
                  <svg className="w-5 h-5 text-blue-600 mb-1" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
                  </svg>
                  <div className="border-2 border-gray-800 w-16 h-10 flex items-center justify-center gap-1 flex-wrap p-1">
                    {getOrdersByUser("carneiro").map(({ order, index }) => (
                      <OrderChip key={order.id} order={order} index={index} />
                    ))}
                  </div>
                </div>
                
                {/* Alexandre desk */}
                <div className="flex flex-col items-center">
                  <svg className="w-5 h-5 text-purple-600 mb-1" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
                  </svg>
                  <div className="border-2 border-gray-800 w-16 h-10 flex items-center justify-center gap-1 flex-wrap p-1">
                    {getOrdersByUser("alexandre").map(({ order, index }) => (
                      <OrderChip key={order.id} order={order} index={index} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right side workstation in project area */}
            <div className="absolute top-[8%] right-[200px] flex flex-col items-center">
              <svg className="w-5 h-5 text-amber-700 mb-1" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="8" r="4"/>
                <path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
              </svg>
              <div className="border-2 border-gray-800 w-16 h-10 flex items-center justify-center gap-1 flex-wrap p-1">
                {getOrdersByUser("henrique").map(({ order, index }) => (
                  <OrderChip key={order.id} order={order} index={index} />
                ))}
              </div>
            </div>

            {/* Fresadora */}
            <div className="absolute top-[5%] right-[100px] w-[90px] h-[60px] border-2 border-gray-800 flex flex-col">
              <div className="text-[10px] font-bold text-gray-800 text-center">FRESADORA</div>
              <div className="flex-1 flex items-center justify-center gap-1 flex-wrap p-1">
                {getOrdersByStation("fresadora").map(({ order, index }) => (
                  <OrderChip key={order.id} order={order} index={index} />
                ))}
              </div>
            </div>

            {/* Vazado */}
            <div className="absolute top-[5%] right-[5px] w-[90px] h-[90px] border-2 border-gray-800 flex flex-col">
              <div className="text-xs font-bold text-gray-800 text-center pt-2">VAZADO</div>
              <div className="flex-1 flex items-center justify-center gap-1 flex-wrap p-1">
                {getOrdersByStation("vazado").map(({ order, index }) => (
                  <OrderChip key={order.id} order={order} index={index} />
                ))}
              </div>
            </div>

            {/* Middle Left - Small workstation */}
            <div className="absolute top-[40%] left-[10%] w-14 h-14 border-2 border-gray-800 flex items-center justify-center">
              {/* Door/entrance symbol */}
            </div>

            {/* Area de Espera */}
            <div className="absolute top-[35%] left-[25%] w-[35%] h-[40%] border-2 border-gray-800 flex flex-col">
              <div className="text-sm font-bold text-gray-800 text-center pt-4">ÁREA DE</div>
              <div className="text-sm font-bold text-gray-800 text-center">ESPERA</div>
              <div className="flex-1 flex items-center justify-center gap-2 flex-wrap p-3">
                {getOrdersByStation("espera").map(({ order, index }) => (
                  <OrderChip key={order.id} order={order} index={index} />
                ))}
              </div>
            </div>

            {/* Vertical line on the right */}
            <div className="absolute top-[30%] right-[95px] w-0.5 h-[45%] bg-gray-800"></div>

            {/* Bottom Row */}
            {/* Saída */}
            <div 
              className="absolute bottom-[5%] left-[5%] cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExitDialogOpen(true)}
            >
              <div className="text-sm font-bold text-gray-800 flex items-center gap-1">
                SAÍDA
                {completedOrders.length > 0 && (
                  <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {completedOrders.length}
                  </span>
                )}
              </div>
              {/* Door symbol */}
              <div className="flex items-center mt-1">
                <div className="w-8 h-0.5 bg-gray-800"></div>
                <div className="w-1 h-4 bg-gray-800"></div>
              </div>
            </div>

            {/* Maquiagem */}
            <div className="absolute bottom-[5%] left-[25%] w-[35%] h-[18%] border-2 border-gray-800 flex flex-col">
              <div className="text-xs font-bold text-gray-800 text-center pt-1">MAQUIAGEM</div>
              <div className="flex-1 flex items-center justify-center gap-1 flex-wrap p-1">
                {getOrdersByStation("maquiagem").map(({ order, index }) => (
                  <OrderChip key={order.id} order={order} index={index} />
                ))}
              </div>
            </div>

            {/* Pureto */}
            <div className="absolute bottom-[5%] right-[5px] w-[160px] h-[18%] border-2 border-gray-800 flex flex-col">
              <div className="text-xs font-bold text-gray-800 text-center pt-1">PURETO</div>
              <div className="flex-1 flex items-center justify-center gap-1 flex-wrap p-1">
                {getOrdersByStation("pureto").map(({ order, index }) => (
                  <OrderChip key={order.id} order={order} index={index} />
                ))}
              </div>
            </div>
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
                <p className="text-gray-500 text-sm text-center py-4">
                  Nenhum trabalho finalizado ainda.
                </p>
              ) : (
                completedOrders.map(({ order, index }) => (
                  <div 
                    key={order.id} 
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full ${getUserColor(order.assigned_user?.username)} flex items-center justify-center text-white text-sm font-bold`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{order.patient_name}</div>
                      <div className="text-xs text-gray-500">OS: {order.order_number}</div>
                    </div>
                    <div className="text-xs text-gray-500">
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
