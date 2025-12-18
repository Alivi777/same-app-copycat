import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Edit3, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import type { Session } from "@supabase/supabase-js";

// User colors mapping - neon style
const USER_COLORS: Record<string, { bg: string; glow: string; text: string }> = {
  carneiro: { bg: "bg-cyan-400", glow: "shadow-cyan-400/50", text: "text-cyan-400" },
  alexandre: { bg: "bg-purple-400", glow: "shadow-purple-400/50", text: "text-purple-400" },
  henrique: { bg: "bg-amber-400", glow: "shadow-amber-400/50", text: "text-amber-400" },
};

const getUserColor = (username: string | null | undefined): { bg: string; glow: string } => {
  if (!username) return { bg: "bg-gray-400", glow: "shadow-gray-400/50" };
  const normalizedName = username.toLowerCase();
  return USER_COLORS[normalizedName] || { bg: "bg-gray-400", glow: "shadow-gray-400/50" };
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
  isEditMode?: boolean;
}

const OrderChip = ({ order, index, isEditMode }: OrderChipProps) => {
  const username = order.assigned_user?.username;
  const { bg, glow } = getUserColor(username);
  
  return (
    <div 
      className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center text-slate-900 text-xs font-bold shadow-lg ${glow} cursor-pointer hover:scale-110 transition-all border-2 border-white/30 ${isEditMode ? 'animate-pulse ring-2 ring-white cursor-move' : ''}`}
      title={`#${index + 1} - ${order.patient_name}\nOS: ${order.order_number}\nResponsável: ${username || 'Não atribuído'}`}
      draggable={isEditMode}
    >
      {index + 1}
    </div>
  );
};

interface StationBoxProps {
  title: string;
  stationKey: string;
  children: React.ReactNode;
  className?: string;
  isEditMode?: boolean;
  onTitleChange?: (key: string, newTitle: string) => void;
}

