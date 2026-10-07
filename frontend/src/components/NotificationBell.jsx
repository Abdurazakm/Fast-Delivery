import { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, Trash2, ExternalLink, X } from "lucide-react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

import {
  STORAGE_KEY,
  NOTIFICATIONS_UPDATED_EVENT,
  getStoredNotifications,
} from "../notificationStore";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState(() => getStoredNotifications());
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Sync notifications with central store across all pages and tabs
  useEffect(() => {
    const sync = () => {
      setNotifications(getStoredNotifications());
    };
    sync();

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Save to localStorage when notifications change
  const saveNotifications = (newList) => {
    setNotifications(newList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    window.dispatchEvent(
      new CustomEvent(NOTIFICATIONS_UPDATED_EVENT, { detail: newList })
    );
  };

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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    saveNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    saveNotifications([]);
  };

  const markAsRead = (id) => {
    saveNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 bg-white/90 hover:bg-white text-gray-700 hover:text-amber-600 rounded-full shadow-md transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-300"
        title="Notifications"
        aria-label="Open notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow animate-pulse">
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
                  onClick={markAllRead}
                  className="text-xs text-white/90 hover:text-white flex items-center gap-1 hover:underline cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Read all
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
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

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No notifications yet</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  You will receive order updates and announcements here!
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markAsRead(item.id)}
                  className={`p-3.5 transition-colors hover:bg-amber-50/50 ${
                    item.read ? "bg-white" : "bg-amber-50/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        )}
                        <h5 className="font-bold text-xs text-gray-800 line-clamp-1">
                          {item.title}
                        </h5>
                      </div>
                      <p className="text-xs text-gray-600 leading-snug break-words">
                        {item.message}
                      </p>
                      <span className="text-[10px] text-gray-400 block pt-1">
                        {dayjs(item.timestamp).fromNow()}
                      </span>
                    </div>

                    {item.url && item.url !== "/" && (
                      <Link
                        to={item.url}
                        onClick={() => {
                          markAsRead(item.id);
                          setOpen(false);
                        }}
                        className="text-amber-600 hover:text-amber-700 p-1 rounded-md shrink-0 self-center"
                        title="View order"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
