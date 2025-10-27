import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(dayjs());

  // Fetch orders for selected date
  const fetchOrders = async (date) => {
    try {
      setLoading(true);
      setMessage("");
      const token = localStorage.getItem("token");

      const res = await axios.get("http://localhost:4000/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          date: date.format("YYYY-MM-DD"),
        },
      });

      const ordersArray = res.data.data || [];
      setOrders(ordersArray);

      if (!ordersArray.length) {
        setMessage(`📭 No orders found for ${date.format("YYYY-MM-DD")}`);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setMessage("❌ Failed to fetch orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(selectedDate);
  }, [selectedDate]);

  // Update status
  const updateStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:4000/api/orders/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === id ? { ...order, status: newStatus } : order
        )
      );

      setMessage("✅ Status updated successfully");
    } catch (err) {
      console.error("Failed to update status:", err);
      setMessage("❌ Failed to update status");
    }
  };

  // Delete order
  const deleteOrder = async (orderId) => {
    if (!orderId) return;
    if (!window.confirm("Are you sure you want to delete this order?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:4000/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("🗑️ Order deleted successfully");
      fetchOrders(selectedDate);
    } catch (err) {
      console.error("Failed to delete order:", err);
      setMessage("❌ Failed to delete order");
    }
  };

  // Previous/Next day navigation
  const prevDay = () => {
    setSelectedDate((prev) => prev.subtract(1, "day"));
  };

  const nextDay = () => {
    setSelectedDate((prev) => {
      const today = dayjs();
      if (prev.isSame(today, "day")) return prev; // already today
      return prev.add(1, "day");
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-amber-700">📦 Admin Dashboard</h1>
        </div>

        {/* Day navigation */}
        <div className="flex items-center space-x-2 mb-4">
          <button
            onClick={prevDay}
            className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
          >
            Previous Day
          </button>

          <span className="font-medium">{selectedDate.format("YYYY-MM-DD")}</span>

          <button
            onClick={nextDay}
            disabled={selectedDate.isSame(dayjs(), "day")}
            className={`px-3 py-1 rounded ${
              selectedDate.isSame(dayjs(), "day")
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-gray-300 hover:bg-gray-400"
            }`}
          >
            Next Day
          </button>

          <button
            onClick={() => fetchOrders(selectedDate)}
            className="bg-amber-700 text-white px-4 py-2 rounded-lg hover:bg-amber-800"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-center text-gray-500">{message}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-amber-100">
                <tr>
                  <th className="p-3 text-left">Customer</th>
                  <th className="p-3 text-left">Phone</th>
                  <th className="p-3 text-left">Location</th>
                  <th className="p-3 text-left">Items</th>
                  <th className="p-3 text-left">Total</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const orderId = order._id || order.id;
                  return (
                    <tr key={orderId} className="border-b hover:bg-gray-50">
                      <td className="p-3">{order.customerName}</td>
                      <td className="p-3">{order.phone}</td>
                      <td className="p-3">{order.location}</td>
                      <td className="p-3">
                        {Array.isArray(order.items) && order.items.length > 0 ? (
                          order.items.map((item, idx) => (
                            <div key={item.id || idx} className="text-xs border-b py-1">
                              {item.quantity} × {item.ertibType} Ertib{" "}
                              {item.spices && item.ketchup
                                ? "with both"
                                : item.ketchup
                                ? "with ketchup"
                                : item.spices
                                ? "with spices"
                                : "plain"}
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-gray-400">No items</div>
                        )}
                      </td>
                      <td className="p-3 font-semibold">{order.total} Birr</td>
                      <td className="p-3">
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          className="border p-1 rounded-md"
                        >
                          {[
                            "pending",
                            "in_progress",
                            "arrived",
                            "delivered",
                            "canceled",
                            "no_show",
                          ].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 space-x-2">
                        <button
                          onClick={() => deleteOrder(orderId)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {orders.length > 0 && message && (
          <p className="mt-4 text-center text-gray-700 text-sm">{message}</p>
        )}
      </div>
    </div>
  );
}
