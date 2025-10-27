import { useEffect, useState } from "react";
import axios from "axios";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Fetch all orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:4000/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setMessage("❌ Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Update status
  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `http://localhost:4000/api/orders/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("✅ Status updated successfully");
      fetchOrders();
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to update status");
    }
  };

  // Delete order
  const deleteOrder = async (id) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:4000/api/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("🗑️ Order deleted successfully");
      fetchOrders();
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to delete order");
    }
  };

  // ------------------ UI ------------------
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-amber-700">📦 Admin Dashboard</h1>
          <button
            onClick={fetchOrders}
            className="bg-amber-700 text-white px-4 py-2 rounded-lg hover:bg-amber-800"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-center text-gray-500">No orders found.</p>
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
                {orders.map((order) => (
                  <tr key={order._id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{order.customerName}</td>
                    <td className="p-3">{order.phone}</td>
                    <td className="p-3">{order.location}</td>
                    <td className="p-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-xs border-b py-1">
                          {item.quantity} × {item.ertibType} Ertib{" "}
                          {item.spices && item.ketchup
                            ? "with both"
                            : item.ketchup
                            ? "with ketchup"
                            : item.spices
                            ? "with spices"
                            : "plain"}
                        </div>
                      ))}
                    </td>
                    <td className="p-3 font-semibold">{order.total} Birr</td>
                    <td className="p-3">
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order._id, e.target.value)}
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
                        onClick={() => deleteOrder(order._id)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {message && (
          <p className="mt-4 text-center text-gray-700 text-sm">{message}</p>
        )}
      </div>
    </div>
  );
}
