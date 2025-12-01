import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaPlus,
  FaPaperPlane,
  FaPhoneAlt,
  FaRegEnvelope,
  FaEdit,
  FaTrash,
  FaCopy,
  FaExternalLinkAlt,
} from "react-icons/fa";
import dayjs from "dayjs";
import html2canvas from "html2canvas";
import { FiDownload } from "react-icons/fi";
import API from "../../api";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [checkedItems, setCheckedItems] = useState({});
  const [trackingSearch, setTrackingSearch] = useState("");
  const [prevStatuses, setPrevStatuses] = useState({});

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [smsDay, setSmsDay] = useState(""); // Mon, Tue, etc.
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem("token");

  const fetchOrders = async (date) => {
    try {
      setLoading(true);
      setMessage("");
      const token = localStorage.getItem("token");

      // Fetch online/normal orders
      const resOnline = await API.get("/orders", {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: date.format("YYYY-MM-DD") },
      });
      const onlineOrders = (resOnline.data.data || []).map((o) => ({
        ...o,
        source: "online",
      }));

      // Fetch manual orders
      const resManual = await API.get("/orders/manual-orders", {
        headers: { Authorization: `Bearer ${token}` },
        params: { date: date.format("YYYY-MM-DD") }, // pass selected day
      });
      const manualOrders = (resManual.data || []).map((o) => ({
        ...o,
        source: "manual",
      }));

      // Merge and deduplicate orders by a robust composite key.
      const merged = [...onlineOrders, ...manualOrders];

      const getCompositeKey = (o) => {
        if (o?.trackingCode) return `tc:${String(o.trackingCode)}`;
        if (o?.id) return `id:${String(o.id)}`;
        if (o?._id) return `_id:${String(o._id)}`;
        // Fallback to phone+customer+total to detect same orders without ids
        const phone = (o?.phone || "").toString().trim();
        const name = (o?.customerName || "").toString().trim();
        const total = (o?.total ?? o?.totalPrice ?? o?.amount ?? "").toString();
        if (phone || name || total) return `fallback:${phone}|${name}|${total}`;
        return `rand:${Math.random().toString(36).slice(2)}`;
      };

      const mergeOrders = (existing, incoming) => {
        // Prefer manual values but merge non-empty fields from either side
        const preferIncoming = incoming.source === "manual";
        const merged = { ...existing };
        Object.keys(incoming).forEach((k) => {
          const val = incoming[k];
          if (val === undefined || val === null || val === "") return;
          if (k === "items" && Array.isArray(val) && val.length > 0) {
            merged.items = val;
            return;
          }
          // If existing has empty and incoming has value, take incoming
          if (
            merged[k] === undefined ||
            merged[k] === null ||
            merged[k] === ""
          ) {
            merged[k] = val;
            return;
          }
          // If prefer incoming (manual), overwrite
          if (preferIncoming) merged[k] = val;
        });
        // keep the source of the preferred order (manual if either is manual)
        merged.source =
          existing.source === "manual" || incoming.source === "manual"
            ? "manual"
            : existing.source || incoming.source;
        return merged;
      };

      const dedupMap = merged.reduce((acc, o) => {
        const key = getCompositeKey(o);
        if (!acc[key]) {
          acc[key] = { ...o };
        } else {
          acc[key] = mergeOrders(acc[key], o);
        }
        return acc;
      }, {});

      const dedupedOrders = Object.values(dedupMap);

      setOrders(dedupedOrders);

      // Store snapshot for status highlight using same deduping key
      const statusSnapshot = {};
      dedupedOrders.forEach((o) => {
        const idKey = o.id || o._id || o.trackingCode;
        if (idKey) statusSnapshot[idKey] = o.status;
      });
      setPrevStatuses((prev) => ({ ...prev, ...statusSnapshot }));

      if (!dedupedOrders.length) {
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

  const updateStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem("token");

      // store old status for highlight
      const oldStatus = orders.find((o) => o.id === id)?.status;
      setPrevStatuses((prev) => ({ ...prev, [id]: oldStatus }));

      await API.put(
        `/orders/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOrders((prevOrders) =>
        (prevOrders || []).map((order) =>
          order.id === id ? { ...order, status: newStatus } : order
        )
      );

      // highlight for 3s
      setTimeout(
        () => setPrevStatuses((prev) => ({ ...prev, [id]: undefined })),
        3000
      );

      setMessage("✅ Status updated successfully");
    } catch (err) {
      console.error("Failed to update status:", err);
      setMessage("❌ Failed to update status");
    }
  };

  const updateAllStatus = (newStatus) => {
    if (!newStatus) return;

    filteredOrders.forEach((order) => {
      const orderId = order._id || order.id;
      if (orderId) updateStatus(orderId, newStatus);
    });
  };

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
      await API.delete(`/orders/${selectedOrderId}`, {
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

  const prevDay = () => setSelectedDate((prev) => prev.subtract(1, "day"));
  const nextDay = () => {
    const today = dayjs();
    setSelectedDate((prev) =>
      prev.isSame(today, "day") ? prev : prev.add(1, "day")
    );
  };

  // Helper to determine unit price for an item when backend doesn't provide it
  const getUnitPrice = (item) => {
    if (item.foodType === "sambusa") {
      return 30; // fixed price for Sambusa
    }

    // Ertib
    const type = (item?.ertibType || "").toLowerCase();
    let base = type === "special" ? 135 : 110;
    if (item?.extraKetchup) base += 10;
    if (item?.doubleFelafil) base += 15;
    return base;
  };

  // Generate summary card
  const summary = {};
  let totalPrice = 0;
  let profit = 0;

  const filteredOrders =
    selectedLocation === "All"
      ? orders
      : orders.filter((order) => order.location === selectedLocation);

  filteredOrders.forEach((order) => {
    if (!order.items || order.items.length === 0) return;

    order.items.forEach((item) => {
      let key;
      const unitPrice = Number(item.unitPrice ?? getUnitPrice(item)) || 0;
      const qty = Number(item.quantity) || 0;

      if (item.foodType === "sambusa") {
        key = "Sambusa";

        profit += qty * 10; // profit per Sambusa
      } else {
        // Ertib logic
        let base = item.ertibType;

        // Ketchup/Spices
        let cond = "";
        if (item.ketchup && item.spices) cond = "Both";
        else if (item.ketchup) cond = "Ketchup";
        else if (item.spices) cond = "Spices";
        else cond = "Plain";

        key = `${base} ${cond}`;

        // FELAFIL logic
        if (!item.Felafil) {
          key += ", No Felafil";
        }

        // Extras
        if (item.extraKetchup) key += " + Extra Ketchup";
        if (item.doubleFelafil) key += " + Double Felafil";

        profit += qty * 15; // profit per Ertib
      }

      summary[key] = (summary[key] || 0) + qty;
      totalPrice += item.lineTotal || qty * unitPrice;
    });
  });

  // ❌ REMOVE THIS (caused the error)
  // totalertibPrice = totalPrice - profit;

  // ✅ KEEP ONLY THIS
  const totalertibPrice = totalPrice - profit;

  const buildSummaryMessage = () => {
    let msg = `አሳላሙ ዐለይኩም ወረህመቱላህ ወበረካቱ Mom,\n\n`;

    Object.keys(summary || {}).forEach((key) => {
      msg += `${summary[key]} — ${key}\n`;
    });

    return msg.trim();
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-400",
    in_progress: "bg-blue-100 text-blue-700 border-blue-400",
    arrived: "bg-indigo-100 text-indigo-700 border-indigo-400",
    delivered: "bg-green-100 text-green-700 border-green-400",
    canceled: "bg-red-100 text-red-700 border-red-400",
    no_show: "bg-gray-200 text-gray-700 border-gray-400",
  };

  const toggleCheckbox = (key) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ✅ Unique locations list
  const uniqueLocations = [
    "All",
    ...new Set((orders || []).map((o) => o.location)),
  ];

  let normalCount = 0;
  let specialCount = 0;
  let extraKetchupCount = 0;
  let doubleFelafilCount = 0;
  let sambusaCount = 0; // New
  let totalPriceWithoutProfit = 0;

  filteredOrders.forEach((order) => {
    if (!order.items || order.items.length === 0) return;

    order.items.forEach((item) => {
      const qty = Number(item?.quantity) || 0;

      // Count by type
      if (item.foodType === "sambusa") {
        sambusaCount += qty; // count sambusa
      } else {
        const type = (item?.ertibType || "").toLowerCase();
        if (type === "normal") normalCount += qty;
        if (type === "special") specialCount += qty;
        if (item?.extraKetchup) extraKetchupCount += qty;
        if (item?.doubleFelafil || item?.extraFelafil)
          doubleFelafilCount += qty;
      }

      const unitPrice = Number(item?.unitPrice ?? getUnitPrice(item)) || 0;
      const lineTotal = Number(item?.lineTotal ?? qty * unitPrice) || 0;

      // Profit: Sambusa usually has 10, Ertib 15
      const itemProfit = item.foodType === "sambusa" ? qty * 10 : qty * 15;
      totalPriceWithoutProfit += lineTotal - itemProfit;
    });
  });

  // New: download summary report
  const downloadSummaryReport = () => {
    const summaryCard = document.getElementById("hiddenSummaryCard");
    if (!summaryCard) return;

    html2canvas(summaryCard, { scale: 2 }).then((canvas) => {
      const link = document.createElement("a");
      link.download = `Ertib_Summary_${selectedDate.format("YYYY-MM-DD")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  };
  const daysOfWeekAmharic = ["እሑድ", "ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ"];

  const monthsOfEthiopiaAmharic = [
    "መስከረም",
    "ጥቅምት",
    "ህዳር",
    "ታኅሣሥ",
    "ጥር",
    "የካቲት",
    "መጋቢት",
    "ሚያዝያ",
    "ግንቦት",
    "ሰኔ",
    "ሐምሌ",
    "ነሐሴ",
    "ጳጉሜ",
  ];

  // Convert Gregorian to Ethiopian
  const toEthiopian = (gregDate) => {
    const gYear = gregDate.getFullYear();
    const gMonth = gregDate.getMonth() + 1; // 1-12
    const gDay = gregDate.getDate();

    let ethYear = gYear - 8;
    let newYear = new Date(gYear, 8, 11); // Sept 11

    // Leap year adjustment: Sept 12
    if ((gYear + 1) % 4 === 0) newYear = new Date(gYear, 8, 12);

    let diff = Math.floor((gregDate - newYear) / 86400000);
    if (diff < 0) {
      ethYear -= 1;
      newYear = new Date(gYear - 1, 8, 11);
      if (gYear % 4 === 0) newYear = new Date(gYear - 1, 8, 12);
      diff = Math.floor((gregDate - newYear) / 86400000);
    }

    let ethMonth = Math.floor(diff / 30) + 1;
    let ethDay = (diff % 30) + 1;

    // 13th month
    if (ethMonth > 13) {
      ethMonth = 13;
      ethDay = diff - 360 + 1;
    }

    const dayOfWeekAmh = daysOfWeekAmharic[gregDate.getDay()];
    const ethMonthAmh = monthsOfEthiopiaAmharic[ethMonth - 1];

    return `${dayOfWeekAmh}, ${ethMonthAmh} ${ethDay}`;
  };
  // Predefined promo messages
  const promoMessages = {
    Monday: `🍽️ Hungry? Fetan Delivery got you! 
➡️ Normal Ertib - 110 Birr
➡️ Special Ertib - 135 Birr

📲 Order online: https://fetandelivery.netlify.app/
📞 Call us optionally: 0954724664`,
    Tuesday: `😋 Tuesday cravings? Fetan Delivery serves your favorite Ertib!
➡️ Normal 110 Birr, Special 135 Birr

📲 Order online: https://fetandelivery.netlify.app/
📞 Call optionally: 0954724664`,
    Wednesday: `🍴 Midweek treat with Fetan Delivery! 
Normal - 110 Birr, Special - 135 Birr

📲 Order online: https://fetandelivery.netlify.app/
📞 Call optionally: 0954724664`,
    Thursday: `🎉 Almost Friday! Grab your Ertib from Fetan Delivery
Normal - 110 Birr, Special - 135 Birr

📲 Order online: https://fetandelivery.netlify.app/
📞 Call optionally: 0954724664`,
  };

  const openSmsModal = () => setSmsModalOpen(true);
  const closeSmsModal = () => setSmsModalOpen(false);

  const handleDayChange = (e) => {
    const day = e.target.value;
    setSmsDay(day);
    setSmsMessage(promoMessages[day] || "");
  };

  // Lightweight toast helper
  const showToast = (msg, ms = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  const sendBulkSMS = async () => {
    try {
      await API.post(
        "/orders/bulk-sms",
        { message: smsMessage, day: smsDay },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("✅ SMS sent successfully!");
      closeSmsModal();
    } catch (err) {
      console.error("Failed to send bulk SMS:", err);
      showToast("❌ Failed to send SMS");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto bg-white p-6 rounded-2xl shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-amber-700">📦My Dashboard</h1>
        </div>

        <div className="flex items-center justify-between mb-4">
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

          {/* Right side: Download + Plus button */}
          <div className="flex items-center space-x-2">
            {/* Download Summary Report Button */}
            {filteredOrders.length > 0 && (
              <button
                onClick={downloadSummaryReport}
                className="bg-green-500 text-white p-2 rounded-md hover:bg-green-600 flex items-center justify-center"
                title="Download Summary Report"
              >
                <FiDownload />
              </button>
            )}

            {/* Plus button */}
            <Link
              to="/order"
              className="bg-amber-500 text-white p-2 rounded-full hover:bg-amber-600"
            >
              <FaPlus />
            </Link>
          </div>
        </div>
        {filteredOrders.length > 0 && (
          <div className="flex flex-wrap justify-end items-center gap-2 mb-4">
            {/* Location Filter */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="border rounded-md px-3 py-2 h-10 bg-white shadow-sm w-full sm:w-[220px] whitespace-normal break-words"
            >
              {(uniqueLocations || []).map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            {/* Update All Status */}
            <select
              onChange={(e) => updateAllStatus(e.target.value)}
              className="border rounded-md px-3 py-2 h-10 w-full sm:w-[220px] whitespace-normal break-words"
              defaultValue=""
            >
              <option value="" disabled>
                Select status
              </option>
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
          </div>
        )}

        {/* Hidden Summary Card for Download */}
        <div
          id="hiddenSummaryCard"
          style={{
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
            width: "400px",
            padding: "20px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #fef3c7, #fcd34d)",
            border: "1px solid #fbbf24",
            color: "#1f2937",
            fontFamily: "sans-serif",
          }}
        >
          <h1
            style={{
              fontSize: "22px",
              fontWeight: "700",
              marginBottom: "12px",
              color: "#1f2937",
            }}
          >
            ERTIB SUMMARY REPORT
          </h1>

          {/* Ethiopian Date in Amharic */}
          <p style={{ marginBottom: "4px", fontWeight: "600" }}>
            ቀን : {toEthiopian(selectedDate.toDate())}
          </p>

          <p style={{ marginBottom: "12px", fontWeight: "600" }}>
            {selectedLocation}
          </p>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead style={{ backgroundColor: "#fef3c7" }}>
              <tr>
                <th style={{ border: "1px solid #fbbf24", padding: "4px" }}>
                  Ertib Type
                </th>
                <th style={{ border: "1px solid #fbbf24", padding: "4px" }}>
                  Quantity
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #fbbf24", padding: "4px" }}>
                  Normal
                </td>
                <td style={{ border: "1px solid #fbbf24", padding: "4px" }}>
                  {normalCount}
                </td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #fbbf24", padding: "4px" }}>
                  Special
                </td>
                <td style={{ border: "1px solid #fbbf24", padding: "4px" }}>
                  {specialCount}
                </td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #fbbf24", padding: "4px" }}>
                  Extra Ketchup
                </td>
                <td style={{ border: "1px solid #fbbf24", padding: "4px" }}>
                  {extraKetchupCount}
                </td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #fbbf24", padding: "4px" }}>
                  Double Felafil
                </td>
                <td style={{ border: "1px solid #fbbf24", padding: "4px" }}>
                  {doubleFelafilCount}
                </td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #fbbf24", padding: "4px" }}>
                  Sambusa
                </td>
                <td style={{ border: "1px solid #fbbf24", padding: "4px" }}>
                  {sambusaCount}
                </td>
              </tr>
            </tbody>
          </table>

          <p
            style={{
              marginTop: "12px",
              fontWeight: "700",
              fontSize: "16px",
            }}
          >
            Total Price : {totalPriceWithoutProfit} Birr
          </p>

          <p
            style={{
              marginTop: "8px",
              fontSize: "12px",
              textAlign: "center",
            }}
          >
            Generated by Fetan Delivery System
          </p>
        </div>

        {/* Summary card */}
        {filteredOrders.length > 0 && (
          <div className="bg-amber-100 p-4 rounded-lg mb-4 shadow relative">
            {/* TOP RIGHT SEND SMS BUTTON */}
            <button
              title="Send summary SMS"
              onClick={() => {
                const message = buildSummaryMessage();
                console.log("Sending SMS message:\n", message);

                const smsUrl = `sms:+251974149999?body=${encodeURIComponent(
                  message
                )}`;
                window.location.href = smsUrl;
              }}
              className="absolute top-3 right-3 text-blue-600 hover:text-blue-800 p-2 rounded-full bg-blue-100 hover:bg-blue-200 shadow-sm transition flex items-center justify-center"
            >
              <FaPaperPlane className="text-md" />
            </button>

            <h2 className="font-semibold text-lg mb-2 pr-10">
              📊 Order Summary ({selectedLocation})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {Object.keys(summary || {}).map((key) => (
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
                  <th className="p-3 text-left">Tracking</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {(filteredOrders || []).map((order, idx) => {
                  const orderId = order._id || order.id;
                  // Use a stable unique key for React list rendering. We keep `orderId`
                  // for actions (update/delete) but use `orderKey` as the element key
                  // to avoid collisions when ids overlap between online/manual sources.
                  const orderKey = orderId
                    ? `${order.source || "o"}-${orderId}`
                    : `${order.source || "o"}-${idx}`;

                  // Build a professional tracking message depending on order status
                  const baseLink = `${window.location.origin}/track/${order.trackingCode}/`;
                  const trackingMessage = (() => {
                    const name = order.customerName || "Customer";
                    const code = order.trackingCode || orderId || "--";
                    const greeting =
                      order.source === "manual" ? "Hello" : `Hello ${name}`;
                    switch ((order.status || "").toLowerCase()) {
                      case "pending":
                        return `${greeting}, your order (Code: ${code}) is confirmed. We have received your request and will notify you when it is being prepared. Track your order: ${baseLink}`;
                      case "in_progress":
                        return `${greeting}, your order (Code: ${code}) is being prepared and will be out for delivery shortly. Track its progress here: ${baseLink}`;
                      case "arrived":
                        return `${greeting}, your order (Code: ${code}) has arrived. Please pick it up near the location you provided: ${
                          order.location || "your specified address"
                        }. Track: ${baseLink}`;
                      case "delivered":
                        return `${greeting}, your order (Code: ${code}) has been delivered. Thank you for choosing Fetan Delivery! If you have feedback, reply to this message.`;
                      default:
                        return `Hello ${name}, your order (Code: ${code}) status: ${
                          order.status || "unknown"
                        }. Track: ${baseLink}`;
                    }
                  })();

                  // Compute a safe displayed total for the order (fall back to items if needed)
                  const displayedTotal =
                    order.total ??
                    order.totalPrice ??
                    order.amount ??
                    (order.items || []).reduce((sum, it) => {
                      const q = Number(it?.quantity) || 0;
                      const up = Number(it?.unitPrice ?? getUnitPrice(it)) || 0;
                      const lt = Number(it?.lineTotal ?? q * up) || 0;
                      return sum + lt;
                    }, 0);

                  return (
                    <tr
                      key={orderKey}
                      className={`border-b hover:bg-gray-50 ${
                        order.source === "manual" ? "bg-yellow-50" : ""
                      }`} // highlight manual orders
                    >
                      {/* Customer */}
                      <td className="p-3">{order.customerName}</td>

                      {/* Phone */}
                      <td className="p-3">
                        <a
                          href={`tel:${order.phone}`}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <FaPhoneAlt className="text-sm" />
                          {order.phone}
                        </a>
                      </td>

                      {/* Location */}
                      <td className="p-3">{order.location}</td>

                      {/* Items */}
                      <td className="p-3">
                        {order.items.map((item, idx) => {
                          // Build food description dynamically
                          let foodDesc = "";

                          if (item.foodType === "sambusa") {
                            foodDesc = `${item.quantity} × Sambusa`;
                          } else {
                            // Ertib base
                            foodDesc = `${item.quantity} × ${item.ertibType}`;

                            // Ketchup/Spices
                            if (item.ketchup && item.spices)
                              foodDesc += " Both";
                            else if (item.ketchup) foodDesc += " Ketchup";
                            else if (item.spices) foodDesc += " Spices";
                            else foodDesc += " Plain";

                            // Felafil check
                            if (!item.Felafil) foodDesc += ", No Felafil";

                            // Extras
                            if (item.extraKetchup)
                              foodDesc += ", Extra Ketchup";
                            if (item.doubleFelafil)
                              foodDesc += ", Double Felafil";
                          }

                          return (
                            <div
                              key={idx}
                              className="border border-gray-200 rounded-md p-2 mb-1 bg-gray-50"
                            >
                              <p className="font-semibold text-gray-800">
                                {foodDesc}
                              </p>
                            </div>
                          );
                        })}
                      </td>

                      {/* Total */}
                      <td className="p-3 font-semibold">{displayedTotal}</td>

                      {/* Tracking */}
                      <td className="p-3">
                        <div className="text-gray-800 font-semibold">
                          {order.trackingCode}
                        </div>
                        <a
                          href={`/track/${order.trackingCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded hover:bg-blue-100"
                          title="Open tracking page"
                        >
                          <FaExternalLinkAlt className="text-sm" />
                          <span className="hidden sm:inline">
                            Open Tracking
                          </span>
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(trackingMessage);
                            showToast("Tracking message copied!");
                          }}
                          title="Copy tracking message"
                          className="block mt-1 text-gray-600 hover:text-black p-1 rounded"
                          aria-label="Copy tracking message"
                        >
                          <FaCopy className="text-sm" />
                        </button>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <select
                          value={order.status}
                          onChange={(e) =>
                            updateStatus(orderId, e.target.value)
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

                      {/* Actions */}
                      <td className="p-3 flex items-center gap-3">
                        {/* Edit */}
                        <button
                          title="Edit order"
                          onClick={() =>
                            navigate(
                              `/order?edit=${encodeURIComponent(
                                order.trackingCode || orderId
                              )}`
                            )
                          }
                          className="text-amber-600 hover:text-amber-800 p-2 rounded-md bg-amber-100 hover:bg-amber-200 transition"
                        >
                          <FaEdit />
                        </button>

                        {/* Delete */}
                        <button
                          title="Delete order"
                          onClick={() => openDeleteModal(orderId)}
                          className="text-red-600 hover:text-red-800 p-2 rounded-md bg-red-100 hover:bg-red-200 transition"
                        >
                          <FaTrash />
                        </button>

                        {/* NEW — Send Tracking SMS */}
                        <button
                          title="Send tracking SMS"
                          onClick={() => {
                            const smsUrl = `sms:${
                              order.phone
                            }?body=${encodeURIComponent(trackingMessage)}`;
                            window.location.href = smsUrl;
                          }}
                          className="text-blue-600 hover:text-blue-800 p-2 rounded-full bg-blue-100 hover:bg-blue-200 shadow-sm transition flex items-center justify-center"
                        >
                          <FaPaperPlane className="text-md" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

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
      {/* Floating SMS Button */}
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 right-6 z-50">
          <div className="bg-black bg-opacity-90 text-white px-4 py-2 rounded-lg shadow-lg max-w-xs">
            <div className="text-sm">{toast}</div>
          </div>
        </div>
      )}
      <button
        onClick={openSmsModal}
        className="fixed bottom-6 right-6 bg-amber-500 hover:bg-amber-600 text-white p-4 rounded-full shadow-lg z-50 flex items-center justify-center"
        title="Send Promotional SMS"
      >
        <FaRegEnvelope className="text-sm" />
      </button>

      {/* SMS Modal */}
      {smsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-96 shadow-lg relative">
            <h2 className="text-lg font-bold mb-4 text-amber-700">
              📣 Send Bulk SMS
            </h2>

            <label className="block mb-2 font-medium">Select Day</label>
            <select
              value={smsDay}
              onChange={handleDayChange}
              className="border p-2 rounded w-full mb-4"
            >
              <option value="">-- Select Day --</option>
              {["Monday", "Tuesday", "Wednesday", "Thursday"].map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>

            <label className="block mb-2 font-medium">Message</label>
            <textarea
              rows={6}
              className="border p-2 rounded w-full mb-4"
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={closeSmsModal}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={sendBulkSMS}
                className="bg-amber-500 px-4 py-2 rounded hover:bg-amber-600 text-white flex items-center gap-2"
              >
                <FaPaperPlane />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
