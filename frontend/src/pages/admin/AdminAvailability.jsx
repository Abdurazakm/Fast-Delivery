import { useEffect, useState, useMemo } from "react";
import API from "../../api";
import { Link } from "react-router-dom";
import { HiMenu, HiX, HiChevronRight } from "react-icons/hi";
import {
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  TrendingUp,
  Store,
  Sliders,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  Info,
  Save,
  Check,
} from "lucide-react";
import Toast from "../Toast";
import { getSocket } from "../../socket";

const PRICING_FIELDS = [
  "sambusaPrice",
  "boiledEggPrice",
  "ertibNormalPrice",
  "ertibSpecialPrice",
  "fetiraBasePrice",
  "fetiraExtraEggPrice",
  "donut1PairPackagePrice",
  "donut2PairPackagePrice",
  "donut4PairPackagePrice",
  "donut6PairPackagePrice",
  "extraKetchupPrice",
  "doubleFelafilPrice",
  "sambusaCost",
  "boiledEggCost",
  "ertibNormalCost",
  "ertibSpecialCost",
  "fetiraBaseCost",
  "fetiraExtraEggCost",
  "donut1PairPackageCost",
  "donut2PairPackageCost",
  "donut4PairPackageCost",
  "donut6PairPackageCost",
  "extraKetchupCost",
  "doubleFelafilCost",
];

const DEFAULT_ITEM_AVAILABILITY = {
  ertib: true,
  fetira: true,
  donut: true,
  sambusa: true,
  boiled_egg: true,
};

const ITEM_CONFIGS = [
  {
    id: "ertib",
    name: "Ertib",
    subtitle: "Signature stuffed flatbread rolls",
    category: "Main Meal",
    icon: "🌯",
  },
  {
    id: "fetira",
    name: "Fetira",
    subtitle: "Pan-fried layered egg pastry",
    category: "Main Meal",
    icon: "🍳",
  },
  {
    id: "donut",
    name: "Fresh Donuts",
    subtitle: "Sweet glazed & powdered donuts",
    category: "Pastry",
    icon: "🍩",
  },
  {
    id: "sambusa",
    name: "Sambusa",
    subtitle: "Crispy savory fried triangles",
    category: "Snack / Side",
    icon: "🥟",
  },
  {
    id: "boiled_egg",
    name: "Boiled Egg",
    subtitle: "Seasoned hard-boiled egg",
    category: "Add-on",
    icon: "🥚",
  },
];

const PRICING_GROUPS = [
  {
    category: "Signature Meals",
    description: "Core kitchen specialties and prepared foods",
    icon: "🌯",
    items: [
      {
        priceKey: "ertibNormalPrice",
        costKey: "ertibNormalCost",
        title: "Ertib (Normal)",
        note: "Base recipe standard portion",
      },
      {
        priceKey: "ertibSpecialPrice",
        costKey: "ertibSpecialCost",
        title: "Ertib (Special)",
        note: "Includes extra toppings & fillings",
      },
      {
        priceKey: "fetiraBasePrice",
        costKey: "fetiraBaseCost",
        title: "Fetira Base",
        note: "Standard recipe (3 eggs)",
      },
      {
        priceKey: "fetiraExtraEggPrice",
        costKey: "fetiraExtraEggCost",
        title: "Fetira Extra Egg",
        note: "Additional egg add-in",
      },
    ],
  },
  {
    category: "Donut Packages & Combos",
    description: "Volume-based packaged sweet pastry deals",
    icon: "🍩",
    items: [
      {
        priceKey: "donut1PairPackagePrice",
        costKey: "donut1PairPackageCost",
        title: "Donut 1-Pair Pack",
        note: "2 donuts single serving",
      },
      {
        priceKey: "donut2PairPackagePrice",
        costKey: "donut2PairPackageCost",
        title: "Donut 2-Pair Pack",
        note: "4 donuts snack box",
      },
      {
        priceKey: "donut4PairPackagePrice",
        costKey: "donut4PairPackageCost",
        title: "Donut 4-Pair Pack",
        note: "8 donuts sharing box",
      },
      {
        priceKey: "donut6PairPackagePrice",
        costKey: "donut6PairPackageCost",
        title: "Donut 6-Pair Pack",
        note: "12 donuts party box",
      },
    ],
  },
  {
    category: "Sides & Extras",
    description: "Quick snacks, protein boosters and condiments",
    icon: "🥟",
    items: [
      {
        priceKey: "sambusaPrice",
        costKey: "sambusaCost",
        title: "Sambusa",
        note: "Per piece price & cost",
      },
      {
        priceKey: "boiledEggPrice",
        costKey: "boiledEggCost",
        title: "Boiled Egg",
        note: "Single hard boiled egg",
      },
      {
        priceKey: "extraKetchupPrice",
        costKey: "extraKetchupCost",
        title: "Extra Ketchup",
        note: "Condiment serving",
      },
      {
        priceKey: "doubleFelafilPrice",
        costKey: "doubleFelafilCost",
        title: "Double Felafil",
        note: "Protein extra add-in",
      },
    ],
  },
];

