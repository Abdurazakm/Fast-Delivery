import React from "react";

/**
 * Industry-standard branded PageLoader.
 * Features the official Fetan Delivery logo with an ambient breathing backlight aura,
 * subtle 3D floating animation, and a sleek velocity loading beam.
 * No generic rotating spinners.
 */
export default function PageLoader({
  message = "Loading Fetan Delivery...",
  subtext = "Fast campus food delivery across AASTU",
  fullScreen = true,
  size = 84, // size in pixels for the logo
}) {
  const content = (
    <div className="flex flex-col items-center justify-center text-center p-6 select-none animate-in fade-in duration-300">
      {/* Branded Logo with Ambient Breathing Effect */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Warm Ambient Radiant Halo / Backlight Aura */}
        <div
          className="absolute rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 blur-2xl opacity-50 animate-pulse pointer-events-none"
          style={{ width: size * 1.35, height: size * 1.35 }}
        />

        {/* Breathing Logo Badge */}
        <div
          style={{ width: size, height: size }}
          className="relative z-10 rounded-3xl overflow-hidden shadow-2xl shadow-orange-600/40 ring-2 ring-white/60 animate-bounce-slow"
        >
          <img
            src="/logo.png"
            alt="Fetan Delivery"
            width={size}
            height={size}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Brand Title */}
      <h3 className="text-lg sm:text-xl font-black text-gray-950 tracking-tight flex items-center gap-1.5">
        <span>Fetan</span>
        <span className="text-amber-600">Delivery</span>
      </h3>

      {/* Dynamic Status / Message */}
      <p className="text-xs sm:text-sm font-semibold text-gray-600 mt-1 max-w-xs">
        {message}
      </p>

      {subtext && (
        <span className="text-[11px] text-gray-400 font-medium mt-0.5">
          {subtext}
        </span>
      )}

      {/* Sleek Velocity Loading Beam */}
      <div className="w-36 h-1.5 bg-amber-100 rounded-full mt-5 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-full origin-left animate-[slideDown_1.1s_ease-in-out_infinite]" />
      </div>
    </div>
  );

  if (!fullScreen) {
    return <div className="py-12 flex items-center justify-center w-full">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-md">
      {content}
    </div>
  );
}
