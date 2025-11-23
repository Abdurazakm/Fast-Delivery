import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import dayjs from "dayjs";
import API from "../api";
import TrackingInfoCard from "./TrackingInfoCard";

export default function TrackOrder() {
  const { code } = useParams();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTrack = async () => {
      try {
        const res = await API.get(`/orders/track/${code}`);
        setOrder(res.data);
        console.debug("Fetched order:", res.data);
      } catch (err) {
        console.error("Tracking fetch error:", err);
        setError(
          err.response?.data?.message || "Failed to fetch tracking info."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchTrack();
  }, [code]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 text-lg">Loading...</div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600 text-lg">{error}</div>
      </div>
    );

  const isManual =
    (order?.source || "").toString().trim().toLowerCase() === "manual";

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      {/* Back to Home Button */}
      <div className="mb-4">
        <Link
          to="/"
          className="inline-block px-4 py-2 bg-blue-400 hover:bg-blue-700 text-white text-sm font-medium rounded transition"
        >
          ← Back to Home
        </Link>
      </div>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Tracking Order —{" "}
            <span className="text-amber-700">{order.trackingCode}</span>
          </h1>

          <p className="text-sm text-gray-600">
            {!isManual && order.customerName ? (
              <>
                Customer:{" "}
                <span className="font-medium">{order.customerName}</span> •{" "}
              </>
            ) : null}
            Location: <span className="font-medium">{order.location}</span>
          </p>

          <div className="mt-3 text-xs text-gray-500">
            <span>Source: </span>
            <strong className="capitalize">
              {(order.source || "online").toString().replace("_", " ")}
            </strong>
            <span className="ml-4">
              Placed: {dayjs(order.createdAt).format("YYYY-MM-DD HH:mm")}
            </span>
          </div>
        </div>

        {/* Tracking Info Card */}
        <TrackingInfoCard order={order} hideCustomerWhenManual />

        {/* Status Timeline */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Status Timeline
          </h2>
          {!order.statusHistory || order.statusHistory.length === 0 ? (
            <p className="text-gray-500">No status updates yet.</p>
          ) : (
            <div className="relative border-l border-gray-200 ml-4">
              {order.statusHistory.map((h) => {
                const isCurrent = h.status === order.status;
                return (
                  <div
                    key={h.id || `${h.status}-${h.at}`}
                    className="mb-6 ml-6 relative"
                  >
                    <span
                      className={`absolute -left-5 w-4 h-4 rounded-full top-1 ${
                        isCurrent ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    <div className="flex justify-between items-center">
                      <div
                        className={`text-gray-800 font-medium capitalize ${
                          isCurrent ? "text-green-600" : ""
                        }`}
                      >
                        {h.status.replace("_", " ")}
                      </div>
                      <div className="text-xs text-gray-500">
                        {dayjs(h.at).format("YYYY-MM-DD HH:mm")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
