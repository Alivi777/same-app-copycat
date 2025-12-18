interface Order {
  id: string;
  order_number: string;
  patient_name: string;
  status: string;
  assigned_to: string | null;
  assigned_user?: { username: string } | null;
}

interface ComputerWorkstationProps {
  colorHex: string;
  orders: { order: Order; index: number }[];
  isSelected: boolean;
}

export const ComputerWorkstation = ({
  colorHex,
  orders,
  isSelected,
}: ComputerWorkstationProps) => {
  return (
    <div className="relative">
      {/* Monitor Frame */}
      <div
        className={`relative w-20 h-14 rounded-md border-2 overflow-hidden transition-all duration-300 ${
          isSelected ? "scale-105" : ""
        }`}
        style={{
          borderColor: colorHex,
          background: `linear-gradient(180deg, ${colorHex}05 0%, ${colorHex}20 100%)`,
          boxShadow: `0 0 ${isSelected ? "25px" : "15px"} ${colorHex}50, inset 0 0 15px ${colorHex}10`,
        }}
      >
        {/* Screen bezel effect */}
        <div
          className="absolute inset-1 rounded-sm overflow-hidden"
          style={{ backgroundColor: "#0a0f1a" }}
        >
          {/* Scanlines */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${colorHex}10 2px, ${colorHex}10 3px)`,
            }}
          />

          {/* Screen glow */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at center, ${colorHex}30 0%, transparent 70%)`,
              animation: "pulse 3s ease-in-out infinite",
            }}
          />

          {/* Matrix-like data effect */}
          <div className="absolute inset-0 opacity-20 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="absolute text-[6px] font-mono whitespace-nowrap"
                style={{
                  color: colorHex,
                  top: `${i * 25}%`,
                  left: 0,
                  animation: `scroll-left ${3 + i}s linear infinite`,
                  animationDelay: `${i * 0.5}s`,
                }}
              >
                {`010110 ${orders.length} JOBS 101001 ACTIVE 110010`.repeat(3)}
              </div>
            ))}
          </div>

          {/* Order chips display */}
          <div className="absolute inset-0 flex items-center justify-center gap-1 flex-wrap p-1">
            {orders.slice(0, 6).map(({ order, index }) => (
              <div
                key={order.id}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border"
                style={{
                  backgroundColor: `${colorHex}40`,
                  borderColor: colorHex,
                  color: colorHex,
                  boxShadow: `0 0 6px ${colorHex}60`,
                }}
                title={`#${index + 1} - ${order.patient_name}`}
              >
                {index + 1}
              </div>
            ))}
            {orders.length > 6 && (
              <div
                className="text-[8px] font-bold"
                style={{ color: colorHex }}
              >
                +{orders.length - 6}
              </div>
            )}
          </div>
        </div>

        {/* Screen reflection */}
        <div
          className="absolute top-1 left-1 right-1 h-3 rounded-t-sm opacity-20"
          style={{
            background: `linear-gradient(180deg, ${colorHex}40, transparent)`,
          }}
        />

        {/* Power LED */}
        <div
          className="absolute bottom-0.5 right-1 w-1.5 h-1.5 rounded-full animate-pulse"
          style={{
            backgroundColor: "#10b981",
            boxShadow: "0 0 4px #10b981",
          }}
        />
      </div>

      {/* Monitor Stand */}
      <div className="flex flex-col items-center">
        <div
          className="w-4 h-3 rounded-b-sm"
          style={{
            backgroundColor: `${colorHex}40`,
            boxShadow: `0 2px 4px ${colorHex}20`,
          }}
        />
        <div
          className="w-10 h-1.5 rounded-full"
          style={{
            backgroundColor: `${colorHex}30`,
            boxShadow: `0 0 8px ${colorHex}20`,
          }}
        />
      </div>

      {/* Keyboard hint */}
      <div
        className="mt-1 w-14 h-2 mx-auto rounded-sm opacity-50"
        style={{
          backgroundColor: `${colorHex}20`,
          border: `1px solid ${colorHex}30`,
        }}
      />
    </div>
  );
};
