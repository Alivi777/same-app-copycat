import { useState } from "react";
import { ToothIcon } from "./tooth-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Smile, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ToothConfig {
  toothNumber: string;
  workType: string;
  implantType?: string;
}

interface ToothSelectionProps {
  onSelectionChange?: (selected: ToothConfig[]) => void;
}

const workTypes = [
  { value: "faceta", label: "Faceta" },
  { value: "onlay", label: "Onlay" },
  { value: "enceramento", label: "Enceramento" },
  { value: "protocolo", label: "Protocolo" },
  { value: "transformacao_sorriso", label: "Transformação de sorriso" },
  { value: "sob_dente", label: "Sob dente" },
  { value: "sob_implante", label: "Sob Implante" },
];

const implantTypes = [
  { value: "pilar_gt", label: "Pilar GT" },
  { value: "he_4.1_sem_link", label: "HE 4.1 (Sem link)" },
  { value: "he_4.1_com_link", label: "HE 4.1 (Com Link)" },
  { value: "mini_pilar", label: "Mini-Pilar" },
  { value: "munhao_universal_3.3x6", label: "Munhão Universal (3.3x6)" },
  { value: "munhao_universal_4.5x6", label: "Munhão Universal (4.5x6)" },
];

export function ToothSelection({ onSelectionChange }: ToothSelectionProps) {
  const [toothConfigs, setToothConfigs] = useState<ToothConfig[]>([]);

  // Dental notation: Upper teeth 11-18 (right) and 21-28 (left)
  // Lower teeth 31-38 (left) and 41-48 (right)
  const upperRight = ["18", "17", "16", "15", "14", "13", "12", "11"];
  const upperLeft = ["21", "22", "23", "24", "25", "26", "27", "28"];
  const lowerLeft = ["38", "37", "36", "35", "34", "33", "32", "31"];
  const lowerRight = ["41", "42", "43", "44", "45", "46", "47", "48"];

  const isToothSelected = (tooth: string) => {
    return toothConfigs.some(config => config.toothNumber === tooth);
  };

  const getToothConfig = (tooth: string) => {
    return toothConfigs.find(config => config.toothNumber === tooth);
  };

  const toggleTooth = (tooth: string) => {
    setToothConfigs((prev) => {
      if (isToothSelected(tooth)) {
        const newConfigs = prev.filter((config) => config.toothNumber !== tooth);
        onSelectionChange?.(newConfigs);
        return newConfigs;
      } else {
        const newConfigs = [...prev, { toothNumber: tooth, workType: "" }];
        onSelectionChange?.(newConfigs);
        return newConfigs;
      }
    });
  };

  const updateWorkType = (tooth: string, workType: string) => {
    setToothConfigs((prev) => {
      const newConfigs = prev.map((config) =>
        config.toothNumber === tooth
          ? { ...config, workType, implantType: workType !== "sob_implante" ? undefined : config.implantType }
          : config
      );
      onSelectionChange?.(newConfigs);
      return newConfigs;
    });
  };

  const updateImplantType = (tooth: string, implantType: string) => {
    setToothConfigs((prev) => {
      const newConfigs = prev.map((config) =>
        config.toothNumber === tooth
          ? { ...config, implantType }
          : config
      );
      onSelectionChange?.(newConfigs);
      return newConfigs;
    });
  };

  const removeTooth = (tooth: string) => {
    setToothConfigs((prev) => {
      const newConfigs = prev.filter((config) => config.toothNumber !== tooth);
      onSelectionChange?.(newConfigs);
      return newConfigs;
    });
  };

  const renderToothRow = (teeth: string[]) => (
    <div className="flex gap-2 justify-center">
      {teeth.map((tooth) => (
        <ToothIcon
          key={tooth}
          number={tooth}
          selected={isToothSelected(tooth)}
          onClick={() => toggleTooth(tooth)}
        />
      ))}
    </div>
  );

  const selectedConfigs = toothConfigs.filter(config => config.toothNumber);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Smile className="text-burgundy-500" size={20} />
          Seleção de Dentes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm text-gray-600 text-center">Arcada Superior</p>
          <div className="flex gap-8 justify-center">
            <div>
              <p className="text-xs text-gray-500 text-center mb-2">Direita</p>
              {renderToothRow(upperRight)}
            </div>
            <div>
              <p className="text-xs text-gray-500 text-center mb-2">Esquerda</p>
              {renderToothRow(upperLeft)}
            </div>
          </div>
        </div>

        <div className="border-t pt-6 space-y-3">
          <p className="text-sm text-gray-600 text-center">Arcada Inferior</p>
          <div className="flex gap-8 justify-center">
            <div>
              <p className="text-xs text-gray-500 text-center mb-2">Esquerda</p>
              {renderToothRow(lowerLeft)}
            </div>
            <div>
              <p className="text-xs text-gray-500 text-center mb-2">Direita</p>
              {renderToothRow(lowerRight)}
            </div>
          </div>
        </div>

        {/* Selected teeth configuration */}
        {selectedConfigs.length > 0 && (
          <div className="mt-6 border-t pt-6 space-y-4">
            <p className="text-sm font-semibold text-gray-700">Configuração dos Dentes Selecionados</p>
            <div className="space-y-4">
              {selectedConfigs.map((config) => (
                <div
                  key={config.toothNumber}
                  className="p-4 bg-gray-50 rounded-lg border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-burgundy-600">Dente {config.toothNumber}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTooth(config.toothNumber)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`workType-${config.toothNumber}`}>Tipo de Trabalho</Label>
                      <Select
                        value={config.workType}
                        onValueChange={(value) => updateWorkType(config.toothNumber, value)}
                      >
                        <SelectTrigger id={`workType-${config.toothNumber}`}>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {workTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {config.workType === "sob_implante" && (
                      <div className="space-y-2">
                        <Label htmlFor={`implantType-${config.toothNumber}`}>Tipo de Implante</Label>
                        <Select
                          value={config.implantType || ""}
                          onValueChange={(value) => updateImplantType(config.toothNumber, value)}
                        >
                          <SelectTrigger id={`implantType-${config.toothNumber}`}>
                            <SelectValue placeholder="Selecione o implante" />
                          </SelectTrigger>
                          <SelectContent>
                            {implantTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
