import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, LogOut, Eye, Filter, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Session } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ImageWithSignedUrl = ({ filePath }: { filePath: string }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      const { data } = await supabase.storage
        .from('order-files')
        .createSignedUrl(filePath, 3600);
      if (data) setImageUrl(data.signedUrl);
    };
    loadImage();
  }, [filePath]);

  return imageUrl ? (
    <img src={imageUrl} alt="Arquivo" className="max-w-full h-auto rounded-lg" />
  ) : (
    <div className="text-muted-foreground">Carregando...</div>
  );
};

const FileLink = ({ filePath }: { filePath: string }) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadUrl = async () => {
      const { data } = await supabase.storage
        .from('order-files')
        .createSignedUrl(filePath, 3600);
      if (data) setFileUrl(data.signedUrl);
    };
    loadUrl();
  }, [filePath]);

  return fileUrl ? (
    <Button asChild variant="outline">
      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
        Abrir Arquivo
      </a>
    </Button>
  ) : (
    <div className="text-muted-foreground">Carregando...</div>
  );
};

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>('pending');
  const [users, setUsers] = useState<any[]>([]);
  const [isPriorityFilter, setIsPriorityFilter] = useState(false);
  const [userFilter, setUserFilter] = useState<string | null>(null);
  const [materialFilter, setMaterialFilter] = useState<string | null>(null);
  const [colorFilter, setColorFilter] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication and admin role
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      setSession(session);

      // Check if user has admin role
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
      fetchUsers();
    };

    checkAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    // Subscribe to real-time updates
    const channel = supabase
      .channel('orders-changes')
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
          *,
          assigned_user:profiles!orders_assigned_to_fkey(username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username')
        .order('username');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "secondary" | "default" | "outline" | "destructive" }> = {
      pending: { label: "Pendente", variant: "secondary" },
      "in-progress": { label: "Em Andamento", variant: "default" },
      completed: { label: "Concluído", variant: "outline" },
      projetando: { label: "Projetando", variant: "default" },
      projetado: { label: "Projetado", variant: "default" },
      "fresado-provisorio": { label: "Fresado Provisório", variant: "default" },
      "fresado-definitivo": { label: "Fresado Definitivo", variant: "default" },
      maquiagem: { label: "Maquiagem", variant: "default" },
      "entregue-provisorio": { label: "Entregue Provisório", variant: "default" },
      vazado: { label: "Vazado", variant: "default" },
      pureto: { label: "Pureto", variant: "default" },
    };

    const config = statusConfig[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleDelete = async (orderId: string, orderNumber: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Pedido excluído",
        description: `A ordem ${orderNumber} foi excluída com sucesso.`,
      });
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o pedido.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "O status da ordem foi alterado com sucesso.",
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    }
  };

  const handleMaterialChange = async (orderId: string, newMaterial: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ material: newMaterial })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Material atualizado",
        description: "O material do pedido foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Error updating material:', error);
      toast({
        title: "Erro ao atualizar material",
        description: "Não foi possível atualizar o material do pedido.",
        variant: "destructive",
      });
    }
  };

  const handleColorChange = async (orderId: string, newColor: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ color: newColor })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Cor atualizada",
        description: "A cor do pedido foi atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Error updating color:', error);
      toast({
        title: "Erro ao atualizar cor",
        description: "Não foi possível atualizar a cor do pedido.",
        variant: "destructive",
      });
    }
  };

  const handleAssignUser = async (orderId: string, userId: string | null) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ assigned_to: userId })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Ordem atribuída",
        description: "A ordem foi atribuída com sucesso.",
      });
    } catch (error) {
      console.error('Error assigning order:', error);
      toast({
        title: "Erro ao atribuir",
        description: "Não foi possível atribuir a ordem.",
        variant: "destructive",
      });
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!session?.user?.id) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para aceitar uma ordem.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          assigned_to: session.user.id,
          status: 'in-progress'
        })
        .eq('id', orderId);

      if (error) throw error;

      // Recarrega os dados para atualizar a tabela
      fetchOrders();

      toast({
        title: "Ordem aceita!",
        description: "A ordem foi atribuída a você e está em andamento.",
      });
    } catch (error) {
      console.error('Error accepting order:', error);
      toast({
        title: "Erro ao aceitar",
        description: "Não foi possível aceitar a ordem.",
        variant: "destructive",
      });
    }
  };

  const handleDeliveryDeadlineChange = async (orderId: string, newDeadline: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ delivery_deadline: newDeadline })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Data atualizada",
        description: "O prazo de entrega foi alterado com sucesso.",
      });
    } catch (error) {
      console.error('Error updating delivery deadline:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o prazo de entrega.",
        variant: "destructive",
      });
    }
  };

  // Helper function to get user_id from username
  const getUserIdByUsername = (username: string) => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    return user?.user_id || null;
  };

  // Define in-progress sub-statuses
  const inProgressStatuses = [
    'in-progress',
    'projetando',
    'projetado',
    'fresado-provisorio',
    'fresado-definitivo',
    'maquiagem',
    'entregue-provisorio',
    'vazado',
    'pureto'
  ];

  const filteredOrders = (() => {
    let result = orders;
    
    // Apply status filter first
    if (isPriorityFilter) {
      result = result.filter(order => order.status === 'pending' || inProgressStatuses.includes(order.status));
    } else if (statusFilter === 'in-progress') {
      result = result.filter(order => inProgressStatuses.includes(order.status));
    } else if (statusFilter) {
      result = result.filter(order => order.status === statusFilter);
    }
    
    // Apply user filter
    if (userFilter) {
      const userId = getUserIdByUsername(userFilter);
      if (userId) {
        result = result.filter(order => order.assigned_to === userId);
      }
    }
    
    // Apply material filter
    if (materialFilter) {
      result = result.filter(order => order.material === materialFilter);
    }
    
    // Apply color filter
    if (colorFilter) {
      result = result.filter(order => order.color === colorFilter);
    }
    
    // Sort by priority if priority filter is active
    if (isPriorityFilter) {
      result = [...result].sort((a, b) => {
        if (!a.delivery_deadline && !b.delivery_deadline) return 0;
        if (!a.delivery_deadline) return 1;
        if (!b.delivery_deadline) return -1;
        return new Date(a.delivery_deadline).getTime() - new Date(b.delivery_deadline).getTime();
      });
    }
    
    return result;
  })();

  const orderCounts = {
    pending: orders.filter(o => o.status === 'pending').length,
    'in-progress': orders.filter(o => inProgressStatuses.includes(o.status)).length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  if (!isAdmin) {
    return null; // Show nothing while checking auth
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/header-logo-new.png" alt="Logo" className="w-8 h-8" />
              <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <FileText className="text-burgundy-500" size={20} />
                Ordens de Serviço
              </CardTitle>
              <div className="flex gap-2 items-center">
                <Filter className="text-gray-400" size={18} />
                <Select
                  value={userFilter || "all"}
                  onValueChange={(value) => setUserFilter(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Usuários</SelectItem>
                    <SelectItem value="Alexandre">Alexandre</SelectItem>
                    <SelectItem value="Carneiro">Carneiro</SelectItem>
                    <SelectItem value="Henrique">Henrique</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={materialFilter || "all"}
                  onValueChange={(value) => setMaterialFilter(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Material" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Materiais</SelectItem>
                    <SelectItem value="Dissilicato">Dissilicato</SelectItem>
                    <SelectItem value="Zirconia">Zirconia</SelectItem>
                    <SelectItem value="PMMA">PMMA</SelectItem>
                    <SelectItem value="Cera">Cera</SelectItem>
                    <SelectItem value="Resina 3D">Resina 3D</SelectItem>
                    <SelectItem value="Gesso">Gesso</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={colorFilter || "all"}
                  onValueChange={(value) => setColorFilter(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Cor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Cores</SelectItem>
                    <SelectItem value="BL1">BL1</SelectItem>
                    <SelectItem value="BL2">BL2</SelectItem>
                    <SelectItem value="BL3">BL3</SelectItem>
                    <SelectItem value="BL4">BL4</SelectItem>
                    <SelectItem value="A1">A1</SelectItem>
                    <SelectItem value="A2">A2</SelectItem>
                    <SelectItem value="A3">A3</SelectItem>
                    <SelectItem value="WHITE">WHITE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atribuído a</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Prazo de Entrega</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Arquivos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Carregando pedidos...
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Nenhum pedido encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        {order.assigned_to ? (() => {
                          const username = users.find(u => u.user_id === order.assigned_to)?.username || 'Usuário';
                          const getUserColor = (name: string) => {
                            switch(name.toLowerCase()) {
                              case 'alexandre': return 'bg-purple-600 text-white';
                              case 'carneiro': return 'bg-cyan-500 text-white';
                              case 'henrique': return 'bg-amber-800 text-white';
                              default: return 'bg-gray-600 text-white';
                            }
                          };
                          return (
                            <span className={`px-3 py-1 rounded ${getUserColor(username)} font-medium`}>
                              {username}
                            </span>
                          );
                        })() : '-'}
                      </TableCell>
                      <TableCell>{order.patient_name}</TableCell>
                      <TableCell>
                        <Select
                          value={order.material || ""}
                          onValueChange={(value) => handleMaterialChange(order.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Dissilicato">Dissilicato</SelectItem>
                            <SelectItem value="Zirconia">Zirconia</SelectItem>
                            <SelectItem value="PMMA">PMMA</SelectItem>
                            <SelectItem value="Cera">Cera</SelectItem>
                            <SelectItem value="Resina 3D">Resina 3D</SelectItem>
                            <SelectItem value="Gesso">Gesso</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {order.delivery_deadline ? (() => {
                          const deadline = new Date(order.delivery_deadline);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          deadline.setHours(0, 0, 0, 0);
                          const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          
                          const getDeadlineColor = () => {
                            if (daysUntilDeadline <= 2) return 'bg-red-600 text-white';
                            if (daysUntilDeadline <= 4) return 'bg-yellow-500 text-black';
                            return 'bg-green-600 text-white';
                          };
                          
                          return (
                            <span className={`px-3 py-1 rounded ${getDeadlineColor()} font-medium`}>
                              {deadline.toLocaleDateString("pt-BR")}
                            </span>
                          );
                        })() : '-'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.color || ""}
                          onValueChange={(value) => handleColorChange(order.id, value)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BL1">BL1</SelectItem>
                            <SelectItem value="BL2">BL2</SelectItem>
                            <SelectItem value="BL3">BL3</SelectItem>
                            <SelectItem value="BL4">BL4</SelectItem>
                            <SelectItem value="A1">A1</SelectItem>
                            <SelectItem value="A2">A2</SelectItem>
                            <SelectItem value="A3">A3</SelectItem>
                            <SelectItem value="WHITE">WHITE</SelectItem>
                            <SelectItem value="Clear">Clear</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={order.status} 
                          onValueChange={(value) => handleStatusChange(order.id, value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusFilter === 'in-progress' ? (
                              <>
                                <SelectItem value="projetando">Projetando</SelectItem>
                                <SelectItem value="projetado">Projetado</SelectItem>
                                <SelectItem value="fresado-provisorio">Fresado Provisório</SelectItem>
                                <SelectItem value="fresado-definitivo">Fresado Definitivo</SelectItem>
                                <SelectItem value="maquiagem">Maquiagem</SelectItem>
                                <SelectItem value="entregue-provisorio">Entregue Provisório</SelectItem>
                                <SelectItem value="vazado">Vazado</SelectItem>
                                <SelectItem value="pureto">Pureto</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="pending">Pendente</SelectItem>
                                <SelectItem value="in-progress">Em Andamento</SelectItem>
                                <SelectItem value="completed">Concluído</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="mr-1 h-4 w-4" />
                              Pedido
                            </Button>
                          </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Detalhes - OS {order.order_number}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-6">
                                {/* Informações da Clínica */}
                                <div>
                                  <h3 className="font-semibold mb-3 text-lg">Informações da Clínica</h3>
                                  <div className="bg-muted p-4 rounded-lg space-y-2">
                                    {order.clinic_name && (
                                      <div className="flex gap-2">
                                        <span className="font-medium">Clínica:</span>
                                        <span>{order.clinic_name}</span>
                                      </div>
                                    )}
                                    {order.email && (
                                      <div className="flex gap-2">
                                        <span className="font-medium">Email:</span>
                                        <span>{order.email}</span>
                                      </div>
                                    )}
                                    {order.phone && (
                                      <div className="flex gap-2">
                                        <span className="font-medium">Telefone:</span>
                                        <span>{order.phone}</span>
                                      </div>
                                    )}
                                    {order.address && (
                                      <div className="flex gap-2">
                                        <span className="font-medium">Endereço:</span>
                                        <span>{order.address}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Informações do Pedido */}
                                <div>
                                  <h3 className="font-semibold mb-3 text-lg">Informações do Pedido</h3>
                                  <div className="bg-muted p-4 rounded-lg space-y-2">
                                    <div className="flex gap-2">
                                      <span className="font-medium">Paciente:</span>
                                      <span>{order.patient_name}</span>
                                    </div>
                                    {order.patient_id && (
                                      <div className="flex gap-2">
                                        <span className="font-medium">ID do Paciente:</span>
                                        <span>{order.patient_id}</span>
                                      </div>
                                    )}
                                    <div className="flex gap-2">
                                      <span className="font-medium">Dentista:</span>
                                      <span>{order.dentist_name}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className="font-medium">Data:</span>
                                      <span>{new Date(order.date).toLocaleDateString("pt-BR")}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className="font-medium">Dentes:</span>
                                      <span>{order.selected_teeth?.join(', ') || '-'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className="font-medium">Status:</span>
                                      {getStatusBadge(order.status)}
                                    </div>
                                  </div>
                                </div>

                                {/* Configurações Técnicas */}
                                <div>
                                  <h3 className="font-semibold mb-3 text-lg">Configurações Técnicas</h3>
                                  <div className="bg-muted p-4 rounded-lg space-y-2">
                                    <div className="flex gap-2">
                                      <span className="font-medium">Material:</span>
                                      <span>{order.material || '-'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className="font-medium">Tipo de Prótese:</span>
                                      <span>{order.prosthesis_type || '-'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <span className="font-medium">Cor / Tonalidade:</span>
                                      <span>{order.color || '-'}</span>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      <span className="font-medium">Prazo de Entrega:</span>
                                      <Input 
                                        type="date"
                                        value={order.delivery_deadline || ''}
                                        onChange={(e) => handleDeliveryDeadlineChange(order.id, e.target.value)}
                                        className="w-auto"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Arquivos */}
                                {(order.smile_photo_url || order.scan_file_url) && (
                                  <div>
                                    <h3 className="font-semibold mb-3 text-lg">Arquivos</h3>
                                    <div className="space-y-4">
                                      {order.smile_photo_url && (
                                        <div>
                                          <h4 className="font-medium mb-2">Foto do Sorriso</h4>
                                          <ImageWithSignedUrl filePath={order.smile_photo_url} />
                                        </div>
                                      )}
                                      {order.scan_file_url && (
                                        <div>
                                          <h4 className="font-medium mb-2">Arquivo de Scan</h4>
                                          <FileLink filePath={order.scan_file_url} />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                 {/* Observações */}
                                 {order.additional_notes && (
                                   <div>
                                     <h3 className="font-semibold mb-3 text-lg">Observações da Clínica</h3>
                                     <div className="bg-muted p-4 rounded-lg">
                                       <p className="text-sm whitespace-pre-wrap">{order.additional_notes}</p>
                                     </div>
                                   </div>
                                 )}

                                 {/* Botão Aceitar */}
                                 <div className="flex justify-end pt-4 border-t">
                                   {order.assigned_to ? (
                                     <div className="text-sm text-muted-foreground">
                                       Atribuído a: <span className="font-medium">{order.assigned_user?.username || 'Usuário'}</span>
                                     </div>
                                   ) : (
                                     <Button 
                                       onClick={() => handleAcceptOrder(order.id)}
                                       className="bg-success text-success-foreground hover:bg-success/90"
                                     >
                                       Aceitar Ordem
                                     </Button>
                                   )}
                                 </div>
                               </div>
                             </DialogContent>
                            </Dialog>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleStatusChange(order.id, 'completed')}
                            title="Marcar como concluído"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a ordem {order.order_number}? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(order.id, order.order_number)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Status Filters */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="flex gap-3 justify-center flex-wrap">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter(null);
                  setIsPriorityFilter(true);
                }}
                className={`flex-1 min-w-[150px] max-w-xs ${
                  isPriorityFilter 
                    ? 'bg-warning text-warning-foreground hover:bg-warning/90 border-warning' 
                    : ''
                }`}
              >
                Prioridade ({orders.filter(o => o.delivery_deadline).length})
              </Button>
              <Button
                variant={statusFilter === 'pending' ? "default" : "outline"}
                onClick={() => {
                  setStatusFilter('pending');
                  setIsPriorityFilter(false);
                }}
                className="flex-1 min-w-[150px] max-w-xs"
              >
                Pendentes ({orderCounts.pending})
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('in-progress');
                  setIsPriorityFilter(false);
                }}
                className={`flex-1 min-w-[150px] max-w-xs ${
                  statusFilter === 'in-progress' 
                    ? 'bg-info text-info-foreground hover:bg-info/90 border-info' 
                    : ''
                }`}
              >
                Em Andamento ({orderCounts['in-progress']})
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('completed');
                  setIsPriorityFilter(false);
                }}
                className={`flex-1 min-w-[150px] max-w-xs ${
                  statusFilter === 'completed' 
                    ? 'bg-success text-success-foreground hover:bg-success/90 border-success' 
                    : ''
                }`}
              >
                Concluídos ({orderCounts.completed})
              </Button>
              <Button
                variant={statusFilter === null && !isPriorityFilter ? "default" : "outline"}
                onClick={() => {
                  setStatusFilter(null);
                  setIsPriorityFilter(false);
                }}
                className="flex-1 min-w-[150px] max-w-xs"
              >
                Todos ({orders.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
