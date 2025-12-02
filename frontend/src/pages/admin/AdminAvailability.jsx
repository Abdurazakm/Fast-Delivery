import { useEffect, useState } from "react";
import API from "../../api";
import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { HiMenu, HiX, HiChevronRight } from "react-icons/hi";
import Toast from "../Toast";

export default function AdminAvailability() {
  const [availability, setAvailability] = useState({
    weeklyDays: ["Mon", "Tue", "Wed", "Thu"],
    cutoffTime: "18:00",
    isTemporarilyClosed: false,
    tempCloseReason: "",
  });

  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState("success");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const daysOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  useEffect(() => {
    API.get("/availability")
      .then((res) => {
        if (res.data) setAvailability(res.data);
      })
      .catch((err) => console.error("Error fetching availability:", err));
  }, []);

  const handleToggleDay = (day) => {
    setAvailability((prev) => {
      const isSelected = prev.weeklyDays.includes(day);
      return {
        ...prev,
        weeklyDays: isSelected
          ? prev.weeklyDays.filter((d) => d !== day)
          : [...prev.weeklyDays, day],
      };
    });
  };

  const handleSave = async () => {
    try {
      await API.post("/availability", availability);
      setToastMessage("Availability updated successfully!");
      setToastType("success");
    } catch (err) {
      console.error("Error updating availability:", err);
      setToastMessage("Failed to update availability.");
      setToastType("error");
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ⬅ Sidebar (Mobile friendly) */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      >
        <div className="p-6 flex justify-between items-center border-b">
          <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
          <button
            className="lg:hidden text-gray-600"
            onClick={() => setSidebarOpen(false)}
          >
            <HiX size={26} />
          </button>
        </div>

        <nav className="p-6 space-y-4">
          <Link
            to="/admin"
            className="block px-4 py-2 rounded-lg hover:bg-gray-100 font-medium text-gray-800"
          >
            Dashboard
          </Link>
          <Link
            to="/"
            className="block px-4 py-2 rounded-lg hover:bg-gray-100 font-medium text-gray-800"
          >
            Home
          </Link>
          <Link
            to="/availability"
            className="block px-4 py-2 rounded-lg bg-amber-100 text-amber-700 font-medium"
          >
            Service Availability
          </Link>
        </nav>
      </aside>

      {/* 🔥 Content Area */}
      <div className="flex-1 flex flex-col">
        {/* 📌 Top Navbar */}
        <header className="bg-white shadow-md p-4 flex justify-between items-center lg:pl-72">
          <button
            className="lg:hidden text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <HiMenu size={28} />
          </button>

          <h2 className="text-xl font-bold text-gray-800">
            Manage Availability
          </h2>

          <Link
            to="/admin"
            className="p-2 rounded-full bg-amber-500 text-white shadow hover:bg-amber-600 transition"
          >
            <HiChevronRight size={22} />
          </Link>
        </header>

        {/* 🎉 Success / Error Toast */}
        {toastMessage && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => setToastMessage(null)}
          />
        )}

        {/* 🟨 Main Card Container */}
        <main className="flex justify-center px-4 py-10 lg:pl-72">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg p-8 border">
            <h3 className="text-2xl font-bold text-center text-gray-800 mb-8">
              Manage Service Availability
            </h3>

            {/* Working Days */}
            <div className="mb-8">
              <label className="font-semibold text-gray-700 block mb-3 text-lg">
                Working Days
              </label>

              <div className="flex flex-wrap gap-3">
                {daysOptions.map((day) => (
                  <button
                    key={day}
                    onClick={() => handleToggleDay(day)}
                    className={`px-4 py-2 rounded-full border shadow-sm text-sm font-medium transition ${
                      availability.weeklyDays.includes(day)
                        ? "bg-amber-500 text-white border-amber-500 shadow"
                        : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Cutoff Time */}
            <div className="mb-8">
              <label className="font-semibold text-gray-700 block mb-3 text-lg">
                Cutoff Time
              </label>
              <input
                type="time"
                value={availability.cutoffTime}
                onChange={(e) =>
                  setAvailability((prev) => ({
                    ...prev,
                    cutoffTime: e.target.value,
                  }))
                }
                className="px-4 py-2 border rounded-lg w-full bg-gray-50 
                          focus:ring-2 focus:ring-amber-500 shadow-sm"
              />
            </div>

            {/* Temporary Closure */}
            <div className="mb-8">
              <label className="flex items-center gap-3 font-semibold text-gray-700 text-lg">
                <input
                  type="checkbox"
                  checked={availability.isTemporarilyClosed}
                  onChange={(e) =>
                    setAvailability((prev) => ({
                      ...prev,
                      isTemporarilyClosed: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 accent-amber-500"
                />
                Temporarily Closed
              </label>

              {availability.isTemporarilyClosed && (
                <textarea
                  placeholder="Reason for temporary closure"
                  value={availability.tempCloseReason}
                  onChange={(e) =>
                    setAvailability((prev) => ({
                      ...prev,
                      tempCloseReason: e.target.value,
                    }))
                  }
                  className="mt-4 px-4 py-3 border rounded-lg w-full h-28 bg-gray-50 
                            focus:ring-2 focus:ring-amber-500 shadow-sm"
                />
              )}
            </div>

            {/* Save Button */}
            <div className="text-center">
              <button
                onClick={handleSave}
                className="px-10 py-3 bg-amber-500 hover:bg-amber-600 transition text-white font-semibold rounded-xl shadow"
              >
                Save Changes
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
