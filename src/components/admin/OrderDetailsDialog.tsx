import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pencil, Save, X, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Order {
  id: string;
  order_number: string;
  clinic_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  patient_name: string;
  patient_id?: string | null;
  dentist_name: string;
  date: string;
  selected_teeth?: string[];
  status: string;
  material?: string | null;
  prosthesis_type?: string | null;
  color?: string | null;
  delivery_deadline?: string | null;
  smile_photo_url?: string | null;
  scan_file_url?: string | null;
  additional_notes?: string | null;
  assigned_to?: string | null;
  assigned_user?: { username: string } | null;
  updated_at: string;
}

interface OrderDetailsDialogProps {
  order: Order;
  getStatusBadge: (status: string) => React.ReactNode;
  handleDeliveryDeadlineChange: (orderId: string, deadline: string) => Promise<void>;
  handleAcceptOrder: (orderId: string) => Promise<void>;
  handleUnacceptOrder: (orderId: string) => Promise<void>;
  ImageWithSignedUrl: React.ComponentType<{ filePath: string }>;
  FileLink: React.ComponentType<{ filePath: string }>;
  onUpdate: () => void;
  toast: any;
}

export function OrderDetailsDialog({
  order,
  getStatusBadge,
  handleDeliveryDeadlineChange,
  handleAcceptOrder,
  handleUnacceptOrder,
  ImageWithSignedUrl,
  FileLink,
  onUpdate,
  toast,
}: OrderDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    clinic_name: order.clinic_name || "",
    email: order.email || "",
    phone: order.phone || "",
    address: order.address || "",
    patient_name: order.patient_name,
    patient_id: order.patient_id || "",
    dentist_name: order.dentist_name,
    material: order.material || "",
    prosthesis_type: order.prosthesis_type || "",
    color: order.color || "",
    delivery_deadline: order.delivery_deadline || "",
    additional_notes: order.additional_notes || "",
  });

  const handleStartEdit = () => {
    setEditData({
      clinic_name: order.clinic_name || "",
      email: order.email || "",
      phone: order.phone || "",
      address: order.address || "",
      patient_name: order.patient_name,
      patient_id: order.patient_id || "",
      dentist_name: order.dentist_name,
      material: order.material || "",
      prosthesis_type: order.prosthesis_type || "",
      color: order.color || "",
      delivery_deadline: order.delivery_deadline || "",
      additional_notes: order.additional_notes || "",
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          clinic_name: editData.clinic_name || null,
          email: editData.email || null,
          phone: editData.phone || null,
          address: editData.address || null,
          patient_name: editData.patient_name,
          patient_id: editData.patient_id || null,
          dentist_name: editData.dentist_name,
          material: editData.material || null,
          prosthesis_type: editData.prosthesis_type || null,
          color: editData.color || null,
          delivery_deadline: editData.delivery_deadline || null,
          additional_notes: editData.additional_notes || null,
        })
        .eq("id", order.id);

      if (error) throw error;

      toast({
        title: "Pedido atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  };

  const formatLastModified = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>Detalhes - OS {order.order_number}</DialogTitle>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Última modificação: {formatLastModified(order.updated_at)}
            </span>
            {isEditing ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  <X className="mr-1 h-4 w-4" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSaveEdit}>
                  <Save className="mr-1 h-4 w-4" />
                  Salvar
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={handleStartEdit}>
                <Pencil className="mr-1 h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </DialogHeader>
      <div className="space-y-6">
        {/* Informações da Clínica */}
        <div>
          <h3 className="font-semibold mb-3 text-lg">Informações da Clínica</h3>
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex gap-2 items-center">
              <span className="font-medium min-w-[100px]">Clínica:</span>
              {isEditing ? (
                <Input
                  value={editData.clinic_name}
                  onChange={(e) => setEditData({ ...editData, clinic_name: e.target.value })}
                  className="flex-1"
                />
              ) : (
                <span>{order.clinic_name || "-"}</span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <span className="font-medium min-w-[100px]">Email:</span>
              {isEditing ? (
                <Input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="flex-1"
                />
              ) : (
                <span>{order.email || "-"}</span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <span className="font-medium min-w-[100px]">Telefone:</span>
              {isEditing ? (
                <Input
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="flex-1"
                />
              ) : (
                <span>{order.phone || "-"}</span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <span className="font-medium min-w-[100px]">Endereço:</span>
              {isEditing ? (
                <Input
                  value={editData.address}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  className="flex-1"
                />
              ) : (
                <span>{order.address || "-"}</span>
              )}
            </div>
          </div>
        </div>

        {/* Informações do Pedido */}
        <div>
          <h3 className="font-semibold mb-3 text-lg">Informações do Pedido</h3>
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex gap-2 items-center">
              <span className="font-medium min-w-[100px]">Paciente:</span>
              {isEditing ? (
                <Input
                  value={editData.patient_name}
                  onChange={(e) => setEditData({ ...editData, patient_name: e.target.value })}
                  className="flex-1"
                />
              ) : (
                <span>{order.patient_name}</span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <span className="font-medium min-w-[100px]">ID do Paciente:</span>
              {isEditing ? (
                <Input
                  value={editData.patient_id}
                  onChange={(e) => setEditData({ ...editData, patient_id: e.target.value })}
                  className="flex-1"
                />
              ) : (
                <span>{order.patient_id || "-"}</span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <span className="font-medium min-w-[100px]">Dentista:</span>
              {isEditing ? (
                <Input
                  value={editData.dentist_name}
                  onChange={(e) => setEditData({ ...editData, dentist_name: e.target.value })}
                  className="flex-1"
                />
              ) : (
                <span>{order.dentist_name}</span>
              )}
            </div>
            <div className="flex gap-2">
              <span className="font-medium min-w-[100px]">Data:</span>
              <span>{new Date(order.date).toLocaleDateString("pt-BR")}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium min-w-[100px]">Dentes:</span>
              <span>{order.selected_teeth?.join(", ") || "-"}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium min-w-[100px]">Status:</span>
              {getStatusBadge(order.status)}
            </div>
          </div>
        </div>

        {/* Configurações Técnicas */}
        <div>
          <h3 className="font-semibold mb-3 text-lg">Configurações Técnicas</h3>
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex gap-2 items-center">
              <span className="font-medium min-w-[130px]">Material:</span>
              {isEditing ? (
                <Input
                  value={editData.material}
                  onChange={(e) => setEditData({ ...editData, material: e.target.value })}
                  className="flex-1"
                />
              ) : (
                <span>{order.material || "-"}</span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <span className="font-medium min-w-[130px]">Tipo de Prótese:</span>
              {isEditing ? (
                <Input
                  value={editData.prosthesis_type}
                  onChange={(e) => setEditData({ ...editData, prosthesis_type: e.target.value })}
                  className="flex-1"
                />
              ) : (
                <span>{order.prosthesis_type || "-"}</span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <span className="font-medium min-w-[130px]">Cor / Tonalidade:</span>
              {isEditing ? (
                <Input
                  value={editData.color}
                  onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                  className="flex-1"
                />
              ) : (
                <span>{order.color || "-"}</span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <span className="font-medium min-w-[130px]">Prazo de Entrega:</span>
              <Input
                type="date"
                value={isEditing ? editData.delivery_deadline : order.delivery_deadline || ""}
                onChange={(e) => {
                  if (isEditing) {
                    setEditData({ ...editData, delivery_deadline: e.target.value });
                  } else {
                    handleDeliveryDeadlineChange(order.id, e.target.value);
                  }
                }}
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
        <div>
          <h3 className="font-semibold mb-3 text-lg">Observações da Clínica</h3>
          <div className="bg-muted p-4 rounded-lg">
            {isEditing ? (
              <textarea
                value={editData.additional_notes}
                onChange={(e) => setEditData({ ...editData, additional_notes: e.target.value })}
                className="w-full min-h-[100px] p-2 rounded border bg-background"
                placeholder="Observações..."
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{order.additional_notes || "-"}</p>
            )}
          </div>
        </div>

        {/* Botão Aceitar / Desfazer */}
        <div className="flex justify-between items-center pt-4 border-t">
          {order.assigned_to ? (
            <>
              <div className="text-sm text-muted-foreground">
                Atribuído a: <span className="font-medium">{order.assigned_user?.username || "Usuário"}</span>
              </div>
              <Button
                onClick={() => handleUnacceptOrder(order.id)}
                variant="outline"
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
              >
                <Undo2 className="mr-2 h-4 w-4" />
                Desfazer Aceitação
              </Button>
            </>
          ) : (
            <div className="ml-auto">
              <Button onClick={() => handleAcceptOrder(order.id)} className="bg-success text-success-foreground hover:bg-success/90">
                Aceitar Ordem
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
