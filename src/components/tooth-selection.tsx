import { useState } from "react";
import { ToothIcon } from "./tooth-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smile } from "lucide-react";

interface ToothSelectionProps {
  onSelectionChange?: (selected: string[]) => void;
}

export function ToothSelection({ onSelectionChange }: ToothSelectionProps) {
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);

  // Dental notation: Upper teeth 11-18 (right) and 21-28 (left)
  // Lower teeth 31-38 (left) and 41-48 (right)
  const upperRight = ["18", "17", "16", "15", "14", "13", "12", "11"];
  const upperLeft = ["21", "22", "23", "24", "25", "26", "27", "28"];
  const lowerLeft = ["38", "37", "36", "35", "34", "33", "32", "31"];
  const lowerRight = ["41", "42", "43", "44", "45", "46", "47", "48"];

  const toggleTooth = (tooth: string) => {
    setSelectedTeeth((prev) => {
      const newSelection = prev.includes(tooth)
        ? prev.filter((t) => t !== tooth)
        : [...prev, tooth];
      onSelectionChange?.(newSelection);
      return newSelection;
    });
  };

  const renderToothRow = (teeth: string[]) => (
    <div className="flex gap-2 justify-center">
      {teeth.map((tooth) => (
        <ToothIcon
          key={tooth}
          number={tooth}
          selected={selectedTeeth.includes(tooth)}
          onClick={() => toggleTooth(tooth)}
        />
      ))}
    </div>
  );

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

        {selectedTeeth.length > 0 && (
          <div className="mt-4 p-3 bg-burgundy-50 rounded-lg">
            <p className="text-sm font-semibold text-burgundy-900">
              Dentes selecionados: {selectedTeeth.join(", ")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
