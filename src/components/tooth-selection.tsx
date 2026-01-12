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
  material?: string;
}

interface ToothSelectionProps {
  onSelectionChange?: (selected: ToothConfig[]) => void;
}

const workTypes = [
  { value: "faceta", label: "Faceta", color: "bg-cyan-500 hover:bg-cyan-600" },
  { value: "onlay", label: "Onlay", color: "bg-green-600 hover:bg-green-700" },
  { value: "enceramento", label: "Enceramento", color: "bg-emerald-400 hover:bg-emerald-500" },
  { value: "coping", label: "Coping", color: "bg-amber-200 hover:bg-amber-300 text-amber-900" },
  { value: "provisorio_oco", label: "Provisório Oco", color: "bg-yellow-600 hover:bg-yellow-700" },
  { value: "pontico", label: "Pôntico", color: "bg-rose-900 hover:bg-rose-950" },
  { value: "sobre_dente", label: "Sobre Dente", color: "bg-purple-600 hover:bg-purple-700" },
  { value: "sobre_implante", label: "Sobre Implante", color: "bg-blue-800 hover:bg-blue-900" },
];

const implantTypes = [
  { value: "pilar_gt", label: "Pilar GT", color: "bg-amber-600 hover:bg-amber-700" },
  { value: "he_4.1_sem_link", label: "HE 4.1 (Sem link)", color: "bg-cyan-600 hover:bg-cyan-700" },
  { value: "he_4.1_com_link", label: "HE 4.1 (Com Link)", color: "bg-indigo-600 hover:bg-indigo-700" },
  { value: "mini_pilar", label: "Mini-Pilar", color: "bg-rose-600 hover:bg-rose-700" },
  { value: "munhao_universal_3.3x4", label: "Munhão Universal (3.3x4)", color: "bg-pink-600 hover:bg-pink-700" },
  { value: "munhao_universal_3.3x6", label: "Munhão Universal (3.3x6)", color: "bg-violet-600 hover:bg-violet-700" },
  { value: "munhao_universal_4.5x4", label: "Munhão Universal (4.5x4)", color: "bg-orange-600 hover:bg-orange-700" },
  { value: "munhao_universal_4.5x6", label: "Munhão Universal (4.5x6)", color: "bg-fuchsia-600 hover:bg-fuchsia-700" },
  { value: "pilar_cm_ws", label: "PILAR CM_WS", color: "bg-teal-600 hover:bg-teal-700" },
];

const materials = [
  { value: "dissilicato", label: "Dissilicato", color: "bg-slate-600 hover:bg-slate-700" },
  { value: "zirconia", label: "Zirconia", color: "bg-stone-500 hover:bg-stone-600" },
  { value: "pmma", label: "PMMA", color: "bg-zinc-500 hover:bg-zinc-600" },
  { value: "modelo_3d", label: "Modelo 3D", color: "bg-neutral-600 hover:bg-neutral-700" },
];

// Preset options for quick selection
const presetOptions = [
  { value: "none", label: "Selecione um preset" },
  { value: "placa_miorrelaxante", label: "Placa Miorrelaxante" },
];

// Teeth to select for Placa Miorrelaxante
const placaMiorrelaxanteTeeth = {
  upper: ["16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26"],
  lower: ["46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36"],
};

