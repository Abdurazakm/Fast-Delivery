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
          className="relative z-10 rounded-3xl overflow-hidden shadow-2xl shadow-orange-600/40 ring-2 ring-white/60 animate-bounce-slow bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600"
        >
          {/* Zero-latency fallback vector silhouette */}
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <svg viewBox="0 0 512 512" fill="#ffffff" className="w-full h-full drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="285" cy="160" rx="22" ry="18" />
              <path d="M 276 174 C 276 174 277 184 275 190 H 295 C 293 184 294 174 294 174 Z" />
              <path d="M 169 295 C 169 203, 221 185, 285 185 C 349 185, 401 203, 401 295 Z" />
              <rect x="142" y="312" width="278" height="26" rx="13" />
              <path d="M 205 338 L 222 352 H 350 L 365 338 Z" opacity="0.95" />
              <rect x="92" y="215" width="93" height="18" rx="9" />
              <rect x="58" y="255" width="117" height="20" rx="10" />
              <rect x="88" y="295" width="67" height="18" rx="9" />
            </svg>
          </div>
          <img
            src="/logo.png"
            alt="Fetan Delivery"
            width={size}
            height={size}
            className="w-full h-full object-cover relative z-10 transition-opacity duration-300"
            loading="eager"
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
