import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import API from "../api";
import TrackingInfoCard from "./TrackingInfoCard";
import { ArrowLeft, Check, Share2, Sparkles } from "lucide-react";
import { getSocket } from "../socket";
import PushNotificationPrompt from "../components/PushNotificationPrompt";

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

    socket.emit("join-order", code);
    socket.on("order:updated", handleOrderUpdated);
    socket.on("order:deleted", handleOrderDeleted);

    return () => {
      socket.off("order:updated", handleOrderUpdated);
      socket.off("order:deleted", handleOrderDeleted);
      socket.emit("leave-order", code);
    };
  }, [code]);

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/70 px-4">
        <div className="w-12 h-12 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin mb-4" />
        <p className="text-gray-600 font-medium text-sm">
          Loading live tracking...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/70 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-100">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Order Unavailable
          </h2>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition shadow-md shadow-amber-200"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70 pb-16">
      {/* Sticky Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Back to Home Button */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-700 hover:text-amber-600 transition-colors py-1.5 px-2.5 rounded-xl hover:bg-amber-50 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Menu</span>
          </Link>

          {/* Center Title & Live Pulse */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
              Order Tracking
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>

          {/* Share / Copy Link Action */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyShare}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-800 transition cursor-pointer"
              title="Share or copy tracking link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 hidden sm:inline">
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
      <main className="max-w-3xl mx-auto px-4 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        {/* Celebratory Post-Order Welcome Banner */}
        {justPlaced && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                  <span>🎉 Order Placed Successfully!</span>
                </p>
                <p className="text-[11px] sm:text-xs text-emerald-700 mt-0.5">
                  We've received your order and sent it to the kitchen. Please complete your payment below to confirm preparation.
                </p>
              </div>
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