export function ToothSelection({ onSelectionChange }: ToothSelectionProps) {
  const [toothConfigs, setToothConfigs] = useState<ToothConfig[]>([]);
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [dialogStep, setDialogStep] = useState<"workType" | "implantType" | "material">("workType");
  const [lastConfiguredTooth, setLastConfiguredTooth] = useState<ToothConfig | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>("none");
  const [previousConfigs, setPreviousConfigs] = useState<ToothConfig[]>([]);

  const upperRight = ["18", "17", "16", "15", "14", "13", "12", "11"];
  const upperLeft = ["21", "22", "23", "24", "25", "26", "27", "28"];
  const lowerRight = ["48", "47", "46", "45", "44", "43", "42", "41"];
  const lowerLeft = ["31", "32", "33", "34", "35", "36", "37", "38"];

  const handlePresetChange = (value: string) => {
    if (value === "placa_miorrelaxante") {
      // Save current configs before applying preset
      setPreviousConfigs(toothConfigs);
      
      // Select all teeth for Placa Miorrelaxante
      const allPresetTeeth = [...placaMiorrelaxanteTeeth.upper, ...placaMiorrelaxanteTeeth.lower];
      const newConfigs: ToothConfig[] = allPresetTeeth.map((tooth) => ({
        toothNumber: tooth,
        workType: "placa_miorrelaxante",
        material: "pmma",
      }));
      
      setToothConfigs(newConfigs);
      onSelectionChange?.(newConfigs);
      setSelectedPreset(value);
    } else if (value === "none") {
      // Restore previous configs or clear
      setToothConfigs(previousConfigs);
      onSelectionChange?.(previousConfigs);
      setSelectedPreset(value);
    }
  };

  // Full dental arch order for range selection
  const upperArch = [...upperRight, ...upperLeft];
  const lowerArch = [...lowerLeft, ...lowerRight];
  const allTeeth = [...upperArch, ...lowerArch];

  const isToothSelected = (tooth: string) => {
    return toothConfigs.some(config => config.toothNumber === tooth);
  };

  const getToothConfig = (tooth: string) => {
    return toothConfigs.find(config => config.toothNumber === tooth);
  };

  const getTeethInRange = (startTooth: string, endTooth: string): string[] => {
    const startIndex = allTeeth.indexOf(startTooth);
    const endIndex = allTeeth.indexOf(endTooth);
    
    if (startIndex === -1 || endIndex === -1) return [endTooth];
    
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    
    return allTeeth.slice(minIndex, maxIndex + 1);
  };

  const handleToothClick = (tooth: string, ctrlKey: boolean, shiftKey: boolean) => {
    // If Shift is pressed and we have a last configured tooth, copy to range
    if (shiftKey && lastConfiguredTooth && lastConfiguredTooth.material) {
      const teethInRange = getTeethInRange(lastConfiguredTooth.toothNumber, tooth);
      
      setToothConfigs((prev) => {
        let newConfigs = [...prev];
        
        teethInRange.forEach((toothNum) => {
          const newConfig: ToothConfig = {
            toothNumber: toothNum,
            workType: lastConfiguredTooth.workType,
            implantType: lastConfiguredTooth.implantType,
            material: lastConfiguredTooth.material,
          };
          
          const existingIndex = newConfigs.findIndex(c => c.toothNumber === toothNum);
          if (existingIndex >= 0) {
            newConfigs[existingIndex] = newConfig;
          } else {
            newConfigs.push(newConfig);
          }
        });
        
        onSelectionChange?.(newConfigs);
        return newConfigs;
      });
      
      // Update last configured tooth to the end of range
      setLastConfiguredTooth({
        toothNumber: tooth,
        workType: lastConfiguredTooth.workType,
        implantType: lastConfiguredTooth.implantType,
        material: lastConfiguredTooth.material,
      });
      return;
    }
    
    // If Ctrl is pressed and we have a last configured tooth, copy the configuration
    if (ctrlKey && lastConfiguredTooth && lastConfiguredTooth.material) {
      const newConfig: ToothConfig = {
        toothNumber: tooth,
        workType: lastConfiguredTooth.workType,
        implantType: lastConfiguredTooth.implantType,
        material: lastConfiguredTooth.material,
      };
      
      setToothConfigs((prev) => {
        const existingIndex = prev.findIndex(c => c.toothNumber === tooth);
        let newConfigs;
        if (existingIndex >= 0) {
          newConfigs = [...prev];
          newConfigs[existingIndex] = newConfig;
        } else {
          newConfigs = [...prev, newConfig];
        }
        onSelectionChange?.(newConfigs);
        return newConfigs;
      });
      
      setLastConfiguredTooth(newConfig);
      return;
    }
    
    setSelectedTooth(tooth);
    setDialogStep("workType");
  };

  const handleWorkTypeSelect = (workType: string) => {
    if (!selectedTooth) return;

    setToothConfigs((prev) => {
      const existingIndex = prev.findIndex(c => c.toothNumber === selectedTooth);
      if (existingIndex >= 0) {
        const newConfigs = [...prev];
        newConfigs[existingIndex] = { ...newConfigs[existingIndex], workType, implantType: undefined };
        return newConfigs;
      }
      return [...prev, { toothNumber: selectedTooth, workType }];
    });

    if (workType === "sobre_implante") {
      setDialogStep("implantType");
    } else {
      setDialogStep("material");
    }
  };

  const handleImplantTypeSelect = (implantType: string) => {
    if (!selectedTooth) return;

    setToothConfigs((prev) => {
      return prev.map((config) =>
        config.toothNumber === selectedTooth
          ? { ...config, implantType }
          : config
      );
    });
    setDialogStep("material");
  };

  const handleMaterialSelect = (material: string) => {
    if (!selectedTooth) return;

    setToothConfigs((prev) => {
      const newConfigs = prev.map((config) =>
        config.toothNumber === selectedTooth
          ? { ...config, material }
          : config
      );
      
      // Save the last configured tooth for Ctrl+Click copying
      const configuredTooth = newConfigs.find(c => c.toothNumber === selectedTooth);
      if (configuredTooth) {
        setLastConfiguredTooth(configuredTooth);
      }
      
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

  const getMaterialLabel = (value: string) => {
    return materials.find(t => t.value === value)?.label || value;
  };

  const getMaterialAbbreviation = (value: string) => {
    const abbreviations: Record<string, string> = {
      zirconia: "ZrO2",
      dissilicato: "Diss",
    };
    return abbreviations[value] || getMaterialLabel(value);
  };

  const renderToothRow = (teeth: string[]) => (
    <div className="flex gap-2 justify-center">
      {teeth.map((tooth) => (
        <ToothIcon
          key={tooth}
          number={tooth}
          selected={isToothSelected(tooth)}
          onClick={(e) => handleToothClick(tooth, e.ctrlKey || e.metaKey, e.shiftKey)}
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <Smile className="text-burgundy-500" size={20} />
              Seleção de Dentes
            </CardTitle>
            <Button
              variant={selectedPreset === "placa_miorrelaxante" ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetChange(selectedPreset === "placa_miorrelaxante" ? "none" : "placa_miorrelaxante")}
            >
              Placa Miorrelaxante
            </Button>
          </div>
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
                <p className="text-xs text-gray-500 text-center mb-2">Direita</p>
                {renderToothRow(lowerRight)}
              </div>
              <div>
                <p className="text-xs text-gray-500 text-center mb-2">Esquerda</p>
                {renderToothRow(lowerLeft)}
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
                      {config.material && (
                        <span className="opacity-80">[{getMaterialAbbreviation(config.material)}]</span>
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
              {(dialogStep === "implantType" || dialogStep === "material") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => {
                    if (dialogStep === "material") {
                      const config = getToothConfig(selectedTooth!);
                      if (config?.workType === "sobre_implante") {
                        setDialogStep("implantType");
                      } else {
                        setDialogStep("workType");
                      }
                    } else {
                      setDialogStep("workType");
                    }
                  }}
                >
                  <ArrowLeft size={18} />
                </Button>
              )}
              Dente {selectedTooth}
              {dialogStep === "implantType" && <span className="text-muted-foreground"> - Tipo de Implante</span>}
              {dialogStep === "material" && <span className="text-muted-foreground"> - Material</span>}
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
              
              <div className="pt-4 border-t flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleRemoveTooth}
                  className="flex-1"
                >
                  Limpar
                </Button>
                <Button
                  onClick={() => setSelectedTooth(null)}
                  className="flex-1"
                >
                  Ok
                </Button>
              </div>
            </div>
          ) : dialogStep === "implantType" ? (
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
          ) : (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Selecione o Material</Label>
              <div className="grid grid-cols-2 gap-3">
                {materials.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleMaterialSelect(type.value)}
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
