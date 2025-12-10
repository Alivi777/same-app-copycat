import { useState } from "react";
import { ToothIcon } from "./tooth-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Smile, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ToothConfig {
  toothNumber: string;
  workType: string;
  implantType?: string;
}

interface ToothSelectionProps {
  onSelectionChange?: (selected: ToothConfig[]) => void;
}

const workTypes = [
  { value: "faceta", label: "Faceta", color: "bg-cyan-500 hover:bg-cyan-600" },
  { value: "onlay", label: "Onlay", color: "bg-green-600 hover:bg-green-700" },
  { value: "enceramento", label: "Enceramento", color: "bg-emerald-400 hover:bg-emerald-500" },
  { value: "copping", label: "Copping", color: "bg-amber-200 hover:bg-amber-300 text-amber-900" },
  { value: "provisorio_oco", label: "Provisório Oco", color: "bg-yellow-600 hover:bg-yellow-700" },
  { value: "pontico", label: "Pôntico", color: "bg-rose-900 hover:bg-rose-950" },
  { value: "sob_dente", label: "Sob dente", color: "bg-purple-600 hover:bg-purple-700" },
  { value: "sob_implante", label: "Sob Implante", color: "bg-blue-800 hover:bg-blue-900" },
];

const implantTypes = [
  { value: "pilar_gt", label: "Pilar GT", color: "bg-amber-600 hover:bg-amber-700" },
  { value: "he_4.1_sem_link", label: "HE 4.1 (Sem link)", color: "bg-cyan-600 hover:bg-cyan-700" },
  { value: "he_4.1_com_link", label: "HE 4.1 (Com Link)", color: "bg-indigo-600 hover:bg-indigo-700" },
  { value: "mini_pilar", label: "Mini-Pilar", color: "bg-rose-600 hover:bg-rose-700" },
  { value: "munhao_universal_3.3x6", label: "Munhão Universal (3.3x6)", color: "bg-violet-600 hover:bg-violet-700" },
  { value: "munhao_universal_4.5x6", label: "Munhão Universal (4.5x6)", color: "bg-fuchsia-600 hover:bg-fuchsia-700" },
];

export function ToothSelection({ onSelectionChange }: ToothSelectionProps) {
  const [toothConfigs, setToothConfigs] = useState<ToothConfig[]>([]);
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [dialogStep, setDialogStep] = useState<"workType" | "implantType">("workType");

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

  const handleToothClick = (tooth: string) => {
    setSelectedTooth(tooth);
    setDialogStep("workType");
  };

  const handleWorkTypeSelect = (workType: string) => {
    if (!selectedTooth) return;

    if (workType === "sob_implante") {
      setToothConfigs((prev) => {
        const existingIndex = prev.findIndex(c => c.toothNumber === selectedTooth);
        if (existingIndex >= 0) {
          const newConfigs = [...prev];
          newConfigs[existingIndex] = { ...newConfigs[existingIndex], workType };
          return newConfigs;
        }
        return [...prev, { toothNumber: selectedTooth, workType }];
      });
      setDialogStep("implantType");
    } else {
      setToothConfigs((prev) => {
        const existingIndex = prev.findIndex(c => c.toothNumber === selectedTooth);
        let newConfigs;
        if (existingIndex >= 0) {
          newConfigs = [...prev];
          newConfigs[existingIndex] = { toothNumber: selectedTooth, workType };
        } else {
          newConfigs = [...prev, { toothNumber: selectedTooth, workType }];
        }
        onSelectionChange?.(newConfigs);
        return newConfigs;
      });
      setSelectedTooth(null);
    }
  };

  const handleImplantTypeSelect = (implantType: string) => {
    if (!selectedTooth) return;

    setToothConfigs((prev) => {
      const newConfigs = prev.map((config) =>
        config.toothNumber === selectedTooth
          ? { ...config, implantType }
          : config
      );
      onSelectionChange?.(newConfigs);
      return newConfigs;
    });
    setSelectedTooth(null);
    setDialogStep("workType");
  };

  const handleRemoveTooth = () => {
    if (!selectedTooth) return;
    
    setToothConfigs((prev) => {
      const newConfigs = prev.filter((config) => config.toothNumber !== selectedTooth);
      onSelectionChange?.(newConfigs);
      return newConfigs;
    });
    setSelectedTooth(null);
    setDialogStep("workType");
  };

  const removeTooth = (tooth: string) => {
    setToothConfigs((prev) => {
      const newConfigs = prev.filter((config) => config.toothNumber !== tooth);
      onSelectionChange?.(newConfigs);
      return newConfigs;
    });
  };

  const getWorkTypeLabel = (value: string) => {
    return workTypes.find(t => t.value === value)?.label || value;
  };

  const getImplantTypeLabel = (value: string) => {
    return implantTypes.find(t => t.value === value)?.label || value;
  };

  const renderToothRow = (teeth: string[]) => (
    <div className="flex gap-2 justify-center">
      {teeth.map((tooth) => (
        <ToothIcon
          key={tooth}
          number={tooth}
          selected={isToothSelected(tooth)}
          onClick={() => handleToothClick(tooth)}
        />
      ))}
    </div>
  );

  const selectedConfigs = toothConfigs.filter(config => config.toothNumber && config.workType);
  const currentToothConfig = selectedTooth ? getToothConfig(selectedTooth) : null;

  return (
    <>
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

          {/* Selected teeth summary */}
          {selectedConfigs.length > 0 && (
            <div className="mt-6 border-t pt-6 space-y-4">
              <p className="text-sm font-semibold text-gray-700">Dentes Configurados</p>
              <div className="flex flex-wrap gap-2">
                {selectedConfigs.map((config) => {
                  const workType = workTypes.find(t => t.value === config.workType);
                  return (
                    <div
                      key={config.toothNumber}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm ${workType?.color.split(' ')[0] || 'bg-gray-600'}`}
                    >
                      <span className="font-bold">Dente {config.toothNumber}</span>
                      <span className="opacity-80">- {getWorkTypeLabel(config.workType)}</span>
                      {config.implantType && (
                        <span className="opacity-80">({getImplantTypeLabel(config.implantType)})</span>
                      )}
                      <button
                        onClick={() => removeTooth(config.toothNumber)}
                        className="ml-1 hover:bg-white/20 rounded p-0.5"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tooth Configuration Dialog */}
      <Dialog open={selectedTooth !== null} onOpenChange={(open) => !open && setSelectedTooth(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogStep === "implantType" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => setDialogStep("workType")}
                >
                  <ArrowLeft size={18} />
                </Button>
              )}
              Dente {selectedTooth}
              {dialogStep === "implantType" && <span className="text-muted-foreground"> - Tipo de Implante</span>}
            </DialogTitle>
          </DialogHeader>

          {dialogStep === "workType" ? (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Tipo de Trabalho</Label>
              <div className="grid grid-cols-2 gap-3">
                {workTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleWorkTypeSelect(type.value)}
                    className={`p-4 rounded-lg text-white font-medium text-sm transition-all ${type.color} ${
                      currentToothConfig?.workType === type.value ? 'ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              
              {currentToothConfig && (
                <div className="pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={handleRemoveTooth}
                    className="w-full"
                  >
                    Remover Dente
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Selecione o Tipo de Implante</Label>
              <div className="grid grid-cols-2 gap-3">
                {implantTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleImplantTypeSelect(type.value)}
                    className={`p-4 rounded-lg text-white font-medium text-sm transition-all ${type.color}`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
