import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaPlus, FaPhoneAlt } from "react-icons/fa";
import axios from "axios";
import dayjs from "dayjs";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedLocation, setSelectedLocation] = useState("All"); // ✅ new
  const [checkedItems, setCheckedItems] = useState({});

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Fetch orders
  const fetchOrders = async (date) => {
    try {
      setLoading(true);
      setMessage("");
      const token = localStorage.getItem("token");

      const res = await axios.get(
        "https://fast-delivery-4gog.onrender.com/api/orders",
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { date: date.format("YYYY-MM-DD") },
        }
      );

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
        `https://fast-delivery-4gog.onrender.com/api/orders/${id}/status`,
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
      await axios.delete(
        `https://fast-delivery-4gog.onrender.com/api/orders/${selectedOrderId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
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
  let totalertibPrice = 0;
  let profit = 0;

  // ✅ Apply location filter for summary too
  const filteredOrders =
    selectedLocation === "All"
      ? orders
      : orders.filter((order) => order.location === selectedLocation);

  filteredOrders.forEach((order) => {
    order.items.forEach((item) => {
      let key = `${item.ertibType} ${
        item.ketchup && item.spices
          ? "Both"
          : item.ketchup
          ? "Ketchup"
          : item.spices
          ? "Spices"
          : "Plain"
      }`;
      if (item.extraKetchup) key += " + Extra Ketchup";
      if (item.extraFelafil) key += " + Extra Felafil";

      summary[key] = (summary[key] || 0) + item.quantity;
      totalPrice += item.lineTotal || item.quantity * item.unitPrice;
      profit += item.quantity * 15; // profit per ertib
      totalertibPrice = totalPrice - profit;
    });
  });

  // Color mapping for order statuses
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-400",
    in_progress: "bg-blue-100 text-blue-700 border-blue-400",
    arrived: "bg-indigo-100 text-indigo-700 border-indigo-400",
    delivered: "bg-green-100 text-green-700 border-green-400",
    canceled: "bg-red-100 text-red-700 border-red-400",
    no_show: "bg-gray-200 text-gray-700 border-gray-400",
  };

  const toggleCheckbox = (key) => {
    setCheckedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // ✅ Unique locations list
  const uniqueLocations = ["All", ...new Set(orders.map((o) => o.location))];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-amber-700">📦My Dashboard</h1>
        </div>

        {/* Day navigation */}
        <div className="flex items-center justify-between mb-4">
          {/* Left side: arrows + date */}
          <div className="flex items-center space-x-2">
            <button
              onClick={prevDay}
              className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
            >
              ⬅️
            </button>

            <span className="font-medium">
              {selectedDate.format("YYYY-MM-DD")}
            </span>

            <button
              onClick={nextDay}
              disabled={selectedDate.isSame(dayjs(), "day")}
              className={`px-3 py-1 rounded ${
                selectedDate.isSame(dayjs(), "day")
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            >
              ➡️
            </button>
          </div>

          {/* Right side: plus button */}
          <Link
            to="/"
            className="bg-amber-500 text-white p-2 rounded-full hover:bg-amber-600"
          >
            <FaPlus />
          </Link>
        </div>

        {/* ✅ Location Filter */}
        {orders.length > 0 && (
          <div className="flex items-center justify-end mb-4">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="border p-2 rounded-md bg-white shadow-sm"
            >
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Summary card */}
        {filteredOrders.length > 0 && (
          <div className="bg-amber-100 p-4 rounded-lg mb-4 shadow">
            <h2 className="font-semibold text-lg mb-2">
              📊 Order Summary ({selectedLocation})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {Object.keys(summary).map((key) => (
                <label
                  key={key}
                  className={`flex items-center justify-between bg-white p-2 rounded shadow cursor-pointer transition border ${
                    checkedItems[key]
                      ? "border-green-400 bg-green-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checkedItems[key] || false}
                      onChange={() => toggleCheckbox(key)}
                      className="accent-green-600"
                    />
                    <span className="font-medium text-gray-800">
                      {summary[key]} × {key}
                    </span>
                  </div>
                  {checkedItems[key] && (
                    <span className="text-green-600 font-semibold text-xs">
                      ✔
                    </span>
                  )}
                </label>
              ))}
            </div>

            <div className="mt-2 text-sm font-medium">
              <p>Total Leyla's price: {totalertibPrice}</p>
              <p>Total Delivered Price: {totalPrice} Birr</p>
              <p>Estimated Profit: {profit} Birr</p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-500">Loading orders...</p>
        ) : filteredOrders.length === 0 ? (
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
                  <th className="p-3 text-left">Total(Birr)</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const orderId = order._id || order.id;
                  return (
                    <tr key={orderId} className="border-b hover:bg-gray-50">
                      <td className="p-3">{order.customerName}</td>
                      <td className="p-3">
                        <a
                          href={`tel:${order.phone}`}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <FaPhoneAlt className="text-sm" />
                          {order.phone}
                        </a>
                      </td>
                      <td className="p-3">{order.location}</td>
                      <td className="p-3">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="border border-gray-200 rounded-md p-2 mb-1 bg-gray-50"
                          >
                            <p className="font-semibold text-gray-800">
                              {item.quantity}×{item.ertibType}
                            </p>
                            <ul className="text-gray-600 list-disc list-inside">
                              {item.ketchup && item.spices ? (
                                <li>Both</li>
                              ) : (
                                <>
                                  {item.ketchup && <li>Ktchp</li>}
                                  {item.spices && <li>Spices</li>}
                                </>
                              )}
                              {item.extraKetchup && <li>Extra Ktchp</li>}
                              {item.extraFelafil && <li>Double Felafil</li>}
                            </ul>
                          </div>
                        ))}
                      </td>
                      <td className="p-3 font-semibold">{order.total}</td>
                      <td className="p-3">
                        <select
                          value={order.status}
                          onChange={(e) =>
                            updateStatus(order.id, e.target.value)
                          }
                          className={`border p-1 rounded-md font-medium ${
                            statusColors[order.status]
                          }`}
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
                          onClick={() => openDeleteModal(orderId)}
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

        {/* Delete Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg w-80 text-center">
              <h2 className="text-lg font-bold mb-4 text-red-600">
                Confirm Deletion
              </h2>
              <p className="mb-6">
                Are you sure you want to delete this order?
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={confirmDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={closeDeleteModal}
                  className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {orders.length > 0 && message && (
          <p className="mt-4 text-center text-gray-700 text-sm">{message}</p>
        )}
      </div>
    </div>
  );
}
