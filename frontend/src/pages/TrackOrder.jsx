import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import API from "../api";
import TrackingInfoCard from "./TrackingInfoCard";
import { ArrowLeft, Check, Share2, Sparkles } from "lucide-react";
import { getSocket } from "../socket";
import PushNotificationPrompt from "../components/PushNotificationPrompt";
import PageLoader from "../components/PageLoader";

export default function TrackOrder() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const justPlaced = searchParams.get("justPlaced") === "1";
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const fetchTrack = async () => {
      try {
        const res = await API.get(`/orders/track/${code}`);
        const orderData = res.data;
        setOrder(orderData);
        if (orderData?.trackingCode) {
          localStorage.setItem("last_order_tracking", orderData.trackingCode);
        }
        if (orderData?.phone) {
          localStorage.setItem("last_order_phone", orderData.phone);
        }
        const fcmToken = localStorage.getItem("fcm_token");
        if (fcmToken && orderData?.phone) {
          API.post("/notifications/register-token", {
            token: fcmToken,
            phone: orderData.phone,
            trackingCode: orderData.trackingCode,
          }).catch(() => {});
        }
      } catch (err) {
        console.error("Tracking fetch error:", err);
        setError(
          err.response?.data?.message || "Failed to fetch tracking info.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchTrack();
  }, [code]);

  useEffect(() => {
    const socket = getSocket();

    const handleOrderUpdated = (payload) => {
      if (!payload || payload.trackingCode !== code) return;
      setOrder((prev) => ({ ...prev, ...payload }));
    };

    const handleOrderDeleted = (payload) => {
      if (!payload || payload.trackingCode !== code) return;
      setError("This order was cancelled.");
    };

    const joinCode = () => {
      socket.emit("join-order", code);
    };
    joinCode();
    socket.on("connect", joinCode);

    socket.on("order:updated", handleOrderUpdated);
    socket.on("order:payment-updated", handleOrderUpdated);
    socket.on("order:deleted", handleOrderDeleted);

    return () => {
      socket.off("connect", joinCode);
      socket.off("order:updated", handleOrderUpdated);
      socket.off("order:payment-updated", handleOrderUpdated);
      socket.off("order:deleted", handleOrderDeleted);
      socket.emit("leave-order", code);
    };
  }, [code]);

  // Auto-scroll and highlight Payment Instructions Card when deep-linked (via notification or URL anchor)
  useEffect(() => {
    if (loading || !order) return;

    const scrollToPaymentCard = () => {
      const isPaymentHash = window.location.hash === "#payment-card";
      const isPaymentFocus =
        searchParams.get("focus") === "payment" ||
        searchParams.get("pay") === "1";

      if (isPaymentHash || isPaymentFocus) {
        const el = document.getElementById("payment-card");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          el.classList.add(
            "ring-4",
            "ring-amber-400",
            "ring-offset-4",
            "shadow-2xl",
          );
          setTimeout(() => {
            el.classList.remove(
              "ring-4",
              "ring-amber-400",
              "ring-offset-4",
              "shadow-2xl",
            );
          }, 3500);
        }
      }
    };

    const timer = setTimeout(scrollToPaymentCard, 200);
    window.addEventListener("hashchange", scrollToPaymentCard);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", scrollToPaymentCard);
    };
  }, [loading, order, searchParams]);

  const handleCopyShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Track Order - Ertib Delivery",
          text: `Track order ${order?.trackingCode || code} on Ertib Delivery:`,
          url,
        });
        return;
      } catch (err) {
        // Fall back to clipboard if user dismissed or cancelled share
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  if (loading) {
    return (
      <PageLoader
        message="Loading live tracking..."
        subtext="Connecting to campus rider dispatch"
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/70 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-100">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 text-2xl font-black">
            !
          </div>
          <h2 className="text-xl font-black text-gray-950 mb-2">
            Order Unavailable
          </h2>
          <p className="text-gray-700 text-sm mb-6 leading-relaxed font-medium">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full min-h-[48px] py-3 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-sm sm:text-base rounded-2xl transition shadow-md shadow-amber-200/60 active:scale-98"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70 pb-28 sm:pb-16">
      {/* Sticky Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Back to Home Button */}
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-extrabold text-gray-800 hover:text-amber-700 transition py-1.5 px-2.5 sm:px-3 rounded-xl hover:bg-amber-50 shrink-0 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">Menu</span>
          </Link>

          {/* Center Title & Live Pulse */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-black text-gray-950 truncate">
              Order Tracking
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shrink-0">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          {/* Share / Copy Link Action */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyShare}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition cursor-pointer active:scale-95"
              title="Share or copy tracking link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-800 hidden sm:inline">
                    Copied
                  </span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-3 sm:px-4 pt-3 sm:pt-6 space-y-3 sm:space-y-5">
        {/* Celebratory Post-Order Welcome Banner */}
        {justPlaced && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Check className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-extrabold text-emerald-950">
                🎉 Order Placed Successfully!
              </p>
              <p className="text-[11px] sm:text-xs text-emerald-700 truncate">
                Track your live food preparation and dorm delivery below.
              </p>
            </div>
          </div>
        )}

        {/* Live Delivery Push Alerts Prompt */}
        <PushNotificationPrompt order={order} mode="inline" />

        {/* Unified Tracking Card */}
        <TrackingInfoCard
          order={order}
          isDedicatedPage={true}
          hideCustomerWhenManual
        />
      </main>
    </div>
  );
}
