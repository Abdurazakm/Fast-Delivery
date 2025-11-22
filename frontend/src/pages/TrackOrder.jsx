import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../api";
import dayjs from "dayjs";

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", message: "Your order has been received." },
  { key: "in_progress", label: "Preparing", message: "Your order is being prepared." },
  { key: "arrived", label: "Out for Delivery", message: "Your order is on its way!" },
  { key: "delivered", label: "Delivered", message: "Your order has been delivered." },
  { key: "canceled", label: "Canceled", message: "Your order was canceled." },
  { key: "no_show", label: "No Show", message: "We couldn't deliver your order." },
];

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
      } catch (err) {
        console.error("Tracking fetch error:", err);
        setError(err.response?.data?.message || "Failed to fetch tracking info.");
      } finally {
        setLoading(false);
      }
    };
    fetchTrack();
  }, [code]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  // Find index of current status in the steps array
  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === order.status);

  return (
    <div className="min-h-screen flex items-start justify-center p-6 bg-gray-50">
      <div className="bg-white p-6 rounded-lg shadow max-w-lg w-full">
        <h1 className="text-2xl font-semibold mb-2">Order Tracking — {order.trackingCode}</h1>
        <p className="text-sm text-gray-600 mb-4">
          Customer: {order.customerName} • Location: {order.location}
        </p>

        {/* ✅ Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {STATUS_STEPS.map((step, idx) => (
              <div key={step.key} className="flex-1 text-center text-xs font-medium">
                <div
                  className={`w-6 h-6 mx-auto rounded-full ${
                    idx <= currentStepIndex ? "bg-green-500 text-white" : "bg-gray-300 text-gray-500"
                  } flex items-center justify-center`}
                >
                  {idx + 1}
                </div>
                <div className="mt-1">{step.label}</div>
              </div>
            ))}
          </div>
          <div className="relative h-1 bg-gray-300 rounded">
            <div
              className="absolute h-1 bg-green-500 rounded"
              style={{
                width: `${((currentStepIndex + 1) / STATUS_STEPS.length) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        {/* ✅ Status message for customer */}
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded border border-green-100">
          {STATUS_STEPS[currentStepIndex]?.message || "Tracking your order..."}
        </div>

        {/* ✅ Status History */}
        <div>
          <h2 className="font-semibold mb-2">Status History</h2>
          {(order.statusHistory || []).length === 0 ? (
            <p className="text-sm text-gray-600">No history yet</p>
          ) : (
            <ul className="space-y-2">
              {order.statusHistory.map((h, idx) => (
                <li
                  key={idx}
                  className={`p-2 border rounded ${
                    h.status === order.status ? "border-green-500 bg-green-50" : "border-gray-200"
                  }`}
                >
                  <div className="flex justify-between">
                    <div className="font-medium capitalize">{h.status.replace("_", " ")}</div>
                    <div className="text-xs text-gray-500">
                      {dayjs(h.at).format("YYYY-MM-DD HH:mm")}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-500">
          Placed on: {dayjs(order.createdAt).format("YYYY-MM-DD HH:mm")}
        </div>

        {/* ✅ Track URL */}
        {order.trackUrl && (
          <div className="mt-4 text-sm">
            <strong>Tracking Link: </strong>
            <a
              href={order.trackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              {order.trackUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
