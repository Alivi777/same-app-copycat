import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "lucide-react";

interface ToothConfigurationProps {
  onConfigChange?: (config: any) => void;
}

export function ToothConfiguration({ onConfigChange }: ToothConfigurationProps) {
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
            <Select>
              <SelectTrigger id="material">
                <SelectValue placeholder="Selecione o material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="porcelana">Porcelana</SelectItem>
                <SelectItem value="resina">Resina</SelectItem>
                <SelectItem value="metalica">Metálica</SelectItem>
                <SelectItem value="zirconia">Zircônia</SelectItem>
                <SelectItem value="emax">E-max</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Prótese</Label>
            <Select>
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
            <Input id="cor" placeholder="Ex: A2, B1, etc." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prazo">Prazo de Entrega</Label>
            <Input id="prazo" type="date" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="observacoes">Observações Técnicas</Label>
          <Textarea
            id="observacoes"
            placeholder="Descreva detalhes específicos, características especiais, etc."
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );
}
