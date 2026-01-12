import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, PieChart, LogOut, ArrowLeft, Clock, TrendingUp, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Session } from "@supabase/supabase-js";
import { formatDuration } from "@/hooks/useOrderStatusTracking";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend, Tooltip } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrderWithHistory {
  id: string;
  patient_name: string;
  order_number: string;
  status: string;
  created_at: string;
  assigned_user?: { username: string };
  statusHistory: StatusHistoryEntry[];
}

interface StatusHistoryEntry {
  id: string;
  order_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string;
  changed_at: string;
  duration_seconds: number | null;
}

interface PerformanceData {
  orderId: string;
  orderNumber: string;
  patientName: string;
  assignedUsers: string[];
  startDate: string | null;
  endDate: string | null;
  totalSeconds: number | null;
}

const COLORS = ['hsl(var(--primary))', 'hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(45, 93%, 47%)', 'hsl(280, 65%, 60%)'];

export default function Analytics() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [completionTimeData, setCompletionTimeData] = useState<any[]>([]);
  const [statusDistributionData, setStatusDistributionData] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);

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
      fetchData();
    };

    checkAuth();
  }, [navigate, toast]);

  const fetchData = async () => {
    try {
      // Fetch orders with assigned user
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          assigned_user:profiles!orders_assigned_to_fkey(username)
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      // Fetch all status history
      const { data: historyData, error: historyError } = await supabase
        .from('order_status_history')
        .select('*')
        .order('changed_at', { ascending: true });

      if (historyError) throw historyError;
      setStatusHistory(historyData || []);

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username');

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Process data for charts
      processChartData(ordersData || [], historyData || [], profilesData || []);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de analytics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (orders: any[], history: StatusHistoryEntry[], profiles: any[]) => {
    // Process completion time by day (last 7 days)
    const completionTimes: Record<string, { total: number; count: number }> = {};
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return format(date, 'yyyy-MM-dd');
    });

    // Initialize all days
    last7Days.forEach(day => {
      completionTimes[day] = { total: 0, count: 0 };
    });

    // Group history by order
    const orderHistories: Record<string, StatusHistoryEntry[]> = {};
    history.forEach(h => {
      if (!orderHistories[h.order_id]) {
        orderHistories[h.order_id] = [];
      }
      orderHistories[h.order_id].push(h);
    });

    // Calculate completion times for each order
    const performanceResults: PerformanceData[] = [];
    const acceptedStatuses = ['in-progress', 'projetando'];
    
    Object.entries(orderHistories).forEach(([orderId, orderHistory]) => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const acceptedEntry = orderHistory.find(h => acceptedStatuses.includes(h.new_status));
      const completedEntry = orderHistory.find(h => h.new_status === 'completed');

      if (acceptedEntry && completedEntry) {
        const startTime = new Date(acceptedEntry.changed_at);
        const endTime = new Date(completedEntry.changed_at);
        const totalSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        
        const completionDay = format(endTime, 'yyyy-MM-dd');
        if (completionTimes[completionDay]) {
          completionTimes[completionDay].total += totalSeconds;
          completionTimes[completionDay].count += 1;
        }

        // Get all unique users who worked on this order
        const uniqueUserIds = [...new Set(orderHistory.map(h => h.changed_by))];
        const usernames = uniqueUserIds
          .map(userId => profiles.find(p => p.user_id === userId)?.username || 'Desconhecido')
          .filter(Boolean);

        performanceResults.push({
          orderId,
          orderNumber: order.order_number,
          patientName: order.patient_name,
          assignedUsers: usernames,
          startDate: acceptedEntry.changed_at,
          endDate: completedEntry.changed_at,
          totalSeconds,
        });
      }
    });

    // Format completion time data for chart
    const formattedCompletionData = last7Days.map(day => {
      const dayData = completionTimes[day];
      const avgMinutes = dayData.count > 0 ? Math.round(dayData.total / dayData.count / 60) : 0;
      return {
        day: format(new Date(day), 'EEE', { locale: ptBR }),
        avgMinutes,
        label: format(new Date(day), 'dd/MM', { locale: ptBR }),
      };
    });

    setCompletionTimeData(formattedCompletionData);

    // Process status distribution
    const statusCounts: Record<string, number> = {};
    orders.forEach(order => {
      const status = getStatusLabel(order.status);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statusData = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));

    setStatusDistributionData(statusData);

    // Sort performance data by completion date (most recent first)
    performanceResults.sort((a, b) => {
      if (!a.endDate || !b.endDate) return 0;
      return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
    });

    setPerformanceData(performanceResults.slice(0, 20)); // Last 20 completed orders
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: "Pendente",
      "in-progress": "Em Andamento",
      completed: "Concluído",
      projetando: "Projetando",
      projetado: "Projetado",
      "fresado-provisorio": "Fresado Provisório",
      "fresado-definitivo": "Fresado Definitivo",
      maquiagem: "Maquiagem",
      "entregue-provisorio": "Entregue Provisório",
      vazado: "Vazado",
      pureto: "Pureto",
    };
    return labels[status] || status;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (!isAdmin) {
    return null;
  }

  // Calculate summary stats
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const avgCompletionTime = performanceData.length > 0
    ? Math.round(performanceData.reduce((acc, p) => acc + (p.totalSeconds || 0), 0) / performanceData.length)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/header-logo-new.png" alt="Logo" className="w-8 h-8" />
              <h1 className="text-2xl font-bold text-gray-900">Analytics de Produção</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate("/admin")}>
                <ArrowLeft className="mr-2 w-4 h-4" />
                Voltar ao Painel
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-8">Carregando dados...</div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                      <p className="text-2xl font-bold">{totalOrders}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pedidos Concluídos</p>
                      <p className="text-2xl font-bold">{completedOrders}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tempo Médio de Produção</p>
                      <p className="text-2xl font-bold">{formatDuration(avgCompletionTime)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart - Average Completion Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Tempo Médio de Conclusão (Últimos 7 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={completionTimeData}>
                        <XAxis dataKey="label" tick={{ fill: 'hsl(var(--foreground))' }} />
                        <YAxis 
                          tick={{ fill: 'hsl(var(--foreground))' }} 
                          label={{ value: 'Minutos', angle: -90, position: 'insideLeft', fill: 'hsl(var(--foreground))' }}
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                                  <p className="text-sm font-medium">{payload[0].payload.label}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Média: {payload[0].value} min
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="avgMinutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Pie Chart - Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-primary" />
                    Distribuição por Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={statusDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {statusDistributionData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                                  <p className="text-sm font-medium">{payload[0].name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Quantidade: {payload[0].value}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Tabela de Performance - Pedidos Finalizados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OS</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Responsáveis</TableHead>
                      <TableHead>Data de Início</TableHead>
                      <TableHead>Data de Término</TableHead>
                      <TableHead>Tempo Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum pedido finalizado com histórico de status encontrado.
                          <br />
                          <span className="text-sm">O rastreamento começará a registrar dados a partir de agora.</span>
                        </TableCell>
                      </TableRow>
                    ) : (
                      performanceData.map((perf) => (
                        <TableRow key={perf.orderId}>
                          <TableCell className="font-medium">{perf.orderNumber}</TableCell>
                          <TableCell>{perf.patientName}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {perf.assignedUsers.map((user, idx) => (
                                <Badge key={idx} variant="secondary">{user}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {perf.startDate 
                              ? format(new Date(perf.startDate), "dd/MM/yyyy HH:mm", { locale: ptBR })
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {perf.endDate 
                              ? format(new Date(perf.endDate), "dd/MM/yyyy HH:mm", { locale: ptBR })
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {formatDuration(perf.totalSeconds)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
