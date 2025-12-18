interface NeonControlPanelProps {
  title: string;
  children: React.ReactNode;
  color?: string;
  isEditMode?: boolean;
}

export const NeonControlPanel = ({
  title,
  children,
  color = "#22d3ee",
  isEditMode = false,
}: NeonControlPanelProps) => {
  return (
    <div
      className={`relative rounded-lg overflow-hidden transition-all duration-300 ${
        isEditMode ? "ring-2 ring-white/50" : ""
      }`}
      style={{
        background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)`,
        border: `1px solid ${color}30`,
        boxShadow: `0 0 20px ${color}10, inset 0 1px 0 ${color}20`,
      }}
    >
      {/* Animated border glow */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
          animation: "shimmer 3s ease-in-out infinite",
        }}
      />

      {/* Header */}
      <div
        className="px-3 py-2 border-b flex items-center gap-2"
        style={{ borderColor: `${color}20` }}
      >
        {/* Blinking indicator */}
        <div className="flex gap-1">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
          />
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor: color,
              opacity: 0.5,
              animationDelay: "0.5s",
            }}
          />
        </div>

        <h3
          className="font-bold text-xs uppercase tracking-wider"
          style={{ color, textShadow: `0 0 10px ${color}50` }}
        >
          {title}
        </h3>

        {/* Status indicator */}
        <div className="ml-auto flex items-center gap-1">
          <span className="text-[8px] uppercase opacity-50" style={{ color }}>
            ONLINE
          </span>
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: "#10b981",
              boxShadow: "0 0 6px #10b981",
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-3">{children}</div>

      {/* Corner decorations */}
      <div
        className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2"
        style={{ borderColor: color }}
      />
      <div
        className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2"
        style={{ borderColor: color }}
      />
      <div
        className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2"
        style={{ borderColor: color }}
      />
      <div
        className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2"
        style={{ borderColor: color }}
      />
    </div>
  );
};
