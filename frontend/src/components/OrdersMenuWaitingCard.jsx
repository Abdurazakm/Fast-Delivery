import React, { useState, useEffect } from "react";
import { Sparkles, Lightbulb, ChevronRight, Heart } from "lucide-react";
import Logo from "./Logo";

const CAMPUS_TIPS = [
  "💡 Pro Tip: Dedicated campus riders deliver straight to your dorm gate across Blocks 1–28!",
  "🍲 Fresh & Made to Order: Leyla's famous Ertib is assembled hot with fresh felafil and spiced bread.",
  "⚡ Peak Delivery: Stationed riders bring orders to your block cluster within 15 minutes.",
  "🥟 Perfect Combo: Try pairing crispy Sambusa or fresh layered Fetira with your evening meal.",
  "💳 Flexible Checkout: Pay via Telebirr, CBE mobile banking, or Cash on Delivery at your door.",
];

export default function OrdersMenuWaitingCard() {
  const [tipIndex, setTipIndex] = useState(0);
  const [taps, setTaps] = useState(0);
  const [isBouncing, setIsBouncing] = useState(false);

  // Automatically cycle through fun tips every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % CAMPUS_TIPS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleInteractiveTap = () => {
    setIsBouncing(true);
    setTaps((prev) => prev + 1);
    setTipIndex((prev) => (prev + 1) % CAMPUS_TIPS.length);
    setTimeout(() => setIsBouncing(false), 300);
  };

  return (
    <div
      onClick={handleInteractiveTap}
      className="bg-white/95 backdrop-blur-md rounded-3xl border border-amber-200/80 p-7 sm:p-10 text-center shadow-lg shadow-amber-500/5 space-y-5 transition-all select-none cursor-pointer hover:border-amber-300 group relative overflow-hidden"
    >
      {/* Subtle background ambient gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-50/40 via-transparent to-orange-50/20 pointer-events-none" />

      {/* Branded Logo with Ambient Backlight Glow */}
      <div className="relative flex items-center justify-center pt-2">
        {/* Warm Radiant Halo */}
        <div className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-600 blur-2xl opacity-40 animate-pulse pointer-events-none" />

        {/* Floating / Interactive Logo Badge */}
        <div
          className={`relative z-10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl shadow-orange-600/30 ring-2 ring-white/80 transition-transform duration-300 ${
            isBouncing ? "scale-110 rotate-2" : "animate-bounce-slow group-hover:scale-105"
          }`}
          style={{ width: 72, height: 72 }}
        >
          <img
            src="/logo.png"
            alt="Fetan Delivery"
            width={72}
            height={72}
            className="w-full h-full object-cover pointer-events-none"
          />
        </div>
      </div>

      {/* Engaging, Welcoming Title (No mention of DB price) */}
      <div className="space-y-1 relative z-10">
        <h3 className="text-base sm:text-lg font-black text-gray-950 tracking-tight flex items-center justify-center gap-2">
          <span>Preparing Today's Menu</span>
          <span className="text-amber-500 text-lg">✨</span>
        </h3>
        <p className="text-xs sm:text-sm font-medium text-gray-500 max-w-sm mx-auto leading-relaxed">
          Putting together fresh kitchen items and campus dorm delivery for you. Just a quick moment!
        </p>
      </div>

      {/* Sleek Velocity Loading Beam */}
      <div className="w-40 sm:w-48 h-1.5 bg-amber-100/90 rounded-full mx-auto overflow-hidden relative z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-full origin-left animate-[slideDown_1.1s_ease-in-out_infinite]" />
      </div>

      {/* Interactive Campus Dining Tip Banner */}
      <div className="relative z-10 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-50/90 border border-amber-200/70 text-amber-950 text-xs font-semibold max-w-md mx-auto shadow-xs transition hover:bg-amber-100/80">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
          <span className="transition-all duration-300 text-[11px] sm:text-xs">
            {CAMPUS_TIPS[tipIndex]}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-auto group-hover:translate-x-0.5 transition" />
        </div>

        {/* Playful interactive hint */}
        <div className="flex items-center justify-center gap-2 mt-3 text-[10px] text-gray-400 font-medium">
          <span>💡 Tap card to see next tip</span>
          {taps > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-100/80 px-2 py-0.5 rounded-full animate-in zoom-in-75">
              <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
              <span>{taps} taps</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
