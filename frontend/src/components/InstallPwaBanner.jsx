import { useState, useEffect } from "react";
import { Download, X, Share2, PlusSquare } from "lucide-react";

const DISMISS_KEY = "pwa_install_dismissed_until";
const DISMISS_DAYS = 7;

export default function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) return;

    // Check if dismissed recently
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isSafari =
      ua.includes("safari") && !ua.includes("chrome") && !ua.includes("crios");

    if (isIosDevice && isSafari) {
      setIsIos(true);
      setShowPrompt(true);
      return;
    }

    // Android / Desktop / Chrome / Edge install prompt listener
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    const expireTime = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(expireTime));
    setShowPrompt(false);
    setShowIosGuide(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white/95 backdrop-blur-md border border-amber-200/80 rounded-2xl p-4 shadow-xl text-gray-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-md overflow-hidden shrink-0">
              <img
                src="/favicon.png"
                alt="Fetan Delivery"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                Install Fetan App
              </h4>
              <p className="text-xs text-gray-500 leading-snug">
                {isIos
                  ? "Add to your iPhone Home Screen for instant ordering & alerts."
                  : "Install for full-screen ordering and live delivery alerts."}
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* iOS Step-by-Step Guide */}
        {showIosGuide && (
          <div className="mt-3 pt-3 border-t border-amber-100 text-xs text-gray-600 space-y-1.5 bg-amber-50/80 p-2.5 rounded-xl">
            <p className="font-semibold text-amber-800 flex items-center gap-1">
              📱 How to install on iOS:
            </p>
            <p className="flex items-center gap-1.5">
              1. Tap the <Share2 className="w-3.5 h-3.5 text-amber-600 inline" />{" "}
              <b>Share</b> button in Safari toolbar.
            </p>
            <p className="flex items-center gap-1.5">
              2. Scroll down and tap{" "}
              <PlusSquare className="w-3.5 h-3.5 text-amber-600 inline" />{" "}
              <b>Add to Home Screen</b>.
            </p>
          </div>
        )}

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg transition"
          >
            Not now
          </button>
          <button
            onClick={handleInstallClick}
            className="bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {isIos ? (showIosGuide ? "Got it" : "How to Install") : "Install App"}
          </button>
        </div>
      </div>
    </div>
  );
}
