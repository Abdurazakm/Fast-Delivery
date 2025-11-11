import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AiOutlineClose } from "react-icons/ai";
import API from "../api";

export default function Order() {
  const [customer, setCustomer] = useState({
    customerName: "",
    phone: "",
    location: "",
  });

  const [user, setUser] = useState(null);
  const [items, setItems] = useState([
    {
      foodType: "ertib", // either "ertib" or "sambusa"
      ertibType: "normal",
      ketchup: true,
      spices: true,
      extraKetchup: false,
      extraFelafil: false,
      quantity: 1,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewMode, setReviewMode] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await API.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);
        setCustomer({
          customerName: res.data.name || "",
          phone: res.data.phone || "",
          location: res.data.location || "",
        });
      } catch (err) {
        console.error("❌ Failed to load user:", err);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setCustomer({ customerName: "", phone: "", location: "" });
  };

  // ✅ Updated: different unit prices for each food type
  const getUnitPrice = (item) => {
    if (item.foodType === "sambusa") return 30; // price for Sambusa
    let base = item.ertibType === "normal" ? 110 : 135;
    if (item.extraKetchup) base += 10;
    if (item.extraFelafil) base += 15;
    return base;
  };

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, [name]: type === "checkbox" ? checked : value }
          : item
      )
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        foodType: "ertib",
        ertibType: "normal",
        ketchup: true,
        spices: true,
        extraKetchup: false,
        extraFelafil: false,
        quantity: 1,
      },
    ]);
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ Updated: better description for sambusa and ertib
  const describeItem = (item) => {
    if (item.foodType === "sambusa") {
      return `${item.quantity} × Sambusa`;
    }

    let desc = `${item.quantity} × ${item.ertibType} Ertib`;
    if (item.spices && item.ketchup) desc += " with both spices and ketchup";
    else if (item.spices && !item.ketchup) desc += " with only spices";
    else if (!item.spices && item.ketchup) desc += " with only ketchup";
    else desc += " with no ketchup or spices";

    if (item.extraKetchup) desc += ", extra ketchup";
    if (item.extraFelafil) desc += ", extra felafil";
    return desc;
  };

  const handleReview = (e) => {
    e.preventDefault();
    setReviewMode(true);
  };

  const handleConfirmOrder = async () => {
    setLoading(true);
    setMessage("");

    const itemList = items.map((item) => {
      const unitPrice = getUnitPrice(item);
      const lineTotal = unitPrice * item.quantity;
      return { ...item, unitPrice, lineTotal };
    });

    const total = itemList.reduce((sum, i) => sum + i.lineTotal, 0);
    const payload = { ...customer, items: itemList, total };

    try {
      let endpoint = "/orders";
      const headers = {};
      if (user?.role === "admin") {
        endpoint = "/orders/manual";
        const token = localStorage.getItem("token");
        headers.Authorization = `Bearer ${token}`;
      }

      await API.post(endpoint, payload, { headers });

      setMessage("Order placed successfully!");
      setCustomer({ customerName: "", phone: "", location: "" });
      setItems([
        {
          foodType: "ertib",
          ertibType: "normal",
          ketchup: true,
          spices: true,
          extraKetchup: false,
          extraFelafil: false,
          quantity: 1,
        },
      ]);
      setReviewMode(false);
    } catch (err) {
      console.error("❌ Order failed:", err);
      setMessage("Failed to place order. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => setReviewMode(false);

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-start p-6 bg-gradient-to-br from-amber-600 via-orange-500 to-red-600">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-4 sm:mb-6">
        <div>
          {user?.role === "admin" && (
            <Link
              to="/admin"
              className="px-5 py-3 bg-white/20 backdrop-blur-md border border-white text-white rounded-full hover:bg-white/30 transition text-sm sm:text-base"
            >
              Dashboard
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!user ? (
            <Link
              to="/login"
              className="px-5 py-3 bg-white/20 backdrop-blur-md border border-white text-white rounded-full hover:bg-white/30 transition text-sm sm:text-base"
            >
              Login
            </Link>
          ) : (
            <>
              <span className="text-white font-medium text-sm sm:text-base">
                Hi, {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition text-sm sm:text-base"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      {/* Order Form */}
      <div className="bg-white/90 backdrop-blur-lg shadow-2xl rounded-2xl p-6 sm:p-8 w-full max-w-lg border border-white/30">
        {message && (
          <div
            className={`mt-4 w-full max-w-lg mx-auto p-4 rounded-lg text-sm font-medium flex items-center justify-between gap-2 ${
              message.includes("successfully")
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{message.includes("successfully") ? "✅" : "❌"}</span>
              <span>{message}</span>
            </div>
            <button
              onClick={() => setMessage("")}
              className="text-gray-500 hover:text-gray-700"
            >
              <AiOutlineClose size={18} />
            </button>
          </div>
        )}

        <h1 className="text-2xl font-bold mb-6 text-center text-amber-700">
          🥙 Place Your Order
        </h1>

        {!reviewMode ? (
          <form onSubmit={handleReview} className="space-y-5">
            {/* Customer Info */}
            <input
              type="text"
              name="customerName"
              placeholder="Your Name"
              value={customer.customerName}
              onChange={handleCustomerChange}
              className="w-full border p-2 rounded-lg"
              required
            />
            <input
              type="text"
              name="phone"
              placeholder="Phone Number"
              value={customer.phone}
              onChange={handleCustomerChange}
              className="w-full border p-2 rounded-lg"
              required
            />
            <input
              type="text"
              name="location"
              placeholder="Delivery Location (e.g. Block14)"
              value={customer.location}
              onChange={handleCustomerChange}
              className="w-full border p-2 rounded-lg"
              required
            />

            {/* Items */}
            <div className="border-t pt-4 space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="font-semibold text-amber-700">
                      Item #{index + 1}
                    </h2>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 text-sm hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Food Type */}
                  <select
                    name="foodType"
                    value={item.foodType}
                    onChange={(e) => handleItemChange(index, e)}
                    className="w-full border p-2 rounded-lg mb-3"
                  >
                    <option value="ertib">Ertib</option>
                    <option value="sambusa">Sambusa</option>
                  </select>

                  {/* Ertib Options */}
                  {item.foodType === "ertib" && (
                    <>
                      <select
                        name="ertibType"
                        value={item.ertibType}
                        onChange={(e) => handleItemChange(index, e)}
                        className="w-full border p-2 rounded-lg"
                      >
                        <option value="normal">Normal</option>
                        <option value="special">Special</option>
                      </select>

                      <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                        {[
                          "ketchup",
                          "spices",
                          "extraKetchup",
                          "extraFelafil",
                        ].map((field) => (
                          <label
                            key={field}
                            className="flex items-center space-x-2"
                          >
                            <input
                              type="checkbox"
                              name={field}
                              checked={item[field]}
                              onChange={(e) => handleItemChange(index, e)}
                            />
                            <span>
                              {field.replace(/([A-Z])/g, " $1").trim()}
                            </span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Quantity */}
                  <div className="mt-3">
                    <label className="block font-medium">Quantity:</label>
                    <input
                      type="number"
                      name="quantity"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, e)}
                      className="w-full border p-2 rounded-lg"
                    />
                  </div>

                  <div className="flex justify-between text-sm mt-2">
                    <span>Unit: {getUnitPrice(item)} Birr</span>
                    <span>
                      Line Total: {getUnitPrice(item) * item.quantity} Birr
                    </span>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addItem}
                className="w-full border border-amber-700 text-amber-700 py-2 rounded-lg hover:bg-amber-700 hover:text-white transition"
              >
                + Add Another Item
              </button>
            </div>

            <div className="text-right text-sm font-semibold text-gray-700">
              Total:{" "}
              {items.reduce(
                (sum, item) => sum + getUnitPrice(item) * item.quantity,
                0
              )}{" "}
              Birr
            </div>

            <button
              type="submit"
              className="w-full bg-amber-700 text-white py-2 rounded-lg hover:bg-amber-800 transition"
            >
              Review Order
            </button>
          </form>
        ) : (
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-700">
              Review Your Order
            </h2>
            <div className="space-y-3">
              {items.map((item, i) => (
                <p key={i} className="border p-2 rounded-lg text-sm">
                  {describeItem(item)} —{" "}
                  <strong>{getUnitPrice(item) * item.quantity} Birr</strong>
                </p>
              ))}
            </div>

            <div className="text-right mt-4 font-semibold text-gray-700">
              Total:{" "}
              {items.reduce(
                (sum, item) => sum + getUnitPrice(item) * item.quantity,
                0
              )}{" "}
              Birr
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleBack}
                className="flex-1 border border-gray-400 py-2 rounded-lg hover:bg-gray-100"
              >
                Back & Edit
              </button>
              <button
                onClick={handleConfirmOrder}
                disabled={loading}
                className="flex-1 bg-amber-700 text-white py-2 rounded-lg hover:bg-amber-800 transition"
              >
                {loading ? "Placing..." : "Confirm Order"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
