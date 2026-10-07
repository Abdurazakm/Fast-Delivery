import { useState, useEffect, useRef, useMemo } from "react";
import {
  Bell,
  CheckCheck,
  Check,
  Trash2,
  ExternalLink,
  X,
  Inbox,
  Clock,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

import {
  NOTIFICATIONS_UPDATED_EVENT,
  getStoredNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
} from "../notificationStore";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState(() => getStoredNotifications());
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "unread" | "read"
  const dropdownRef = useRef(null);

  // Sync notifications with central store across all pages, tabs, and timer ticks
  useEffect(() => {
    const sync = () => {
      setNotifications(getStoredNotifications());
    };
    sync();

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);

    // Periodic check every 60s to automatically prune notifications passing the 24-hour mark
    const timer = setInterval(() => {
      sync();
    }, 60000);

    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
      clearInterval(timer);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  // Divided lists: Unread & Read
  const unreadList = useMemo(
    () => notifications.filter((n) => !n.read),
    [notifications]
  );
  const readList = useMemo(
    () => notifications.filter((n) => n.read),
    [notifications]
  );
  const unreadCount = unreadList.length;
  const readCount = readList.length;

  const displayedList = useMemo(() => {
    if (activeTab === "unread") return unreadList;
    if (activeTab === "read") return readList;
    return notifications;
  }, [activeTab, unreadList, readList, notifications]);

  const handleMarkAllRead = () => {
    const updated = markAllNotificationsAsRead();
    setNotifications(updated);
  };

  const handleClearAll = () => {
    const updated = clearAllNotifications();
    setNotifications(updated);
  };

  const handleMarkAsRead = (id, e) => {
    if (e) e.stopPropagation();
    const updated = markNotificationAsRead(id);
    setNotifications(updated);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 bg-white/90 hover:bg-white text-gray-700 hover:text-amber-600 rounded-full shadow-md transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-300 cursor-pointer"
        title="Notifications"
        aria-label="Open notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 bg-linear-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <h4 className="font-bold text-sm">Notifications</h4>
              {unreadCount > 0 && (
                <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-white/90 hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Read all
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-white/80 hover:text-white flex items-center gap-1 hover:underline ml-1 cursor-pointer"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-full cursor-pointer sm:hidden ml-1"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Segmented Tab Bar: All / Unread / Read */}
          <div className="flex items-center border-b border-gray-100 bg-gray-50/70 p-1.5 gap-1 text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "all"
                  ? "bg-white text-amber-700 shadow-xs font-semibold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60"
              }`}
            >
              <span>All</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "all"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-gray-200/80 text-gray-600"
                }`}
              >
                {notifications.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("unread")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "unread"
                  ? "bg-white text-amber-700 shadow-xs font-semibold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60"
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "unread"
                    ? "bg-red-100 text-red-700 font-bold"
                    : "bg-gray-200/80 text-gray-600"
                }`}
              >
                {unreadCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("read")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "read"
                  ? "bg-white text-amber-700 shadow-xs font-semibold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60"
              }`}
            >
              <span>Read</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "read"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-gray-200/80 text-gray-600"
                }`}
              >
                {readCount}
              </span>
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {displayedList.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                {activeTab === "unread" ? (
                  <>
                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-amber-500 opacity-80" />
                    <p className="font-semibold text-gray-700 text-sm">
                      You're all caught up!
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      No unread notifications right now.
                    </p>
                  </>
                ) : activeTab === "read" ? (
                  <>
                    <Inbox className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-gray-700 text-sm">
                      No read notifications
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Notifications you view will be archived here.
                    </p>
                  </>
                ) : (
                  <>
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-gray-700 text-sm">
                      No notifications yet
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Order updates and announcements from the last 24 hours appear here.
                    </p>
                  </>
                )}
              </div>
            ) : (
              displayedList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleMarkAsRead(item.id)}
                  className={`p-3.5 transition-colors cursor-pointer group ${
                    !item.read
                      ? "bg-amber-50/50 hover:bg-amber-50/80 border-l-3 border-amber-500"
                      : "bg-white hover:bg-gray-50/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                        )}
                        <h5
                          className={`text-xs line-clamp-1 ${
                            !item.read
                              ? "font-bold text-gray-900"
                              : "font-medium text-gray-700"
                          }`}
                        >
                          {item.title}
                        </h5>
                        {!item.read && (
                          <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-200/70 text-amber-900 px-1.5 py-0.2 rounded-sm ml-auto sm:ml-1 shrink-0">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-snug break-words">
                        {item.message}
                      </p>
                      <div className="flex items-center gap-2 pt-0.5 text-[10px] text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{dayjs(item.timestamp).fromNow()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 self-center">
                      {!item.read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors cursor-pointer"
                          title="Mark as read"
                          aria-label="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {item.url && item.url !== "/" && (
                        <Link
                          to={item.url}
                          onClick={() => {
                            handleMarkAsRead(item.id);
                            setOpen(false);
                          }}
                          className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-100/60 rounded-md transition-colors shrink-0"
                          title="View order"
                          aria-label="View order"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer - 24-Hour Expiration Info */}
          <div className="p-2.5 bg-gray-50 border-t border-gray-100 text-center">
            <span className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              Notifications automatically clear after 24 hours
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
