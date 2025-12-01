import { useEffect, useState } from "react";

export default function OrderingInfoCards({ serverOffsetMs = 0 }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isClosed, setIsClosed] = useState(false);
  const [showCards, setShowCards] = useState(true);
  const lastOrderingHour = 18; // 6:00 PM

  // Check service day
  useEffect(() => {
    const checkServiceDay = () => {
      const now = new Date(Date.now() + serverOffsetMs);
      const day = now.getDay(); // 0=Sun ... 6=Sat
      setShowCards(day >= 1 && day <= 4); // Mon–Thu only
    };

    checkServiceDay();
    const dayInterval = setInterval(checkServiceDay, 60 * 1000);
    return () => clearInterval(dayInterval);
  }, [serverOffsetMs]);

  // Countdown for last ordering time
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date(Date.now() + serverOffsetMs);
      const lastOrdering = new Date(now);
      lastOrdering.setHours(lastOrderingHour, 0, 0, 0);

      const diffMs = lastOrdering - now;

      if (diffMs <= 0) {
        setTimeLeft("Ordering closed for today");
        setIsClosed(true);
        return;
      }

      setIsClosed(false);

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeLeft(`⏰ ${hours ? hours + "h " : ""}${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 1000);
    return () => clearInterval(countdownInterval);
  }, [serverOffsetMs]);

  const estimatedDelivery = "12:30–1:30 LT";

  if (!showCards) return null; // <-- Hide cards entirely if not Mon–Thu

  const cardBase =
    "relative w-68 h-22 flex flex-col items-center justify-center font-semibold text-center rounded-xl shadow-lg transform transition duration-300 hover:scale-105";

  return (
    <div className="flex justify-center items-center gap-6 mt-6 w-full max-w-3xl mx-auto">
      {/* Order Cutoff */}
      <div
        className={`${cardBase} ${
          isClosed
            ? "bg-red-500 bg-gradient-to-br from-red-500 to-red-600 text-white"
            : "bg-gradient-to-br from-yellow-400 to-yellow-500 text-white"
        }`}
      >
        <span className="text-sm font-bold">Order Cutoff</span>
        <span className="text-base mt-1 text-center">{timeLeft}</span>
      </div>

      {/* Expected Delivery */}
      <div
        className={`${cardBase} bg-gradient-to-br from-green-400 to-green-500 text-white`}
      >
        <span className="text-sm font-bold">Expected Delivery</span>
        <span className="text-base mt-1 text-center">{estimatedDelivery}</span>
      </div>
    </div>
  );
}