const PRESET_PAUSE_REASONS = [
  "Kitchen at peak rush capacity",
  "Sold out of today's ingredients",
  "Severe rain / campus delivery paused",
  "Temporary equipment maintenance",
];

const DAYS_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AdminAvailability() {
  const [activeTab, setActiveTab] = useState("schedule"); // 'schedule' | 'items' | 'pricing'
  const [availability, setAvailability] = useState({
    weeklyDays: ["Mon", "Tue", "Wed", "Thu"],
    cutoffTime: "18:00",
    isTemporarilyClosed: false,
    tempCloseReason: "",
    itemAvailability: DEFAULT_ITEM_AVAILABILITY,
  });

  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState("success");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pricing, setPricing] = useState({});

  // Loading & Saving States
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);
  const [togglingItem, setTogglingItem] = useState(null);
  const [currentTimeEAT, setCurrentTimeEAT] = useState(new Date());

  // Clock tick for live status updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeEAT(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial data
  useEffect(() => {
    Promise.all([API.get("/availability"), API.get("/admin/pricing")])
      .then(([availabilityRes, pricingRes]) => {
        if (availabilityRes.data) {
          setAvailability((prev) => ({
            ...prev,
            ...availabilityRes.data,
            itemAvailability: {
              ...DEFAULT_ITEM_AVAILABILITY,
              ...(availabilityRes.data.itemAvailability || {}),
            },
          }));
        }
        if (pricingRes.data) {
          setPricing((prev) => ({ ...prev, ...pricingRes.data }));
        }
      })
      .catch((err) => console.error("Error fetching availability:", err));
  }, []);

  // Real-time socket sync
  useEffect(() => {
    const socket = getSocket();

    const handleAvailabilityUpdated = (payload) => {
      if (payload) {
        setAvailability((prev) => ({
          ...prev,
          ...payload,
          itemAvailability: {
            ...DEFAULT_ITEM_AVAILABILITY,
            ...(payload.itemAvailability || {}),
          },
        }));
      }
    };

    const handlePricingUpdated = (payload) => {
      if (payload && typeof payload === "object") {
        setPricing((prev) => ({ ...prev, ...payload }));
      }
    };

    socket.on("availability:updated", handleAvailabilityUpdated);
    socket.on("pricing:updated", handlePricingUpdated);

    return () => {
      socket.off("availability:updated", handleAvailabilityUpdated);
      socket.off("pricing:updated", handlePricingUpdated);
    };
  }, []);

  // Calculate live operational state in Addis Ababa Time (EAT, UTC+3)
  const operationalStatus = useMemo(() => {
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Addis_Ababa",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        hourCycle: "h23",
      });

      const parts = formatter.formatToParts(currentTimeEAT);
      const dayStr = parts.find((p) => p.type === "weekday")?.value;
      const currentHour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
      const currentMinute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);

      const [cutoffH, cutoffM] = (availability.cutoffTime || "18:00")
        .split(":")
        .map(Number);

      const currentTotalMin = currentHour * 60 + currentMinute;
      const cutoffTotalMin = (cutoffH || 18) * 60 + (cutoffM || 0);

      const isWorkingDay = (availability.weeklyDays || []).includes(dayStr);
      const isPastCutoff = currentTotalMin >= cutoffTotalMin;
      const minutesRemaining = cutoffTotalMin - currentTotalMin;

      if (availability.isTemporarilyClosed) {
        return {
          state: "PAUSED",
          badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
          dotColor: "bg-rose-500",
          title: "Service Temporarily Paused",
          detail: availability.tempCloseReason || "Orders are currently suspended by staff.",
          isOpen: false,
        };
      }

      if (!isWorkingDay) {
        return {
          state: "CLOSED_DAY",
          badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
          dotColor: "bg-amber-500",
          title: `Closed Today (${dayStr})`,
          detail: `Operating days: ${(availability.weeklyDays || []).join(", ") || "None scheduled"}`,
          isOpen: false,
        };
      }

      if (isPastCutoff) {
        return {
          state: "PAST_CUTOFF",
          badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
          dotColor: "bg-slate-500",
          title: "Ordering Closed for Today",
          detail: `Cutoff was at ${availability.cutoffTime} EAT. Kitchen is preparing evening deliveries.`,
          isOpen: false,
        };
      }

      if (minutesRemaining <= 45) {
        return {
          state: "CLOSING_SOON",
          badgeColor: "bg-amber-100 text-amber-900 border-amber-400",
          dotColor: "bg-amber-500 animate-ping",
          title: "Closing Soon (Last Orders)",
          detail: `Only ${minutesRemaining} minutes remaining before ${availability.cutoffTime} cutoff!`,
          isOpen: true,
        };
      }

      const hrs = Math.floor(minutesRemaining / 60);
      const mins = minutesRemaining % 60;
      const remainingLabel = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

      return {
        state: "OPEN",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
        dotColor: "bg-emerald-500",
        title: "Open & Accepting Orders",
        detail: `Accepting orders until ${availability.cutoffTime} EAT (${remainingLabel} remaining)`,
        isOpen: true,
      };
    } catch {
      return {
        state: "UNKNOWN",
        badgeColor: "bg-gray-100 text-gray-800 border-gray-300",
        dotColor: "bg-gray-400",
        title: "Operational Status Ready",
        detail: `Operating cutoff: ${availability.cutoffTime || "18:00"}`,
        isOpen: true,
      };
    }
  }, [availability, currentTimeEAT]);

  // Available items count
  const itemsStats = useMemo(() => {
    const total = ITEM_CONFIGS.length;
    const inStock = ITEM_CONFIGS.filter(
      (item) => (availability.itemAvailability || {})[item.id] !== false
    ).length;
    return { inStock, total, outOfStock: total - inStock };
  }, [availability.itemAvailability]);

  // Handlers for Schedule
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

  const applyDayPreset = (preset) => {
    if (preset === "campus") {
      setAvailability((prev) => ({
        ...prev,
        weeklyDays: ["Mon", "Tue", "Wed", "Thu"],
      }));
    } else if (preset === "all") {
      setAvailability((prev) => ({
        ...prev,
        weeklyDays: [...DAYS_OPTIONS],
      }));
    } else if (preset === "clear") {
      setAvailability((prev) => ({
        ...prev,
        weeklyDays: [],
      }));
    }
  };

  const handleSaveSchedule = async (overrides = {}) => {
    try {
      setSavingSchedule(true);
      const payload = { ...availability, ...overrides };
      await API.post("/availability", payload);
      setAvailability((prev) => ({ ...prev, ...payload }));
      setToastMessage("Store schedule & status updated successfully!");
      setToastType("success");
    } catch (err) {
      console.error("Error updating availability:", err);
      setToastMessage("Failed to update store schedule.");
      setToastType("error");
    } finally {
      setSavingSchedule(false);
    }
  };

  // Instant Pause / Resume Quick Toggle
  const handleToggleEmergencyPause = async () => {
    const newClosedState = !availability.isTemporarilyClosed;
    const newReason = newClosedState
      ? availability.tempCloseReason || PRESET_PAUSE_REASONS[0]
      : "";

    await handleSaveSchedule({
      isTemporarilyClosed: newClosedState,
      tempCloseReason: newReason,
    });
  };

  // Instant Item Stock Toggle (86'ing)
  const handleToggleItemAvailability = async (foodId) => {
    const currentStatus = (availability.itemAvailability || {})[foodId] !== false;
    const nextStatus = !currentStatus;

    const nextItemAvailability = {
      ...DEFAULT_ITEM_AVAILABILITY,
      ...(availability.itemAvailability || {}),
      [foodId]: nextStatus,
    };

    // Optimistic UI update
    setAvailability((prev) => ({
      ...prev,
      itemAvailability: nextItemAvailability,
    }));
    setTogglingItem(foodId);

    try {
      await API.post("/availability", {
        ...availability,
        itemAvailability: nextItemAvailability,
      });
      const itemConfig = ITEM_CONFIGS.find((i) => i.id === foodId);
      setToastMessage(
        `${itemConfig?.name || foodId} is now ${
          nextStatus ? "🟢 Available" : "🔴 Sold Out (86'd)"
        }`
      );
      setToastType("success");
    } catch (err) {
      console.error("Failed to update item status:", err);
      // Revert on error
      setAvailability((prev) => ({
        ...prev,
        itemAvailability: {
          ...prev.itemAvailability,
          [foodId]: currentStatus,
        },
      }));
      setToastMessage("Failed to update item availability.");
      setToastType("error");
    } finally {
      setTogglingItem(null);
    }
  };

  const handleSetAllItemsStock = async (stockValue) => {
    const nextItemAvailability = {};
    ITEM_CONFIGS.forEach((item) => {
      nextItemAvailability[item.id] = stockValue;
    });

    try {
      await API.post("/availability", {
        ...availability,
        itemAvailability: nextItemAvailability,
      });
      setAvailability((prev) => ({
        ...prev,
        itemAvailability: nextItemAvailability,
      }));
      setToastMessage(
        stockValue
          ? "All items marked Available!"
          : "All items marked Sold Out!"
      );
      setToastType("success");
    } catch (err) {
      console.error(err);
      setToastMessage("Failed to update items.");
      setToastType("error");
    }
  };

  // Pricing Handlers
  const handlePriceChange = (field, value) => {
    setPricing((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSavePricing = async () => {
    try {
      setSavingPrices(true);
      const payload = {};
      PRICING_FIELDS.forEach((key) => {
        payload[key] = Number(pricing[key]) || 0;
      });

      const res = await API.put("/admin/pricing", payload);
      setPricing((prev) => ({ ...prev, ...(res.data || payload) }));
      setToastMessage("Menu prices and costs updated successfully!");
      setToastType("success");
    } catch (err) {
      console.error("Error updating prices:", err);
      setToastMessage("Failed to update prices.");
      setToastType("error");
    } finally {
      setSavingPrices(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-800">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 
        bg-white border-r border-slate-200
        shadow-[4px_0_24px_rgba(0,0,0,0.04)]
        z-50 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-6 flex justify-between items-center border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-lg border border-amber-200">
              ⚡
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Fetan Delivery
              </h1>
              <p className="text-xs font-medium text-slate-400">Merchant Hub</p>
            </div>
          </div>

          <button
            className="lg:hidden text-slate-400 hover:text-slate-700 transition p-1"
            onClick={() => setSidebarOpen(false)}
          >
            <HiX size={22} />
          </button>
        </div>

        {/* Sidebar Links */}
        <nav className="p-4 space-y-1.5 flex-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Operations
          </div>

          <Link
            to="/admin"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl
            text-slate-600 hover:text-amber-700 hover:bg-amber-50/70 transition font-medium text-sm group"
          >
            <Store className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition" />
            Live Orders Dashboard
          </Link>

          <Link
            to="/availability"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl
            bg-amber-50 text-amber-800 font-semibold text-sm border border-amber-200/70 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <Sliders className="w-4 h-4 text-amber-600" />
              <span>Operations & Availability</span>
            </div>
            <span
              className={`w-2 h-2 rounded-full ${
                operationalStatus.isOpen ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
          </Link>

          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Store Links
          </div>

          <Link
            to="/menu"
            className="flex items-center gap-3 px-3.5 py-2 rounded-xl
            text-slate-600 hover:text-amber-700 hover:bg-amber-50/70 transition font-medium text-sm group"
          >
            <Package className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition" />
            Customer Menu View
          </Link>

          <Link
            to="/order"
            className="flex items-center gap-3 px-3.5 py-2 rounded-xl
            text-slate-600 hover:text-amber-700 hover:bg-amber-50/70 transition font-medium text-sm group"
          >
            <Layers className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition" />
            Manual Order Screen
          </Link>

          <Link
            to="/"
            className="flex items-center gap-3 px-3.5 py-2 rounded-xl
            text-slate-600 hover:text-amber-700 hover:bg-amber-50/70 transition font-medium text-sm group"
          >
            <Store className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition" />
            Storefront Home
          </Link>
        </nav>

        {/* Live Status Pill at bottom of sidebar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700">Kitchen State</span>
              <span
                className={`inline-flex items-center gap-1 font-bold text-[10px] px-1.5 py-0.5 rounded-full ${
                  operationalStatus.isOpen
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${operationalStatus.dotColor}`} />
                {operationalStatus.isOpen ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {operationalStatus.title}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Top Sticky Header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <HiMenu size={22} />
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Operations & Availability
              </h2>
              <p className="text-xs text-slate-500 hidden sm:block">
                Manage operating hours, instant kitchen stock (86ing), and menu dynamic pricing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-slate-700"
            >
              Back to Orders <HiChevronRight size={14} />
            </Link>
          </div>
        </header>

        {/* Page Body */}
        <main className="p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* ============================================================== */}
          {/* 1. INDUSTRY STANDARD LIVE STORE STATUS BAR (HERO COMPONENT)    */}
          {/* ============================================================== */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 transition">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                    operationalStatus.isOpen
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                      : "bg-rose-50 text-rose-600 border-rose-200"
                  }`}
                >
                  {operationalStatus.isOpen ? (
                    <Store className="w-6 h-6" />
                  ) : (
                    <Pause className="w-6 h-6" />
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${operationalStatus.badgeColor}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${operationalStatus.dotColor}`}
                      />
                      {operationalStatus.title}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Addis Ababa Time:{" "}
                      {currentTimeEAT.toLocaleTimeString("en-US", {
                        timeZone: "Africa/Addis_Ababa",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      EAT
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 font-medium">
                    {operationalStatus.detail}
                  </p>

                  {/* Summary Badges */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Cutoff: {availability.cutoffTime}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Days: {availability.weeklyDays?.join(", ") || "None"}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      Kitchen Stock: {itemsStats.inStock}/{itemsStats.total} active
                    </span>
                  </div>
                </div>
              </div>

              {/* Instant Kill-Switch / Pause Button */}
              <div className="shrink-0 flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                {availability.isTemporarilyClosed ? (
                  <button
                    onClick={handleToggleEmergencyPause}
                    disabled={savingSchedule}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm shadow-sm transition active:scale-95 disabled:opacity-60"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Resume Accepting Orders
                  </button>
                ) : (
                  <button
                    onClick={handleToggleEmergencyPause}
                    disabled={savingSchedule}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold text-sm transition active:scale-95 disabled:opacity-60"
                  >
                    <Pause className="w-4 h-4" />
                    Pause Orders (Emergency)
                  </button>
                )}
              </div>
            </div>

            {/* Quick Reason Bar when closed */}
            {availability.isTemporarilyClosed && (
              <div className="mt-4 p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>Customer Notice:</strong>{" "}
                    {availability.tempCloseReason || "Temporarily closed for maintenance"}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab("schedule")}
                  className="text-xs font-bold underline hover:text-rose-950 shrink-0 text-left"
                >
                  Edit Notice in Schedule Tab →
                </button>
              </div>
            )}
          </section>

          {/* ============================================================== */}
          {/* 2. SEGMENTED NAVIGATION TABS (INDUSTRY BENCHMARK)             */}
          {/* ============================================================== */}
          <div className="flex border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("schedule")}
              className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                activeTab === "schedule"
                  ? "border-amber-600 text-amber-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Store Schedule & Hours
            </button>

            <button
              onClick={() => setActiveTab("items")}
              className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                activeTab === "items"
                  ? "border-amber-600 text-amber-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Package className="w-4 h-4" />
              Kitchen Item Availability (86ing)
              {itemsStats.outOfStock > 0 && (
                <span className="bg-rose-100 text-rose-700 font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                  {itemsStats.outOfStock} Sold Out
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("pricing")}
              className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                activeTab === "pricing"
                  ? "border-amber-600 text-amber-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Dynamic Pricing & Margins
            </button>
          </div>

          {/* ============================================================== */}
          {/* TAB 1: STORE SCHEDULE & HOURS                                  */}
          {/* ============================================================== */}
          {activeTab === "schedule" && (
            <div className="space-y-6">
              {/* Working Days */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      Weekly Operating Days
                    </h3>
                    <p className="text-xs text-slate-500">
                      Customers will only be allowed to place orders on highlighted active days.
                    </p>
                  </div>

                  {/* Day Presets */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 font-medium mr-1">Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyDayPreset("campus")}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                    >
                      Mon–Thu (Campus)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDayPreset("all")}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                    >
                      All 7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDayPreset("clear")}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 font-medium transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                  {DAYS_OPTIONS.map((day) => {
                    const isSelected = (availability.weeklyDays || []).includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDay(day)}
                        className={`py-3.5 px-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? "bg-amber-500 border-amber-600 text-white shadow-sm font-bold scale-[1.02]"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-medium"
                        }`}
                      >
                        <span className="text-sm">{day}</span>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider ${
                            isSelected ? "text-amber-100" : "text-slate-400"
                          }`}
                        >
                          {isSelected ? "Active" : "Closed"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cutoff Time & Delivery Window */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="max-w-md">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Daily Order Cutoff Time
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      The exact time orders close for kitchen batch preparation. Orders placed after
                      this time are blocked until the next service day.
                    </p>
                  </div>

                  <div className="w-full sm:w-60">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Cutoff Time (24h / EAT)
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold text-base focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none shadow-xs"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Current setting: {availability.cutoffTime} (6:00 PM standard)
                    </span>
                  </div>
                </div>
              </div>

              {/* Temporary Closure & Custom Notice */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Emergency Pause / Temporary Closure
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Override normal schedule and immediately block orders with a custom modal notice to customers.
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={availability.isTemporarilyClosed}
                      onChange={(e) =>
                        setAvailability((prev) => ({
                          ...prev,
                          isTemporarilyClosed: e.target.checked,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>

                {availability.isTemporarilyClosed && (
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <label className="block text-xs font-semibold text-slate-700">
                      Reason shown to customers in the App:
                    </label>

                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_PAUSE_REASONS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            setAvailability((prev) => ({
                              ...prev,
                              tempCloseReason: preset,
                            }))
                          }
                          className="text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-700 transition"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      placeholder="Enter the notice for customers..."
                      value={availability.tempCloseReason}
                      onChange={(e) =>
                        setAvailability((prev) => ({
                          ...prev,
                          tempCloseReason: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Save Schedule CTA */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveSchedule()}
                  disabled={savingSchedule}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-sm transition active:scale-95 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {savingSchedule ? "Saving Schedule..." : "Save Schedule Settings"}
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: KITCHEN ITEM AVAILABILITY (86ing)                        */}
          {/* ============================================================== */}
          {activeTab === "items" && (
            <div className="space-y-6">
              {/* Header Info & Quick Bulk Actions */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-600" />
                    Live 86'ing & Menu Stock Control
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Toggle items in real-time. Changes sync instantly across customer order screens
                    and WhatsApp / WebSockets.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetAllItemsStock(true)}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition"
                  >
                    Mark All Available
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllItemsStock(false)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
                  >
                    Mark All Sold Out
                  </button>
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ITEM_CONFIGS.map((item) => {
                  const isAvailable =
                    (availability.itemAvailability || {})[item.id] !== false;
                  const isLoading = togglingItem === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl border p-5 shadow-xs transition-all relative ${
                        isAvailable
                          ? "border-slate-200 hover:border-emerald-300"
                          : "border-rose-200 bg-rose-50/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl p-2 bg-slate-50 rounded-xl border border-slate-100">
                            {item.icon}
                          </span>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {item.category}
                            </span>
                            <h4 className="font-bold text-slate-900 text-base leading-tight">
                              {item.name}
                            </h4>
                          </div>
                        </div>

                        {/* Interactive iOS Switch */}
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleToggleItemAvailability(item.id)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isAvailable ? "bg-emerald-500" : "bg-slate-300"
                          } ${isLoading ? "opacity-50" : ""}`}
                          aria-label={`Toggle ${item.name}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              isAvailable ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <p className="text-xs text-slate-500 mb-4">{item.subtitle}</p>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md ${
                            isAvailable
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {isAvailable ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              In Stock & Orderable
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              86'd (Sold Out)
                            </>
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleItemAvailability(item.id)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-900 underline"
                        >
                          {isAvailable ? "Mark 86" : "Restock"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Help Banner */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Industry Tip for Kitchen Rush:</p>
                  <p className="text-amber-800 mt-0.5">
                    When you run out of an ingredient during prep, 86 the item immediately. Customers
                    currently on the app will immediately see the "Sold Out" badge without placing dead orders.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: DYNAMIC PRICING & PROFIT MARGINS                         */}
          {/* ============================================================== */}
          {activeTab === "pricing" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    Dynamic Pricing & Unit Margin Calculator
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Set retail selling prices and food costs. Gross profit in Birr and Margin % are calculated live.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSavePricing}
                  disabled={savingPrices}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm shadow-sm transition active:scale-95 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {savingPrices ? "Saving Prices..." : "Save All Prices"}
                </button>
              </div>

              {/* Categorized Pricing Sections */}
              {PRICING_GROUPS.map((group) => (
                <div
                  key={group.category}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
                >
                  <div className="border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{group.icon}</span>
                      <h4 className="font-bold text-slate-900 text-base">
                        {group.category}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {group.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.items.map((field) => {
                      const priceVal = Number(pricing[field.priceKey]) || 0;
                      const costVal = Number(pricing[field.costKey]) || 0;
                      const profit = priceVal - costVal;
                      const marginPct =
                        priceVal > 0 ? Math.round((profit / priceVal) * 100) : 0;

                      return (
                        <div
                          key={field.priceKey}
                          className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="font-bold text-slate-900 text-sm">
                                {field.title}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {field.note}
                              </div>
                            </div>

                            {/* Live Profit & Margin Badge */}
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                marginPct >= 25
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : marginPct > 0
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              Profit: +{profit} ETB ({marginPct}%)
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mt-3">
                            {/* Selling Price Input */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Customer Price (ETB)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={pricing[field.priceKey] ?? ""}
                                  onChange={(e) =>
                                    handlePriceChange(field.priceKey, e.target.value)
                                  }
                                  className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 bg-white font-semibold text-sm text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                                <span className="absolute right-2.5 top-2.5 text-xs font-semibold text-slate-400">
                                  ETB
                                </span>
                              </div>
                            </div>

                            {/* Cost Input */}
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Unit Food Cost (ETB)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={pricing[field.costKey] ?? ""}
                                  onChange={(e) =>
                                    handlePriceChange(field.costKey, e.target.value)
                                  }
                                  className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                                <span className="absolute right-2.5 top-2.5 text-xs font-semibold text-slate-400">
                                  ETB
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Bottom Sticky Save Bar for Pricing */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSavePricing}
                  disabled={savingPrices}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-sm transition active:scale-95 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {savingPrices ? "Saving All Prices..." : "Save All Menu Prices"}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
