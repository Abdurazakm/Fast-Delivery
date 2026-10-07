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
    accountName: "Abdurazak Mohammed",
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
        {/* <p className="text-sm leading-6 font-semibold text-rose-800">
          Payment is required now. Your order will not be confirmed or prepared
          until payment is completed.
        </p> */}

        {Number.isFinite(Number(amount)) && (
          <div className="rounded-2xl border-2 border-rose-200 bg-rose-100/80 p-4 text-rose-950 shadow-xs">
            <p className="text-xs font-black uppercase tracking-wider text-rose-800">
              Amount To Pay
            </p>
            <p className="mt-1 text-2xl font-black text-rose-950">
              {Number(amount).toFixed(2)} Birr
            </p>
          </div>
        )}

        {trackingCode && (
          <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/80 p-4 text-sky-950 shadow-xs">
            <p className="text-xs font-black uppercase tracking-wider text-sky-800">
              Tracking Code
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="font-mono text-base font-black tracking-wide text-sky-950">
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
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-sky-300 bg-white px-3.5 py-2 min-h-[40px] text-xs font-bold text-sky-900 hover:bg-sky-100 transition active:scale-95 cursor-pointer"
              >
                <FiCopy />
                <span>Copy code</span>
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {PAYMENT_METHODS.map((method) => (
            <div
              key={method.key}
              className="rounded-2xl border-2 border-gray-200 bg-white p-3.5 shadow-xs"
            >
              <div className="mb-1 text-xs font-black uppercase tracking-wider text-gray-800">
                {method.label}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-base font-black tracking-wide text-gray-950">
                    {method.accountNumber}
                  </p>
                  <p className="text-xs font-bold text-gray-700">{method.accountName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(method)}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-gray-200 bg-gray-50 px-3.5 py-2 min-h-[40px] text-xs font-extrabold text-gray-800 hover:bg-amber-50 hover:border-amber-300 active:scale-95 transition cursor-pointer"
                >
                  {copiedKey === method.key ? (
                    <>
                      <FiCheck className="text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <FiCopy />
                      <span>Copy</span>
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
            //message pre-filled with tracking code for convenience
            href={`https://t.me/ABDURAZACQ?text=Payment%20completed%20for%20tracking%20code%20${trackingCode}.%20Here%20is%20the%20screenshot%20of%20my%20payment.`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 font-semibold underline"
            //message pre-filled with tracking code for convenience
            // href={`https://t.me/ABDURAZACQ?text=Payment%20completed%20for%20tracking%20code%20${trackingCode}.%20Here%20is%20the%20screenshot%20of%20my%20payment.`}

            
          >
            @ABDURAZACQ
          </a>
        </div>
      </div>
    </div>
  );
}
