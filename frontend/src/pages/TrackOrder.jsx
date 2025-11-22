import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../api";
import dayjs from "dayjs";

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

  return (
    <div className="min-h-screen flex items-start justify-center p-6 bg-gray-50">
      <div className="bg-white p-6 rounded-lg shadow max-w-lg w-full">
        <h1 className="text-xl font-semibold mb-2">Order Tracking — {order.trackingCode}</h1>
        <p className="text-sm text-gray-600 mb-4">Customer: {order.customerName} • Location: {order.location}</p>

        <div className="mb-4">
          <strong>Status:</strong>
          <div className="mt-2">
            <span className="px-3 py-1 bg-yellow-100 rounded">{order.status}</span>
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-2">Status History</h2>
          {(order.statusHistory || []).length === 0 ? (
            <p className="text-sm text-gray-600">No history</p>
          ) : (
            <ul className="space-y-2">
              {order.statusHistory.map((h, idx) => (
                <li key={idx} className="p-2 border rounded">
                  <div className="flex justify-between">
                    <div className="font-medium">{h.status}</div>
                    <div className="text-xs text-gray-500">{dayjs(h.at).format("YYYY-MM-DD HH:mm")}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-500">
          Placed on: {dayjs(order.createdAt).format("YYYY-MM-DD HH:mm")}
        </div>
      </div>
    </div>
  );
}
