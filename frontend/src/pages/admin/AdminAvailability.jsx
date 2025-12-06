import { useEffect, useState } from "react";
import API from "../../api";
import { Link } from "react-router-dom";
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
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 
  bg-white/90 backdrop-blur-xl
  border-r border-gray-200
  shadow-[4px_0_20px_rgba(0,0,0,0.06)]
  z-50 transform transition-transform duration-300 
  ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
  lg:translate-x-0`}
      >
        {/* Header */}
        <div className="p-6 flex justify-between items-center border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 tracking-wide">
            Admin Panel
          </h1>

          <button
            className="lg:hidden text-gray-600 hover:text-gray-900 transition"
            onClick={() => setSidebarOpen(false)}
          >
            <HiX size={26} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 mt-2 space-y-1">
          {/* Reusable Link Style */}
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg
      text-gray-700 hover:text-amber-600
      hover:bg-amber-50 transition font-medium relative group"
          >
            <span
              className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r-full 
      opacity-0 group-hover:opacity-100 transition"
            ></span>
            Home
          </Link>

          <Link
            to="/order"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg
      text-gray-700 hover:text-amber-600 
      hover:bg-amber-50 transition font-medium relative group"
          >
            <span
              className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r-full 
      opacity-0 group-hover:opacity-100 transition"
            ></span>
            Add Order
          </Link>

          <Link
            to="/admin"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg
      text-gray-700 hover:text-amber-600 
      hover:bg-amber-50 transition font-medium relative group"
          >
            <span
              className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r-full 
      opacity-0 group-hover:opacity-100 transition"
            ></span>
            Dashboard
          </Link>

          {/* Active Link */}
          <Link
            to="/availability"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg
      bg-amber-100 text-amber-700 font-semibold shadow-sm
      relative"
          >
            {/* Active indicator */}
            <span className="absolute left-0 top-0 bottom-0 w-1 bg-amber-600 rounded-r-full"></span>
            Service Availability
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <header
          className="bg-white/80 backdrop-blur-md border-b border-gray-200 
        shadow-sm p-4 flex justify-between items-center lg:pl-72 sticky top-0 z-40"
        >
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
            className="p-2 rounded-full bg-amber-500 text-white shadow 
            hover:bg-amber-600 transition"
          >
            <HiChevronRight size={22} />
          </Link>
        </header>

        {/* Toast */}
        {toastMessage && (
          <Toast
            message={toastMessage}
            type={toastType}
            onClose={() => setToastMessage(null)}
          />
        )}

        {/* Card */}
        <main className="flex justify-center px-4 py-10 lg:pl-72">
          <div
            className="bg-white/90 backdrop-blur-md w-full max-w-2xl 
          rounded-3xl shadow-xl p-10 border border-amber-100 
          hover:shadow-2xl transition-all"
          >
            {/* Working Days */}
            <div className="mb-8">
              <label
                className="block mb-3 text-lg font-semibold text-gray-900 
                tracking-wide px-4 py-2 rounded-xl 
                bg-gradient-to-r from-amber-300/20 to-amber-100/10
                border-l-4 border-amber-500 shadow-sm backdrop-blur-sm"
              >
                Working Days
              </label>

              <div className="flex flex-wrap gap-3">
                {daysOptions.map((day) => (
                  <button
                    key={day}
                    onClick={() => handleToggleDay(day)}
                    className={`px-4 py-2 rounded-full border shadow-sm text-sm font-medium 
                    transition-all duration-200 ${
                      availability.weeklyDays.includes(day)
                        ? "bg-amber-500 text-white border-amber-500 shadow-md scale-[1.05]"
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
              <label
                className="block mb-3 text-lg font-semibold text-gray-900 
                tracking-wide px-4 py-2 rounded-xl 
                bg-gradient-to-r from-amber-300/20 to-amber-100/10
                border-l-4 border-amber-500 shadow-sm backdrop-blur-sm"
              >
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
              <label
                className="flex items-center gap-3 text-lg font-semibold text-gray-900 
                tracking-wide px-4 py-2 rounded-xl
                bg-gradient-to-r from-amber-300/20 to-amber-100/10
                border-l-4 border-amber-500 shadow-sm backdrop-blur-sm"
              >
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
                className="px-10 py-3 bg-amber-500 hover:bg-amber-600 
                text-white font-semibold rounded-xl shadow-lg 
                transition-all duration-200 hover:shadow-xl hover:scale-[1.03]"
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
