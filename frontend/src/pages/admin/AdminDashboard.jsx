import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(dayjs());

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Fetch orders
  const fetchOrders = async (date) => {
    try {
      setLoading(true);
      setMessage("");
      const token = localStorage.getItem("token");

      const res = await axios.get("http://localhost:4000/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: date.format("YYYY-MM-DD") },
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

  // Delete modal functions
  const openDeleteModal = (orderId) => {
    setSelectedOrderId(orderId);
    setDeleteModalOpen(true);
  };
  const closeDeleteModal = () => {
    setSelectedOrderId(null);
    setDeleteModalOpen(false);
  };
  const confirmDelete = async () => {
    if (!selectedOrderId) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:4000/api/orders/${selectedOrderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("🗑️ Order deleted successfully");
      fetchOrders(selectedDate);
    } catch (err) {
      console.error("Failed to delete order:", err);
      setMessage("❌ Failed to delete order");
    } finally {
      closeDeleteModal();
    }
  };

  // Day navigation
  const prevDay = () => setSelectedDate((prev) => prev.subtract(1, "day"));
  const nextDay = () => {
    const today = dayjs();
    setSelectedDate((prev) =>
      prev.isSame(today, "day") ? prev : prev.add(1, "day")
    );
  };

  // Generate summary card
  const summary = {};
  let totalPrice = 0;
  let profit = 0;

  orders.forEach((order) => {
    order.items.forEach((item) => {
      let key = `${item.ertibType} ${item.ketchup && item.spices ? "Both" : item.ketchup ? "Ketchup" : item.spices ? "Spices" : "Plain"}`;
      if (item.extraKetchup) key += " + Extra Ketchup";
      if (item.extraFelafil) key += " + Extra Felafil";

      summary[key] = (summary[key] || 0) + item.quantity;
      totalPrice += item.lineTotal || item.quantity * item.unitPrice;
      profit += item.quantity * 15; // profit per ertib
    });
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-amber-700">📦 Admin Dashboard</h1>
        </div>

        {/* Day navigation */}
        <div className="flex items-center space-x-2 mb-4">
          <button onClick={prevDay} className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400">
            Previous Day
          </button>
          <span className="font-medium">{selectedDate.format("YYYY-MM-DD")}</span>
          <button
            onClick={nextDay}
            disabled={selectedDate.isSame(dayjs(), "day")}
            className={`px-3 py-1 rounded ${selectedDate.isSame(dayjs(), "day") ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-gray-300 hover:bg-gray-400"}`}
          >
            Next Day
          </button>
          {/* <button onClick={() => fetchOrders(selectedDate)} className="bg-amber-700 text-white px-4 py-2 rounded-lg hover:bg-amber-800">
            Refresh
          </button> */}
        </div>

        {/* Summary card */}
        {orders.length > 0 && (
          <div className="bg-amber-100 p-4 rounded-lg mb-4 shadow">
            <h2 className="font-semibold text-lg mb-2">📊 Today's Order Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {Object.keys(summary).map((key) => (
                <div key={key} className="bg-white p-2 rounded shadow text-center">
                  <p className="font-medium">{summary[key]} × {key}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 text-sm font-medium">
              <p>Total Price: {totalPrice} Birr</p>
              <p>Estimated Profit: {profit} Birr</p>
            </div>
          </div>
        )}

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
                        {order.items.map((item, idx) => (
                          <div key={idx} className="text-xs border border-gray-200 rounded-md p-2 mb-1 bg-gray-50">
                            <p className="font-semibold text-gray-800">{item.quantity} × {item.ertibType} Ertib</p>
                            <ul className="text-gray-600 list-disc list-inside">
                              {item.ketchup && item.spices ? <li>With Both</li> : (
                                <>
                                  {item.ketchup && <li>With Ketchup</li>}
                                  {item.spices && <li>With Spices</li>}
                                </>
                              )}
                              {item.extraKetchup && <li>Extra Ketchup</li>}
                              {item.extraFelafil && <li>Extra Felafil</li>}
                            </ul>
                            <p className="text-gray-500">
                              Unit Price: <span className="font-medium">{item.unitPrice} Birr</span> | Line Total: <span className="font-medium">{item.lineTotal} Birr</span>
                            </p>
                          </div>
                        ))}
                      </td>
                      <td className="p-3 font-semibold">{order.total} Birr</td>
                      <td className="p-3">
                        <select value={order.status} onChange={(e) => updateStatus(order.id, e.target.value)} className="border p-1 rounded-md">
                          {["pending", "in_progress", "arrived", "delivered", "canceled", "no_show"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 space-x-2">
                        <button onClick={() => openDeleteModal(orderId)} className="text-red-600 hover:underline text-sm">
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

        {/* Delete Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg w-80 text-center">
              <h2 className="text-lg font-bold mb-4 text-red-600">Confirm Deletion</h2>
              <p className="mb-6">Are you sure you want to delete this order?</p>
              <div className="flex justify-center space-x-4">
                <button onClick={confirmDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">Yes, Delete</button>
                <button onClick={closeDeleteModal} className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {orders.length > 0 && message && <p className="mt-4 text-center text-gray-700 text-sm">{message}</p>}
      </div>
    </div>
  );
}
