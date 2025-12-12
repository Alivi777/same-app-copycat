import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ClipboardList, Search, FileText, Image, Eye, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Order {
  id: string;
  order_number: string;
  patient_name: string;
  patient_id: string | null;
  dentist_name: string | null;
  clinic_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  date: string | null;
  delivery_deadline: string | null;
  material: string | null;
  color: string | null;
  prosthesis_type: string | null;
  selected_teeth: string[] | null;
  additional_notes: string | null;
  created_at: string;
  assigned_to: string | null;
  smile_photo_url: string | null;
  scan_file_url: string | null;
}

interface Profile {
  user_id: string;
  username: string;
}

const STATUS_LABELS: Record<string, string> = {
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

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  "in-progress": "bg-blue-100 text-blue-800 border-blue-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  projetando: "bg-blue-100 text-blue-800 border-blue-300",
  projetado: "bg-indigo-100 text-indigo-800 border-indigo-300",
  "fresado-provisorio": "bg-orange-100 text-orange-800 border-orange-300",
  "fresado-definitivo": "bg-purple-100 text-purple-800 border-purple-300",
  maquiagem: "bg-pink-100 text-pink-800 border-pink-300",
  "entregue-provisorio": "bg-teal-100 text-teal-800 border-teal-300",
  vazado: "bg-gray-100 text-gray-800 border-gray-300",
  pureto: "bg-amber-100 text-amber-800 border-amber-300",
};

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
    <Button asChild variant="outline" size="sm">
      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
        Abrir
      </a>
    </Button>
  ) : (
    <div className="text-muted-foreground text-sm">Carregando...</div>
  );
};

const getUserColor = (name: string) => {
  switch(name.toLowerCase()) {
    case 'alexandre': return 'bg-purple-600 text-white';
    case 'carneiro': return 'bg-cyan-500 text-white';
    case 'henrique': return 'bg-amber-800 text-white';
    default: return 'bg-gray-600 text-white';
  }
};

export function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchOrders();

    // Real-time subscription
    const channel = supabase
      .channel('public-orders-changes')
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
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, username');
    if (data) setUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredOrders = orders.filter(order => 
    order.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.dentist_name && order.dentist_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (order.clinic_name && order.clinic_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">Carregando pedidos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <ClipboardList className="text-burgundy-500" size={24} />
            Lista de Pedidos Enviados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por paciente, pedido, dentista ou clínica..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setLoading(true);
                fetchOrders();
              }}
              title="Atualizar lista"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? "Nenhum pedido encontrado para a busca." : "Nenhum pedido enviado ainda."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atribuído a</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Dentista</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        {order.assigned_to ? (() => {
                          const username = users.find(u => u.user_id === order.assigned_to)?.username || 'Usuário';
                          return (
                            <span className={`px-3 py-1 rounded ${getUserColor(username)} font-medium`}>
                              {username}
                            </span>
                          );
                        })() : '-'}
                      </TableCell>
                      <TableCell>{order.patient_name}</TableCell>
                      <TableCell>{order.dentist_name || "-"}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="mr-1 h-4 w-4" />
                              Ver
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
                                  {!order.clinic_name && !order.email && !order.phone && !order.address && (
                                    <span className="text-muted-foreground">Nenhuma informação da clínica</span>
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
                                    <span>{order.dentist_name || '-'}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="font-medium">Data:</span>
                                    <span>{formatDate(order.date)}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="font-medium">Dentes:</span>
                                    <span>{order.selected_teeth?.join(', ') || '-'}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="font-medium">Status:</span>
                                    <Badge 
                                      variant="outline" 
                                      className={STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800"}
                                    >
                                      {STATUS_LABELS[order.status] || order.status}
                                    </Badge>
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
                                  <div className="flex gap-2">
                                    <span className="font-medium">Prazo de Entrega:</span>
                                    <span>{formatDate(order.delivery_deadline)}</span>
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
                                        <h4 className="font-medium mb-2 flex items-center gap-2">
                                          <Image className="h-4 w-4" />
                                          Foto do Sorriso
                                        </h4>
                                        <ImageWithSignedUrl filePath={order.smile_photo_url} />
                                      </div>
                                    )}
                                    {order.scan_file_url && (
                                      <div>
                                        <h4 className="font-medium mb-2 flex items-center gap-2">
                                          <FileText className="h-4 w-4" />
                                          Arquivo de Scan
                                        </h4>
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
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                      <TableCell>{formatDate(order.date)}</TableCell>
                      <TableCell>{formatDate(order.delivery_deadline)}</TableCell>
                      <TableCell>{order.material || "-"}</TableCell>
                      <TableCell>{order.color || "-"}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800"}
                        >
                          {STATUS_LABELS[order.status] || order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            Total: {filteredOrders.length} pedido(s)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
