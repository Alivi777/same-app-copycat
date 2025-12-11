import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ClipboardList, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Order {
  id: string;
  order_number: string;
  patient_name: string;
  dentist_name: string | null;
  clinic_name: string | null;
  status: string;
  date: string | null;
  delivery_deadline: string | null;
  material: string | null;
  color: string | null;
  created_at: string;
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

export function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
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
      .select('id, order_number, patient_name, dentist_name, clinic_name, status, date, delivery_deadline, material, color, created_at')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

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
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por paciente, pedido, dentista ou clínica..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
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
                    <TableHead>Nº Pedido</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Dentista</TableHead>
                    <TableHead>Clínica</TableHead>
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
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.patient_name}</TableCell>
                      <TableCell>{order.dentist_name || "-"}</TableCell>
                      <TableCell>{order.clinic_name || "-"}</TableCell>
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