const StationBox = ({ title, stationKey, children, className = "", isEditMode, onTitleChange }: StationBoxProps) => {
  const [localTitle, setLocalTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTitle(e.target.value);
    onTitleChange?.(stationKey, e.target.value);
  };

  return (
    <div className={`relative ${className} ${isEditMode ? 'ring-2 ring-cyan-400 ring-opacity-50' : ''}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/80 to-slate-900/90 backdrop-blur-sm rounded-lg border border-cyan-500/30 shadow-lg shadow-cyan-500/10" />
      <div className="relative p-2 h-full flex flex-col">
        {isEditMode ? (
          <Input
            ref={inputRef}
            value={localTitle}
            onChange={handleTitleChange}
            className="text-cyan-300 font-bold text-xs text-center mb-1 tracking-wider uppercase bg-slate-700/50 border-cyan-500/50 h-6 px-1"
          />
        ) : (
          <div className="text-cyan-300 font-bold text-xs text-center mb-1 tracking-wider uppercase">{localTitle}</div>
        )}
        <div className="flex-1 flex items-center justify-center gap-1 flex-wrap">
          {children}
        </div>
      </div>
    </div>
  );
};

// Default station titles
const DEFAULT_STATION_TITLES: Record<string, string> = {
  projeto: "Área de Projeto",
  fresadora: "Fresadora",
  vazado: "Vazado",
  espera: "Área de Espera",
  maquiagem: "Maquiagem",
  pureto: "Pureto",
  saida: "Saída",
};

export default function Production() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [stationTitles, setStationTitles] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('production-station-titles');
    return saved ? JSON.parse(saved) : DEFAULT_STATION_TITLES;
  });
  const [userNames, setUserNames] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('production-user-names');
    return saved ? JSON.parse(saved) : { carneiro: "CARNEIRO", alexandre: "ALEXANDRE", henrique: "HENRIQUE" };
  });

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

  const handleToggleEditMode = () => {
    if (isEditMode) {
      // Save changes to localStorage
      localStorage.setItem('production-station-titles', JSON.stringify(stationTitles));
      localStorage.setItem('production-user-names', JSON.stringify(userNames));
      toast({
        title: "Alterações salvas",
        description: "Todas as modificações foram confirmadas e salvas.",
      });
    }
    setIsEditMode(!isEditMode);
  };

  const handleStationTitleChange = (key: string, newTitle: string) => {
    setStationTitles(prev => ({ ...prev, [key]: newTitle }));
  };

  const handleUserNameChange = (key: string, newName: string) => {
    setUserNames(prev => ({ ...prev, [key]: newName }));
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-cyan-400 animate-pulse">Carregando...</div>
      </div>
    );
  }

  const userColorKeys = Object.keys(USER_COLORS);

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4 flex flex-col overflow-hidden relative">
      {/* Circuit pattern background */}
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
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/admin")} 
          className="text-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300 border border-cyan-500/30"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Painel
        </Button>
        
        <Button
          variant={isEditMode ? "default" : "outline"}
          size="sm"
          onClick={handleToggleEditMode}
          className={isEditMode 
            ? "bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold" 
            : "text-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300 border border-cyan-500/30"
          }
        >
          {isEditMode ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Confirmar Edições
            </>
          ) : (
            <>
              <Edit3 className="h-4 w-4 mr-2" />
              Modo Edição
            </>
          )}
        </Button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0 relative z-10">
        {/* Left Side - User Legend + Orders List */}
        <div className="w-48 flex-shrink-0 space-y-3 flex flex-col">
          {/* User Legend */}
          <div className={`space-y-2 flex-shrink-0 bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-cyan-500/20 ${isEditMode ? 'ring-2 ring-cyan-400/50' : ''}`}>
            {userColorKeys.map((key) => {
              const colors = USER_COLORS[key];
              return (
                <div key={key} className="flex items-center gap-3">
                  <svg className={`w-6 h-6 ${colors.text} drop-shadow-lg flex-shrink-0`} viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
                  </svg>
                  {isEditMode ? (
                    <Input
                      value={userNames[key]}
                      onChange={(e) => handleUserNameChange(key, e.target.value)}
                      className={`font-bold ${colors.text} text-sm tracking-wide uppercase bg-slate-700/50 border-cyan-500/50 h-7 px-2`}
                    />
                  ) : (
                    <span className={`font-bold ${colors.text} text-sm tracking-wide uppercase`}>{userNames[key]}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Orders List */}
          <div className={`bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 flex-1 min-h-0 flex flex-col border border-cyan-500/20 ${isEditMode ? 'ring-2 ring-cyan-400/50' : ''}`}>
            <h3 className="font-bold text-cyan-300 mb-2 text-sm tracking-wider uppercase">Lista de Pedidos</h3>
            <ScrollArea className="flex-1">
              <div className="space-y-1 text-xs">
                {activeOrders.length === 0 ? (
                  <>
                    <div className="text-cyan-400/50">1. EXEMPLO</div>
                    <div className="text-cyan-400/30">2.</div>
                    <div className="text-cyan-400/30">3.</div>
                    <div className="text-cyan-400/30">4.</div>
                    <div className="text-cyan-400/30">5.</div>
                    <div className="text-cyan-400/20">......</div>
                  </>
                ) : (
                  activeOrders.map(({ order, index }) => (
                    <div key={order.id} className="text-cyan-100/80 hover:text-cyan-300 transition-colors cursor-pointer">
                      {index + 1}. {order.patient_name}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Main Floor Plan */}
        <div className="flex-1 min-h-0">
          <div className="relative h-full bg-slate-800/30 backdrop-blur-sm rounded-xl border-2 border-cyan-500/40 shadow-2xl shadow-cyan-500/10 p-3">
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
            
            {/* Grid layout for stations */}
            <div className="relative h-full grid grid-rows-[1fr_1.2fr_0.8fr] grid-cols-[1fr_1.5fr_1fr] gap-3">
              
              {/* Row 1: Área de Projeto + Fresadora + Vazado */}
              <div className="col-span-2 row-span-1">
                <StationBox 
                  title={stationTitles.projeto} 
                  stationKey="projeto"
                  className="h-full" 
                  isEditMode={isEditMode}
                  onTitleChange={handleStationTitleChange}
                >
                  <div className="flex justify-center gap-6 w-full">
                    {/* Carneiro desk */}
                    <div className="flex flex-col items-center gap-1">
                      <svg className="w-5 h-5 text-cyan-400 drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="8" r="4"/>
                        <path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
                      </svg>
                      <div className="bg-slate-700/50 border border-cyan-500/30 rounded px-2 py-1 min-w-[50px] min-h-[30px] flex items-center justify-center gap-1 flex-wrap">
                        {getOrdersByUser("carneiro").map(({ order, index }) => (
                          <OrderChip key={order.id} order={order} index={index} isEditMode={isEditMode} />
                        ))}
                      </div>
                    </div>
                    
                    {/* Alexandre desk */}
                    <div className="flex flex-col items-center gap-1">
                      <svg className="w-5 h-5 text-purple-400 drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="8" r="4"/>
                        <path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
                      </svg>
                      <div className="bg-slate-700/50 border border-purple-500/30 rounded px-2 py-1 min-w-[50px] min-h-[30px] flex items-center justify-center gap-1 flex-wrap">
                        {getOrdersByUser("alexandre").map(({ order, index }) => (
                          <OrderChip key={order.id} order={order} index={index} isEditMode={isEditMode} />
                        ))}
                      </div>
                    </div>

                    {/* Henrique desk */}
                    <div className="flex flex-col items-center gap-1">
                      <svg className="w-5 h-5 text-amber-400 drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="8" r="4"/>
                        <path d="M12 14c-6 0-8 3-8 6v2h16v-2c0-3-2-6-8-6z"/>
                      </svg>
                      <div className="bg-slate-700/50 border border-amber-500/30 rounded px-2 py-1 min-w-[50px] min-h-[30px] flex items-center justify-center gap-1 flex-wrap">
                        {getOrdersByUser("henrique").map(({ order, index }) => (
                          <OrderChip key={order.id} order={order} index={index} isEditMode={isEditMode} />
                        ))}
                      </div>
                    </div>
                  </div>
                </StationBox>
              </div>

              {/* Fresadora + Vazado column */}
              <div className="row-span-1 flex flex-col gap-2">
                <StationBox 
                  title={stationTitles.fresadora} 
                  stationKey="fresadora"
                  className="flex-1" 
                  isEditMode={isEditMode}
                  onTitleChange={handleStationTitleChange}
                >
                  {getOrdersByStation("fresadora").map(({ order, index }) => (
                    <OrderChip key={order.id} order={order} index={index} isEditMode={isEditMode} />
                  ))}
                </StationBox>
                <StationBox 
                  title={stationTitles.vazado} 
                  stationKey="vazado"
                  className="flex-1" 
                  isEditMode={isEditMode}
                  onTitleChange={handleStationTitleChange}
                >
                  {getOrdersByStation("vazado").map(({ order, index }) => (
                    <OrderChip key={order.id} order={order} index={index} isEditMode={isEditMode} />
                  ))}
                </StationBox>
              </div>

              {/* Row 2: Empty space + Área de Espera + Right side equipment */}
              <div className="row-span-1 flex items-center justify-center">
                {/* Small workstation/door */}
                <div className="w-12 h-12 border-2 border-cyan-500/30 rounded bg-slate-800/50 flex items-center justify-center">
                  <div className="w-2 h-6 bg-cyan-500/30 rounded" />
                </div>
              </div>

              <StationBox 
                title={stationTitles.espera} 
                stationKey="espera"
                className="row-span-1" 
                isEditMode={isEditMode}
                onTitleChange={handleStationTitleChange}
              >
                <div className="flex flex-wrap gap-2 justify-center">
                  {getOrdersByStation("espera").map(({ order, index }) => (
                    <OrderChip key={order.id} order={order} index={index} isEditMode={isEditMode} />
                  ))}
                  {getOrdersByStation("espera").length === 0 && (
                    <div className="flex gap-2">
                      <div className="w-7 h-7 rounded-full border-2 border-dashed border-cyan-500/30 flex items-center justify-center text-cyan-500/50 text-xs">1</div>
                      <div className="w-7 h-7 rounded-full border-2 border-dashed border-cyan-500/30 flex items-center justify-center text-cyan-500/50 text-xs">2</div>
                    </div>
                  )}
                </div>
              </StationBox>

              {/* Right side equipment area - empty for visual balance */}
              <div className="row-span-1 flex items-center justify-center">
                <div className="w-full h-full border border-cyan-500/10 rounded-lg bg-slate-900/30 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-2 p-2 opacity-30">
                    <div className="w-6 h-8 bg-cyan-500/20 rounded" />
                    <div className="w-6 h-8 bg-purple-500/20 rounded" />
                    <div className="w-6 h-6 bg-cyan-500/20 rounded" />
                    <div className="w-6 h-6 bg-purple-500/20 rounded" />
                  </div>
                </div>
              </div>

              {/* Row 3: Saída + Maquiagem + Pureto */}
              <div 
                className={`row-span-1 cursor-pointer group ${isEditMode ? 'ring-2 ring-cyan-400/50 rounded-lg' : ''}`}
                onClick={() => !isEditMode && setExitDialogOpen(true)}
              >
                <div className="h-full flex flex-col items-center justify-center bg-slate-800/30 rounded-lg border border-emerald-500/30 hover:border-emerald-400/50 transition-all p-2">
                  {isEditMode ? (
                    <Input
                      value={stationTitles.saida}
                      onChange={(e) => handleStationTitleChange('saida', e.target.value)}
                      className="text-emerald-400 font-bold text-sm tracking-wider uppercase bg-slate-700/50 border-emerald-500/50 h-7 px-2 w-24 text-center"
                    />
                  ) : (
                    <div className="text-emerald-400 font-bold text-sm tracking-wider uppercase flex items-center gap-2">
                      {stationTitles.saida}
                      {completedOrders.length > 0 && (
                        <span className="bg-emerald-500 text-slate-900 text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                          {completedOrders.length}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Door symbol */}
                  <div className="flex items-center mt-2 gap-1">
                    <div className="w-8 h-1 bg-emerald-500/50 rounded" />
                    <div className="w-1 h-4 bg-emerald-500/50 rounded" />
                  </div>
                </div>
              </div>

              <StationBox 
                title={stationTitles.maquiagem} 
                stationKey="maquiagem"
                className="row-span-1" 
                isEditMode={isEditMode}
                onTitleChange={handleStationTitleChange}
              >
                {getOrdersByStation("maquiagem").map(({ order, index }) => (
                  <OrderChip key={order.id} order={order} index={index} isEditMode={isEditMode} />
                ))}
              </StationBox>

              <StationBox 
                title={stationTitles.pureto} 
                stationKey="pureto"
                className="row-span-1" 
                isEditMode={isEditMode}
                onTitleChange={handleStationTitleChange}
              >
                {getOrdersByStation("pureto").map(({ order, index }) => (
                  <OrderChip key={order.id} order={order} index={index} isEditMode={isEditMode} />
                ))}
              </StationBox>
            </div>
          </div>
        </div>
      </div>

      {/* Exit Dialog - Shows completed orders */}
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
                <p className="text-cyan-400/50 text-sm text-center py-4">
                  Nenhum trabalho finalizado ainda.
                </p>
              ) : (
                completedOrders.map(({ order, index }) => {
                  const { bg, glow } = getUserColor(order.assigned_user?.username);
                  return (
                    <div 
                      key={order.id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800/70 transition-colors border border-cyan-500/10"
                    >
                      <div className={`w-8 h-8 rounded-full ${bg} ${glow} shadow-lg flex items-center justify-center text-slate-900 text-sm font-bold`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-cyan-100">{order.patient_name}</div>
                        <div className="text-xs text-cyan-400/50">OS: {order.order_number}</div>
                      </div>
                      <div className="text-xs text-cyan-400/70">
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
    </div>
  );
}
