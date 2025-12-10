import { cn } from "@/lib/utils";
import { MouseEvent } from "react";

interface ToothIconProps {
  selected?: boolean;
  disabled?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  className?: string;
  number?: string;
}

export function ToothIcon({ selected, disabled, onClick, className, number }: ToothIconProps) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={cn(
        "relative flex flex-col items-center justify-center p-2 rounded-lg transition-all cursor-pointer",
        selected
          ? "bg-burgundy-500 text-white"
          : "bg-white border-2 border-gray-200 hover:border-burgundy-300 text-gray-700",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {number && (
        <span className="text-xs font-bold mb-1">{number}</span>
      )}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6"
      >
        <path
          d="M12 3C9.5 3 7.5 4.5 6.5 6.5C5.5 8.5 5 11 5 13.5C5 16 5.5 18.5 6.5 20C7.5 21.5 9 22 10.5 22C11.5 22 12 21.5 12 20.5V19.5C12 18.5 12 17.5 12 16.5V8C12 6.5 12 5 12 4C12 3.5 12 3 12 3Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={selected ? "currentColor" : "none"}
        />
        <path
          d="M12 3C14.5 3 16.5 4.5 17.5 6.5C18.5 8.5 19 11 19 13.5C19 16 18.5 18.5 17.5 20C16.5 21.5 15 22 13.5 22C12.5 22 12 21.5 12 20.5V19.5C12 18.5 12 17.5 12 16.5V8C12 6.5 12 5 12 4C12 3.5 12 3 12 3Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={selected ? "currentColor" : "none"}
        />
      </svg>
    </div>
  );
}
