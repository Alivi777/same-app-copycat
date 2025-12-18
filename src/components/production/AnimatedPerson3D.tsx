import { useState } from "react";

interface AnimatedPerson3DProps {
  name: string;
  color: string;
  colorHex: string;
  isSelected: boolean;
  onClick: () => void;
  orderCount: number;
}

export const AnimatedPerson3D = ({
  name,
  color,
  colorHex,
  isSelected,
  onClick,
  orderCount,
}: AnimatedPerson3DProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative cursor-pointer transition-all duration-300 ${
        isSelected ? "scale-110" : isHovered ? "scale-105" : ""
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow ring when selected */}
      {isSelected && (
        <div
          className="absolute -inset-4 rounded-full animate-ping opacity-30"
          style={{ backgroundColor: colorHex }}
        />
      )}

      {/* Base platform with glow */}
      <div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-2 rounded-full blur-sm"
        style={{
          backgroundColor: colorHex,
          opacity: isSelected ? 0.8 : 0.4,
          boxShadow: `0 0 20px ${colorHex}`,
        }}
      />

      {/* 3D Person SVG with animations */}
      <svg
        className={`w-14 h-14 transition-all duration-300 ${color}`}
        viewBox="0 0 100 120"
        style={{
          filter: `drop-shadow(0 0 ${isSelected ? "15px" : "8px"} ${colorHex})`,
          transform: isHovered ? "translateY(-4px)" : "",
        }}
      >
        {/* Body glow background */}
        <ellipse
          cx="50"
          cy="90"
          rx="30"
          ry="25"
          fill={colorHex}
          opacity="0.2"
          className={isSelected ? "animate-pulse" : ""}
        />

        {/* Head */}
        <circle
          cx="50"
          cy="25"
          r="18"
          fill="currentColor"
          className={isSelected ? "animate-bounce" : ""}
          style={{ animationDuration: "2s" }}
        />

        {/* Face glow */}
        <circle cx="50" cy="25" r="16" fill={colorHex} opacity="0.3" />

        {/* Eyes */}
        <ellipse cx="44" cy="23" rx="3" ry="4" fill="#0f172a" opacity="0.8">
          <animate
            attributeName="ry"
            values="4;1;4"
            dur="3s"
            repeatCount="indefinite"
          />
        </ellipse>
        <ellipse cx="56" cy="23" rx="3" ry="4" fill="#0f172a" opacity="0.8">
          <animate
            attributeName="ry"
            values="4;1;4"
            dur="3s"
            repeatCount="indefinite"
          />
        </ellipse>

        {/* Visor/glasses (cyberpunk style) */}
        <rect
          x="35"
          y="20"
          width="30"
          height="8"
          rx="2"
          fill={colorHex}
          opacity="0.6"
        >
          <animate
            attributeName="opacity"
            values="0.6;0.9;0.6"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </rect>

        {/* Body */}
        <path
          d="M50 45 C25 45 15 65 15 85 L15 95 C15 100 20 105 30 105 L70 105 C80 105 85 100 85 95 L85 85 C85 65 75 45 50 45"
          fill="currentColor"
        />

        {/* Body glow overlay */}
        <path
          d="M50 45 C25 45 15 65 15 85 L15 95 C15 100 20 105 30 105 L70 105 C80 105 85 100 85 95 L85 85 C85 65 75 45 50 45"
          fill={colorHex}
          opacity="0.2"
        />

        {/* Chest circuit lines */}
        <path
          d="M40 60 L40 80 M60 60 L60 80 M35 70 L65 70"
          stroke={colorHex}
          strokeWidth="2"
          opacity="0.5"
        >
          <animate
            attributeName="opacity"
            values="0.3;0.8;0.3"
            dur="2s"
            repeatCount="indefinite"
          />
        </path>

        {/* Shoulder pads */}
        <ellipse cx="25" cy="55" rx="12" ry="8" fill="currentColor" />
        <ellipse cx="75" cy="55" rx="12" ry="8" fill="currentColor" />

        {/* Arms with animation */}
        <g className={isSelected ? "" : ""}>
          <path
            d="M15 55 L5 75 L8 85 L18 70 L25 55"
            fill="currentColor"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 15 55;5 15 55;0 15 55"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
          <path
            d="M85 55 L95 75 L92 85 L82 70 L75 55"
            fill="currentColor"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 85 55;-5 85 55;0 85 55"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
        </g>

        {/* Order count badge */}
        {orderCount > 0 && (
          <g>
            <circle cx="75" cy="20" r="12" fill={colorHex} />
            <text
              x="75"
              y="25"
              textAnchor="middle"
              fill="#0f172a"
              fontSize="12"
              fontWeight="bold"
            >
              {orderCount}
            </text>
          </g>
        )}
      </svg>

      {/* Name label with glow */}
      <div
        className="text-center mt-1 font-bold text-xs uppercase tracking-widest transition-all"
        style={{
          color: colorHex,
          textShadow: isSelected
            ? `0 0 10px ${colorHex}, 0 0 20px ${colorHex}`
            : `0 0 5px ${colorHex}50`,
        }}
      >
        {name}
      </div>

      {/* Info tooltip on hover */}
      {isHovered && (
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg text-xs whitespace-nowrap animate-fade-in z-50"
          style={{
            backgroundColor: `${colorHex}20`,
            border: `1px solid ${colorHex}`,
            color: colorHex,
            boxShadow: `0 0 20px ${colorHex}40`,
          }}
        >
          <div className="font-bold">{name}</div>
          <div className="opacity-70">{orderCount} pedido(s) ativo(s)</div>
        </div>
      )}
    </div>
  );
};
