import { useEffect, useState } from "react";
import API from "../api";

export default function OrderingInfoCards({ serverOffsetMs = 0 }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isClosed, setIsClosed] = useState(false);
  const [showCards, setShowCards] = useState(true);
  const [isTemporarilyClosed, setIsTemporarilyClosed] = useState(false);
  const [cutoffTime, setCutoffTime] = useState("18:00");
  const [serviceDays, setServiceDays] = useState([1, 2, 3, 4]);
  const [estimatedDelivery, setEstimatedDelivery] = useState("");

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await API.get("/availability");
        const data = res.data;

        setCutoffTime(data.cutoffTime);
        setIsTemporarilyClosed(data.isTemporarilyClosed);

        const dayMap = {
          Sun: 0,
          Mon: 1,
          Tue: 2,
          Wed: 3,
          Thu: 4,
          Fri: 5,
          Sat: 6,
        };

        setServiceDays(data.weeklyDays.map((d) => dayMap[d]));
      } catch (err) {
        console.error("Failed to fetch availability:", err);
      }
    };

    fetchAvailability();
  }, []);

  useEffect(() => {
    const checkServiceStatus = () => {
      const now = new Date(Date.now() + serverOffsetMs);
      const today = now.getDay();
      setShowCards(serviceDays.includes(today) && !isTemporarilyClosed);
    };

    checkServiceStatus();
    const interval = setInterval(checkServiceStatus, 60 * 1000);
    return () => clearInterval(interval);
  }, [serverOffsetMs, serviceDays, isTemporarilyClosed]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date(Date.now() + serverOffsetMs);

      if (isTemporarilyClosed) {
        setTimeLeft("Service Temporarily Closed");
        setIsClosed(true);
        return;
      }

      const [cutHour, cutMinute] = cutoffTime.split(":").map(Number);
      const lastOrdering = new Date(now);
      lastOrdering.setHours(cutHour, cutMinute, 0, 0);

      const diffMs = lastOrdering - now;

      if (diffMs <= 0) {
        setTimeLeft("Ordering closed for today");
        setIsClosed(true);
      } else {
        setIsClosed(false);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        setTimeLeft(`${hours ? hours + "h " : ""}${minutes}m ${seconds}s`);
      }

      const startDelivery = new Date(lastOrdering.getTime() + 30 * 60 * 1000);
      const endDelivery = new Date(lastOrdering.getTime() + 90 * 60 * 1000);

      setEstimatedDelivery(
        `${formatTime(startDelivery)} – ${formatTime(endDelivery)}`
      );
    };

    updateCountdown();
    const countdownInterval = setInterval(updateCountdown, 1000);
    return () => clearInterval(countdownInterval);
  }, [serverOffsetMs, cutoffTime, isTemporarilyClosed]);

  if (!showCards) return null;

  const cardBase =
    "flex flex-col items-center justify-center px-6 py-5 w-full rounded-2xl shadow-xl text-center transition-all transform hover:scale-[1.03]";

  return (
    <div className="w-full max-w-3xl mx-auto mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5 px-4">
      {/* Order Cutoff */}
      <div
        className={`${cardBase} ${
          isClosed ? "bg-red-500 text-white" : "bg-amber-500 text-white"
        }`}
      >
        <span className="text-base font-bold tracking-wide">Order Cutoff</span>
        <span className="mt-2 text-xl font-semibold">{timeLeft}</span>
      </div>

      {/* Estimated Delivery */}
      <div className={`${cardBase} bg-green-500 text-white`}>
        <span className="text-base font-bold tracking-wide">
          Estimated Delivery
        </span>
        <span className="mt-2 text-xl font-semibold">{estimatedDelivery}</span>
      </div>
    </div>
  );
}
