import { useState } from "react";
import { FiCheck, FiCopy } from "react-icons/fi";

const PAYMENT_METHODS = [
  {
    key: "cbe",
    label: "CBE",
    accountNumber: "1000528463243",
    accountName: "Abdurazak Mohammed",
  },
  {
    key: "telebirr",
    label: "Telebirr",
    accountNumber: "0954724664",
    accountName: "Nur Muhhammed",
  },
  {
    key: "cbebirr",
    label: "CBEBirr",
    accountNumber: "0954724664",
    accountName: "Abdurazak Mohammed",
  },
];

export default function PaymentInstructionsCard({
  amount,
  trackingCode,
  trackingLink,
  onCopy,
}) {
  const [copiedKey, setCopiedKey] = useState("");

  const handleCopy = async (method) => {
    try {
      await navigator.clipboard.writeText(method.accountNumber);
      setCopiedKey(method.key);
      if (onCopy) {
        onCopy(`${method.label} account number copied`);
      }
      setTimeout(() => setCopiedKey(""), 1200);
    } catch (err) {
      if (onCopy) {
        onCopy("Could not copy account number. Please copy it manually.");
      }
    }
  };

  const copyText = async (value, successMessage, fallbackMessage) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      if (onCopy) {
        onCopy(successMessage);
      }
    } catch (err) {
      if (onCopy) {
        onCopy(fallbackMessage);
      }
    }
  };

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50 shadow-md">
      <div className="bg-rose-600 px-4 py-3 text-white">
        <p className="text-xs font-bold uppercase tracking-wide">
          Payment Required
        </p>
        <p className="mt-1 text-sm font-semibold leading-5">
          Your order is not confirmed until payment is received.
        </p>
      </div>

      <div className="space-y-4 p-4 text-slate-800">
        <p className="text-sm leading-6 font-semibold text-rose-800">
          Payment is required now. Your order will not be confirmed or prepared
          until payment is completed.
        </p>

        {Number.isFinite(Number(amount)) && (
          <div className="rounded-xl border border-rose-200 bg-rose-100 p-3 text-rose-900">
            <p className="text-xs font-semibold uppercase tracking-wide">
              Amount To Pay
            </p>
            <p className="mt-1 text-xl font-extrabold">
              {Number(amount).toFixed(2)} Birr
            </p>
          </div>
        )}

        {trackingCode && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-900">
            <p className="text-xs font-semibold uppercase tracking-wide">
              Tracking Code
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="font-mono text-base font-bold tracking-wide">
                {trackingCode}
              </p>
              <button
                type="button"
                onClick={() =>
                  copyText(
                    trackingCode,
                    "Tracking code copied",
                    "Could not copy tracking code. Please copy it manually.",
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100"
              >
                <FiCopy />
                Copy code
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {PAYMENT_METHODS.map((method) => (
            <div
              key={method.key}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {method.label}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-base font-bold tracking-wide text-slate-900">
                    {method.accountNumber}
                  </p>
                  <p className="text-xs text-slate-600">{method.accountName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(method)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {copiedKey === method.key ? (
                    <>
                      <FiCheck />
                      Copied
                    </>
                  ) : (
                    <>
                      <FiCopy />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          After payment, send your payment screenshot and your tracking code via
          Telegram:
          <a
            href="https://t.me/ABDURAZACQ"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 font-semibold underline"
          >
            @ABDURAZACQ
          </a>
        </div>
      </div>
    </div>
  );
}
