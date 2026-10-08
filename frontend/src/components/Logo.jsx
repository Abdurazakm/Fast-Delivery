import React from "react";

/**
 * Fetan Delivery Official Brand Logo Component
 * Uses the official master /logo.png with responsive sizing, rounded squircle curvature, and ambient effects.
 */
export default function Logo({
  variant = "mark", // "mark" | "effect" | "full"
  size = "md",
  showText = false,
  subtitle = "AASTU Campus",
  className = "",
  onClick,
}) {
  // Dimension mapping
  const sizeMap = {
    xs: { dim: 22, text: "text-xs", sub: "text-[9px]", radius: "rounded-lg" },
    sm: { dim: 30, text: "text-sm", sub: "text-[10px]", radius: "rounded-xl" },
    md: { dim: 40, text: "text-base sm:text-lg", sub: "text-[10px] sm:text-[11px]", radius: "rounded-2xl" },
    lg: { dim: 52, text: "text-xl sm:text-2xl", sub: "text-xs", radius: "rounded-2xl" },
    xl: { dim: 68, text: "text-2xl sm:text-3xl", sub: "text-sm", radius: "rounded-3xl" },
    "2xl": { dim: 96, text: "text-4xl", sub: "text-base", radius: "rounded-3xl" },
  };

  const selectedSize =
    typeof size === "string" && sizeMap[size]
      ? sizeMap[size]
      : { dim: size || 40, text: "text-base", sub: "text-[10px]", radius: "rounded-2xl" };
  const px = selectedSize.dim;

  // The Master Logo Mark using /logo.png
  const renderMark = () => (
    <div
      style={{ width: px, height: px }}
      className={`relative shrink-0 ${selectedSize.radius} overflow-hidden shadow-sm shadow-orange-500/20 group-hover:scale-105 transition-transform duration-200 ${className}`}
    >
      <img
        src="/logo.png"
        alt="Fetan Delivery Logo"
        width={px}
        height={px}
        className="w-full h-full object-cover select-none pointer-events-none"
        loading="eager"
      />
    </div>
  );

  // Industry-standard Ambient Effect Variant (breathing float + radiant warm backlight glow)
  if (variant === "effect") {
    return (
      <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
        {/* Radiant warm ambient backlight aura */}
        <div
          className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-600 blur-xl opacity-40 animate-pulse pointer-events-none"
          style={{ width: px * 1.15, height: px * 1.15 }}
        />

        {/* Breathing logo image */}
        <div
          style={{ width: px, height: px }}
          className={`relative z-10 ${selectedSize.radius} overflow-hidden shadow-xl shadow-orange-600/30 ring-1 ring-white/40 transition-transform duration-500 hover:scale-105`}
        >
          <img
            src="/logo.png"
            alt="Fetan Delivery"
            width={px}
            height={px}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    );
  }

  const mark = renderMark();

  if (variant === "full" || showText) {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center gap-2.5 sm:gap-3 group select-none ${
          onClick ? "cursor-pointer" : ""
        } ${className}`}
      >
        {mark}
        <div className="flex flex-col">
          <span
            className={`font-black tracking-tight text-gray-950 group-hover:text-amber-600 transition leading-tight ${selectedSize.text}`}
          >
            Fetan <span className="text-amber-600">Delivery</span>
          </span>
          {subtitle && (
            <span
              className={`uppercase font-bold tracking-wider text-amber-700 leading-none ${selectedSize.sub}`}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>
    );
  }

  return mark;
}
