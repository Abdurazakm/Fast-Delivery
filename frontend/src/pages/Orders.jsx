import { useEffect, useState } from "react";
import axios from "axios";

export default function Order() {
  const [customer, setCustomer] = useState({
    customerName: "",
    phone: "",
    location: "",
  });

  const [items, setItems] = useState([
    {
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

  // ✅ Fetch registered user info (auto-fill)
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem("token"); // must be stored at login
        if (!token) return; // not logged in, skip

        const res = await axios.get("http://localhost:4000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = res.data;
        setCustomer({
          customerName: data.name || "",
          phone: data.phone || "",
          location: data.location || "",
        });
      } catch (err) {
        console.error("Failed to load user info:", err);
      }
    };

    fetchUserInfo();
  }, []);

  // Price calculator for each item
  const getUnitPrice = (item) => {
    let base = item.ertibType === "normal" ? 110 : 135;
    if (item.extraKetchup) base += 10;
    if (item.extraFelafil) base += 15;
    return base;
  };

  // Handle customer info change
  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  };

  // Handle item field change
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

  // Add new item
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        ertibType: "normal",
        ketchup: true,
        spices: true,
        extraKetchup: false,
        extraFelafil: false,
        quantity: 1,
      },
    ]);
  };

  // Remove item
  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Describe order item
  const describeItem = (item) => {
    let desc = `${item.quantity} × ${item.ertibType} Ertib`;

    if (item.spices && item.ketchup) desc += " with both spices and ketchup";
    else if (item.spices && !item.ketchup) desc += " with only spices";
    else if (!item.spices && item.ketchup) desc += " with only ketchup";
    else desc += " with no ketchup or spices";

    if (item.extraKetchup) desc += ", extra ketchup";
    if (item.extraFelafil) desc += ", extra felafil";

    return desc;
  };

  // Review step trigger
  const handleReview = (e) => {
    e.preventDefault();
    setReviewMode(true);
  };

  // Confirm final order
  const handleConfirmOrder = async () => {
    setLoading(true);
    setMessage("");

    const itemList = items.map((item) => {
      const unitPrice = getUnitPrice(item);
      const lineTotal = unitPrice * item.quantity;
      return { ...item, unitPrice, lineTotal };
    });

    const total = itemList.reduce((sum, i) => sum + i.lineTotal, 0);

    const payload = {
      ...customer,
      items: itemList,
      total,
    };

    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:4000/api/orders", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage("✅ Order placed successfully!");
      setCustomer({ customerName: "", phone: "", location: "" });
      setItems([
        {
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
      setMessage("❌ Failed to place order. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // Go back to edit
  const handleBack = () => {
    setReviewMode(false);
  };

  // ------------------- UI -------------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white shadow-md rounded-2xl p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6 text-center text-amber-700">
          🥙 Place Your Ertib Order
        </h1>

        {!reviewMode ? (
          <form onSubmit={handleReview} className="space-y-5">
            {/* Customer info */}
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
              placeholder="Delivery Location"
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
                      Ertib #{index + 1}
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
                    {["ketchup", "spices", "extraKetchup", "extraFelafil"].map(
                      (field) => (
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
                      )
                    )}
                  </div>

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
                + Add Another Ertib
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

        {message && (
          <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
        )}
      </div>
    </div>
  );
}
