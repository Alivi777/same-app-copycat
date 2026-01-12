import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, PieChart, LogOut, ArrowLeft, Clock, TrendingUp, CheckCircle, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Session } from "@supabase/supabase-js";
import { formatDuration } from "@/hooks/useOrderStatusTracking";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend, Tooltip } from "recharts";
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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

interface UserPerformance {
  username: string;
  completedOrders: number;
  avgTimeSeconds: number;
  totalTimeSeconds: number;
}

type PeriodFilter = 'daily' | 'weekly' | 'monthly';

const COLORS = ['hsl(var(--primary))', 'hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(45, 93%, 47%)', 'hsl(280, 65%, 60%)', 'hsl(340, 82%, 52%)'];

const USER_COLORS: Record<string, string> = {
  'Alexandre': 'hsl(280, 65%, 50%)',
  'Carneiro': 'hsl(187, 85%, 45%)',
  'Henrique': 'hsl(35, 92%, 40%)',
};

export default function Analytics() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('weekly');

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
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          assigned_user:profiles!orders_assigned_to_fkey(username)
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      const { data: historyData, error: historyError } = await supabase
        .from('order_status_history')
        .select('*')
        .order('changed_at', { ascending: true });

      if (historyError) throw historyError;
      setStatusHistory(historyData || []);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username');

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);
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

  // Get date range based on period filter
  const getDateRange = useMemo(() => {
    const now = new Date();
    switch (periodFilter) {
      case 'daily':
        return {
          start: subDays(now, 6),
          end: now,
          intervals: eachDayOfInterval({ start: subDays(now, 6), end: now }),
          formatLabel: (date: Date) => format(date, 'dd/MM', { locale: ptBR }),
          formatKey: (date: Date) => format(date, 'yyyy-MM-dd'),
        };
      case 'weekly':
        return {
          start: subWeeks(now, 3),
          end: now,
          intervals: eachWeekOfInterval({ start: subWeeks(now, 3), end: now }, { locale: ptBR }),
          formatLabel: (date: Date) => `Sem ${format(date, 'dd/MM', { locale: ptBR })}`,
          formatKey: (date: Date) => format(startOfWeek(date, { locale: ptBR }), 'yyyy-MM-dd'),
        };
      case 'monthly':
        return {
          start: subMonths(now, 5),
          end: now,
          intervals: eachMonthOfInterval({ start: subMonths(now, 5), end: now }),
          formatLabel: (date: Date) => format(date, 'MMM/yy', { locale: ptBR }),
          formatKey: (date: Date) => format(startOfMonth(date), 'yyyy-MM'),
        };
    }
  }, [periodFilter]);

  // Process chart data based on period filter
  const processedData = useMemo(() => {
    const orderHistories: Record<string, StatusHistoryEntry[]> = {};
    statusHistory.forEach(h => {
      if (!orderHistories[h.order_id]) {
        orderHistories[h.order_id] = [];
      }
      orderHistories[h.order_id].push(h);
    });

    const acceptedStatuses = ['in-progress', 'projetando'];
    const performanceResults: PerformanceData[] = [];
    const userStats: Record<string, { completedOrders: number; totalTimeSeconds: number }> = {};
    const completionTimes: Record<string, { total: number; count: number }> = {};

    // Initialize intervals
    getDateRange.intervals.forEach(date => {
      const key = getDateRange.formatKey(date);
      completionTimes[key] = { total: 0, count: 0 };
    });

    Object.entries(orderHistories).forEach(([orderId, orderHistory]) => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const acceptedEntry = orderHistory.find(h => acceptedStatuses.includes(h.new_status));
      const completedEntry = orderHistory.find(h => h.new_status === 'completed');

      if (acceptedEntry && completedEntry) {
        const startTime = new Date(acceptedEntry.changed_at);
        const endTime = new Date(completedEntry.changed_at);
        const totalSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

        // Check if within date range
        if (endTime >= getDateRange.start && endTime <= getDateRange.end) {
          const key = getDateRange.formatKey(endTime);
          if (completionTimes[key]) {
            completionTimes[key].total += totalSeconds;
            completionTimes[key].count += 1;
          }
        }

        // Get all unique users who worked on this order
        const uniqueUserIds = [...new Set(orderHistory.map(h => h.changed_by))];
        const usernames = uniqueUserIds
          .map(userId => profiles.find(p => p.user_id === userId)?.username || 'Desconhecido')
          .filter(Boolean);

        // Track user performance
        usernames.forEach(username => {
          if (!userStats[username]) {
            userStats[username] = { completedOrders: 0, totalTimeSeconds: 0 };
          }
          userStats[username].completedOrders += 1;
          userStats[username].totalTimeSeconds += totalSeconds;
        });

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
    const completionTimeData = getDateRange.intervals.map(date => {
      const key = getDateRange.formatKey(date);
      const dayData = completionTimes[key] || { total: 0, count: 0 };
      const avgMinutes = dayData.count > 0 ? Math.round(dayData.total / dayData.count / 60) : 0;
      return {
        label: getDateRange.formatLabel(date),
        avgMinutes,
        count: dayData.count,
      };
    });

    // Process status distribution
    const statusCounts: Record<string, number> = {};
    orders.forEach(order => {
      const status = getStatusLabel(order.status);
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statusDistributionData = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // Sort performance data by completion date (most recent first)
    performanceResults.sort((a, b) => {
      if (!a.endDate || !b.endDate) return 0;
      return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
    });

    // Calculate user performance data
    const userPerformanceData: UserPerformance[] = Object.entries(userStats)
      .map(([username, stats]) => ({
        username,
        completedOrders: stats.completedOrders,
        avgTimeSeconds: Math.round(stats.totalTimeSeconds / stats.completedOrders),
        totalTimeSeconds: stats.totalTimeSeconds,
      }))
      .sort((a, b) => b.completedOrders - a.completedOrders);

    return {
      completionTimeData,
      statusDistributionData,
      performanceData: performanceResults.slice(0, 20),
      userPerformanceData,
    };
  }, [orders, statusHistory, profiles, getDateRange]);

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

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case 'daily': return 'Últimos 7 dias';
      case 'weekly': return 'Últimas 4 semanas';
      case 'monthly': return 'Últimos 6 meses';
    }
  };

  if (!isAdmin) {
    return null;
  }

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const avgCompletionTime = processedData.performanceData.length > 0
    ? Math.round(processedData.performanceData.reduce((acc, p) => acc + (p.totalSeconds || 0), 0) / processedData.performanceData.length)
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
            {/* Period Filter */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Período de análise:</span>
                  </div>
                  <ToggleGroup 
                    type="single" 
                    value={periodFilter} 
                    onValueChange={(value) => value && setPeriodFilter(value as PeriodFilter)}
                    className="gap-1"
                  >
                    <ToggleGroupItem value="daily" aria-label="Diário" className="px-4">
                      Diário
                    </ToggleGroupItem>
                    <ToggleGroupItem value="weekly" aria-label="Semanal" className="px-4">
                      Semanal
                    </ToggleGroupItem>
                    <ToggleGroupItem value="monthly" aria-label="Mensal" className="px-4">
                      Mensal
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </CardContent>
            </Card>

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
                    Tempo Médio de Conclusão ({getPeriodLabel()})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={processedData.completionTimeData}>
                        <XAxis dataKey="label" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
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
                                  <p className="text-sm text-muted-foreground">
                                    Pedidos: {payload[0].payload.count}
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
                          data={processedData.statusDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {processedData.statusDistributionData.map((_, index) => (
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

            {/* User Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Performance por Usuário
                </CardTitle>
              </CardHeader>
              <CardContent>
                {processedData.userPerformanceData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum dado de performance por usuário disponível.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bar Chart - Orders per User */}
                    <div>
                      <h4 className="text-sm font-medium mb-4 text-center">Pedidos Concluídos por Usuário</h4>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={processedData.userPerformanceData} layout="vertical">
                            <XAxis type="number" tick={{ fill: 'hsl(var(--foreground))' }} />
                            <YAxis 
                              type="category" 
                              dataKey="username" 
                              tick={{ fill: 'hsl(var(--foreground))' }}
                              width={80}
                            />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                                      <p className="text-sm font-medium">{payload[0].payload.username}</p>
                                      <p className="text-sm text-muted-foreground">
                                        Pedidos: {payload[0].value}
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar 
                              dataKey="completedOrders" 
                              radius={[0, 4, 4, 0]}
                            >
                              {processedData.userPerformanceData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={USER_COLORS[entry.username] || COLORS[index % COLORS.length]} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Bar Chart - Avg Time per User */}
                    <div>
                      <h4 className="text-sm font-medium mb-4 text-center">Tempo Médio por Pedido (minutos)</h4>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={processedData.userPerformanceData.map(u => ({
                              ...u,
                              avgTimeMinutes: Math.round(u.avgTimeSeconds / 60)
                            }))} 
                            layout="vertical"
                          >
                            <XAxis type="number" tick={{ fill: 'hsl(var(--foreground))' }} />
                            <YAxis 
                              type="category" 
                              dataKey="username" 
                              tick={{ fill: 'hsl(var(--foreground))' }}
                              width={80}
                            />
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                                      <p className="text-sm font-medium">{payload[0].payload.username}</p>
                                      <p className="text-sm text-muted-foreground">
                                        Tempo médio: {formatDuration(payload[0].payload.avgTimeSeconds)}
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar 
                              dataKey="avgTimeMinutes" 
                              radius={[0, 4, 4, 0]}
                            >
                              {processedData.userPerformanceData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={USER_COLORS[entry.username] || COLORS[index % COLORS.length]} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* User Stats Table */}
                {processedData.userPerformanceData.length > 0 && (
                  <div className="mt-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead className="text-center">Pedidos Concluídos</TableHead>
                          <TableHead className="text-center">Tempo Médio</TableHead>
                          <TableHead className="text-center">Tempo Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {processedData.userPerformanceData.map((user) => (
                          <TableRow key={user.username}>
                            <TableCell>
                              <span 
                                className="px-3 py-1 rounded font-medium text-white"
                                style={{ backgroundColor: USER_COLORS[user.username] || COLORS[0] }}
                              >
                                {user.username}
                              </span>
                            </TableCell>
                            <TableCell className="text-center font-medium">{user.completedOrders}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-mono">
                                {formatDuration(user.avgTimeSeconds)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="font-mono">
                                {formatDuration(user.totalTimeSeconds)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

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
                    {processedData.performanceData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum pedido finalizado com histórico de status encontrado.
                          <br />
                          <span className="text-sm">O rastreamento começará a registrar dados a partir de agora.</span>
                        </TableCell>
                      </TableRow>
                    ) : (
                      processedData.performanceData.map((perf) => (
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
