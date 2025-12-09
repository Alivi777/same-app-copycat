import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Settings } from "lucide-react";

interface ToothConfigurationProps {
  material?: string;
  prosthesisType?: string;
  color?: string;
  deliveryDeadline?: string;
  onMaterialChange?: (value: string) => void;
  onProsthesisTypeChange?: (value: string) => void;
  onColorChange?: (value: string) => void;
  onDeliveryDeadlineChange?: (value: string) => void;
}

export function ToothConfiguration({
  material,
  prosthesisType,
  color,
  deliveryDeadline,
  onMaterialChange,
  onProsthesisTypeChange,
  onColorChange,
  onDeliveryDeadlineChange
}: ToothConfigurationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Settings className="text-burgundy-500" size={20} />
          Configurações Técnicas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="material">Material</Label>
            <Select value={material} onValueChange={onMaterialChange}>
              <SelectTrigger id="material">
                <SelectValue placeholder="Selecione o material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dissilicato">Dissilicato</SelectItem>
                <SelectItem value="zirconia">Zirconia</SelectItem>
                <SelectItem value="pmma">PMMA</SelectItem>
                <SelectItem value="resina">Resina</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Prótese</Label>
            <Select value={prosthesisType} onValueChange={onProsthesisTypeChange}>
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coroa">Coroa</SelectItem>
                <SelectItem value="ponte">Ponte</SelectItem>
                <SelectItem value="protocolo">Protocolo</SelectItem>
                <SelectItem value="dentadura">Dentadura</SelectItem>
                <SelectItem value="parcial">Prótese Parcial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cor">Cor / Tonalidade</Label>
            <Input 
              id="cor" 
              placeholder="Ex: A2, B1, etc." 
              value={color}
              onChange={(e) => onColorChange?.(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prazo">Prazo de Entrega</Label>
            <Input 
              id="prazo" 
              type="date" 
              value={deliveryDeadline}
              onChange={(e) => onDeliveryDeadlineChange?.(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}