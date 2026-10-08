import { useLocation, Link, useNavigate } from "react-router-dom";
import { Home, Utensils, ShoppingBag, Bike, User, LogIn } from "lucide-react";

export default function MobileBottomNav({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const lastTracking = localStorage.getItem("last_order_tracking");
  const isTrackPage = pathname.startsWith("/track/");
  const isAuthenticated = Boolean(user) || Boolean(localStorage.getItem("token"));

  const handleTrackClick = (e) => {
    e.preventDefault();
    if (lastTracking) {
      navigate(`/track/${lastTracking}`);
    } else {
      navigate("/");
      setTimeout(() => {
        const trackSection = document.getElementById("track-section");
        if (trackSection) {
          trackSection.scrollIntoView({ behavior: "smooth", block: "center" });
          const input = trackSection.querySelector("input");
          if (input) input.focus();
        }
      }, 100);
    }
  };

  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      path: "/",
      isActive: pathname === "/",
    },
    {
      id: "menu",
      label: "Menu",
      icon: Utensils,
      path: "/menu",
      isActive: pathname === "/menu",
    },
    {
      id: "order",
      label: "Order",
      icon: ShoppingBag,
      path: "/order",
      isActive: pathname === "/order",
      highlight: true,
    },
    {
      id: "track",
      label: "Track",
      icon: Bike,
      onClick: handleTrackClick,
      isActive: isTrackPage,
    },
    isAuthenticated
      ? {
          id: "profile",
          label: "Profile",
          icon: User,
          path: "/profile",
          isActive: pathname === "/profile",
        }
      : {
          id: "login",
          label: "Login",
          icon: LogIn,
          path: "/login",
          isActive: pathname === "/login" || pathname === "/register",
        },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-gray-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 sm:hidden transition-all duration-300"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isCurrent = item.isActive;

          if (item.highlight) {
            return (
              <Link
                key={item.id}
                to={item.path}
                className="relative -top-2 flex flex-col items-center group active:scale-90 transition-transform"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${
                    isCurrent
                      ? "bg-amber-600 text-white shadow-amber-300/80"
                      : "bg-amber-500 text-white shadow-amber-200/80 hover:bg-amber-600"
                  }`}
                >
                  <Icon className="w-6 h-6 shrink-0" />
                </div>
                <span className="text-[10px] font-black text-amber-900 mt-0.5 tracking-tight">
                  {item.label}
                </span>
              </Link>
            );
          }

          if (item.onClick) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all active:scale-95 cursor-pointer min-w-[50px] ${
                  isCurrent ? "text-amber-600" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isCurrent ? "scale-110 stroke-[2.5]" : "stroke-[1.75]"
                  }`}
                />
                <span
                  className={`text-[10px] mt-0.5 tracking-tight ${
                    isCurrent ? "font-black text-amber-600" : "font-semibold text-gray-500"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all active:scale-95 min-w-[50px] ${
                isCurrent ? "text-amber-600" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isCurrent ? "scale-110 stroke-[2.5]" : "stroke-[1.75]"
                }`}
              />
              <span
                className={`text-[10px] mt-0.5 tracking-tight ${
                  isCurrent ? "font-black text-amber-600" : "font-semibold text-gray-500"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
