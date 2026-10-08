import { useState, useRef } from "react";
import { FiCheck, FiCopy } from "react-icons/fi";
import {
  Banknote,
  Coins,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  RefreshCw,
  FileText,
  X,
  ExternalLink,
} from "lucide-react";
import API, { BACKEND_URL } from "../api";
import { scanReceiptImage } from "../utils/receiptOcr";

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
  order,
  amount,
  trackingCode: propTrackingCode,
  trackingLink,
  onCopy,
  onOrderUpdated,
}) {
  const currentTrackingCode = order?.trackingCode || propTrackingCode;
  const currentTotal = Number(order?.total ?? amount ?? 0);
  const paymentStatus = order?.paymentStatus || "unpaid";
  const paymentMethod = order?.paymentMethod || "online";
  const isCod = paymentMethod === "cod";

  const [copiedKey, setCopiedKey] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showReuploadForm, setShowReuploadForm] = useState(false);
  const [fullImageModal, setFullImageModal] = useState(null);

  // Form fields parsed from OCR or manually entered
  const [refInput, setRefInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [ocrWarning, setOcrWarning] = useState(null);
  const [ocrRawText, setOcrRawText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fileInputRef = useRef(null);

  const handleCopy = async (method) => {
    try {
      await navigator.clipboard.writeText(method.accountNumber);
      setCopiedKey(method.key);
      if (onCopy) {
        onCopy(`${method.label} account number copied`);
      }
      setTimeout(() => setCopiedKey(""), 1200);
    } catch {
      if (onCopy) {
        onCopy("Could not copy account number. Please copy it manually.");
      }
    }
  };

  const copyText = async (value, successMsg) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      if (onCopy) onCopy(successMsg);
    } catch {
      if (onCopy) onCopy("Failed to copy text.");
    }
  };

  // Image selection & client-side OCR scan
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage("");
    setSuccessMessage("");
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    // Reset detected fields
    setRefInput("");
    setAmountInput("");
    setOcrWarning(null);
    setOcrRawText("");

    // Start OCR scanning
    setIsScanning(true);
    try {
      const ocrResult = await scanReceiptImage(file);
      if (ocrResult.success) {
        if (ocrResult.reference) {
          setRefInput(ocrResult.reference);
        }
        if (ocrResult.amount) {
          setAmountInput(String(ocrResult.amount));
        }
        if (ocrResult.dateWarning) {
          setOcrWarning(ocrResult.dateWarning);
        } else if (ocrResult.isOldDate) {
          setOcrWarning("Receipt date appears to be from a previous day.");
        }
        setOcrRawText(ocrResult.rawText || "");
      }
    } catch (err) {
      console.warn("OCR recognition error:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleClearSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setRefInput("");
    setAmountInput("");
    setOcrWarning(null);
    setOcrRawText("");
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit proof to backend
  const handleSubmitProof = async (e) => {
    e.preventDefault();
    if (!selectedFile && !refInput.trim()) {
      setErrorMessage("Please select a receipt screenshot or enter a transaction reference.");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append("receiptImage", selectedFile);
      }
      if (refInput.trim()) {
        formData.append("transactionRef", refInput.trim());
      }
      if (amountInput && !isNaN(Number(amountInput))) {
        formData.append("amountPaid", Number(amountInput));
      }
      if (ocrRawText) {
        formData.append("ocrRawText", ocrRawText);
      }

      const res = await API.post(
        `/orders/track/${encodeURIComponent(currentTrackingCode)}/payment-proof`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setSuccessMessage("Receipt submitted! Verification is in progress.");
      setShowReuploadForm(false);
      handleClearSelectedFile();

      if (onOrderUpdated && res.data?.order) {
        onOrderUpdated(res.data.order);
      }
    } catch (err) {
      console.error("Failed to upload payment proof:", err);
      setErrorMessage(
        err.response?.data?.message ||
          "Failed to upload receipt. Please check your connection or contact support."
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Helper to build full receipt image URL
  const getProofImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${BACKEND_URL}${path}`;
  };

  // --- COD VIEW ---
  if (isCod) {
    const changeRequested = order?.changeRequested || "exact";
    const changeLabel =
      changeRequested === "exact"
        ? "Exact Cash (No change needed)"
        : `Change requested for ${changeRequested} ETB`;

    return (
      <div className="mt-4 overflow-hidden rounded-2xl border-2 border-emerald-300 bg-linear-to-br from-emerald-50 via-white to-teal-50 shadow-md">
        <div className="bg-emerald-600 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5" />
            <p className="text-xs font-black uppercase tracking-wider">
              Cash on Delivery (COD)
            </p>
          </div>
          <span className="text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
            Pay at Dorm
          </span>
        </div>

        <div className="p-4 space-y-3.5 text-gray-800">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-100/60 p-3.5 text-emerald-950">
            <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
              Cash Amount to Hand Over
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-950">
              {currentTotal.toFixed(2)} Birr
            </p>
            <p className="mt-1 text-xs text-emerald-800 font-semibold">
              Location: {order?.location || "Your specified dorm"}
            </p>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-gray-200 text-xs sm:text-sm font-bold text-gray-800">
            <Coins className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{changeLabel}</span>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-white/80 p-3 text-xs leading-relaxed text-gray-700">
            💡 Our delivery runner will bring your Ertib directly to your door and collect cash on hand. If you need anything changed, call the runner when they are en route!
          </div>
        </div>
      </div>
    );
  }

  // --- ONLINE PAYMENT VIEW (Telebirr / CBE) ---
  const numericAmountInput = Number(amountInput);
  const hasDiscrepancy =
    !isNaN(numericAmountInput) &&
    numericAmountInput > 0 &&
    numericAmountInput < currentTotal;
  const shortfall = hasDiscrepancy ? (currentTotal - numericAmountInput).toFixed(2) : 0;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50/50 via-white to-orange-50/30 shadow-md">
      {/* Header Banner */}
      <div
        className={`px-4 py-3 text-white ${
          paymentStatus === "paid"
            ? "bg-emerald-600"
            : paymentStatus === "verifying"
              ? "bg-blue-600"
              : paymentStatus === "partially_paid"
                ? "bg-orange-600"
                : "bg-amber-600"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-wider">
            {paymentStatus === "paid"
              ? "Payment Verified"
              : paymentStatus === "verifying"
                ? "Proof Under Review"
                : paymentStatus === "partially_paid"
                  ? "Partial Payment Received"
                  : "Payment Required"}
          </p>
          <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
            {paymentStatus === "paid"
              ? "✓ Confirmed"
              : paymentStatus === "verifying"
                ? "Checking"
                : paymentStatus === "partially_paid"
                  ? "Shortfall"
                  : "Unpaid"}
          </span>
        </div>
        <p className="mt-1 text-sm font-semibold leading-snug">
          {paymentStatus === "paid"
            ? "Your payment was approved! Your meal is being prepared."
            : paymentStatus === "verifying"
              ? "Your receipt was received. We are verifying your transaction."
              : paymentStatus === "partially_paid"
                ? `Partial payment received (${order?.amountPaid} Birr). Remaining balance: ${(currentTotal - (order?.amountPaid || 0)).toFixed(2)} Birr.`
                : "Please transfer the total amount and upload your screenshot below."}
        </p>
      </div>

      <div className="space-y-4 p-4 text-slate-800">
        {/* Amount to Pay Card */}
        {Number.isFinite(currentTotal) && currentTotal > 0 && (
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-4 text-amber-950 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-800">
                Amount To Pay
              </p>
              <p className="mt-1 text-2xl font-black text-amber-950">
                {currentTotal.toFixed(2)} Birr
              </p>
            </div>
            {currentTrackingCode && (
              <div className="text-right">
                <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                  Tracking Code
                </p>
                <div className="flex items-center gap-1 mt-1 justify-end">
                  <span className="font-mono text-xs sm:text-sm font-black text-gray-900">
                    {currentTrackingCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(currentTrackingCode, "Tracking code copied")}
                    className="p-1 rounded-md text-gray-500 hover:text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                    title="Copy tracking code"
                  >
                    <FiCopy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Existing Proof Status Card (if verifying or partially_paid) */}
        {(paymentStatus === "verifying" || paymentStatus === "partially_paid") &&
          !showReuploadForm && (
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-blue-950 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Submitted Payment Receipt
                </span>
                <span className="text-xs font-bold text-blue-700 uppercase bg-blue-100 px-2 py-0.5 rounded-md">
                  {paymentStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {order?.transactionRef && (
                  <div className="p-2.5 rounded-xl bg-white border border-blue-100">
                    <span className="text-gray-500 block font-semibold text-[11px]">
                      Reference / Txn ID
                    </span>
                    <span className="font-mono font-bold text-gray-900 break-all">
                      {order.transactionRef}
                    </span>
                  </div>
                )}
                {order?.amountPaid !== undefined && (
                  <div className="p-2.5 rounded-xl bg-white border border-blue-100">
                    <span className="text-gray-500 block font-semibold text-[11px]">
                      Reported Amount
                    </span>
                    <span className="font-black text-gray-900">
                      {order.amountPaid} Birr
                    </span>
                  </div>
                )}
              </div>

              {order?.paymentProofUrl && (
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setFullImageModal(getProofImageUrl(order.paymentProofUrl))}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-white border border-blue-200 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Submitted Receipt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowReuploadForm(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Re-upload New Receipt</span>
                  </button>
                </div>
              )}
            </div>
          )}

        {/* Bank Account Numbers (if unpaid or user wants to review) */}
        {(paymentStatus === "unpaid" || showReuploadForm) && (
          <div className="space-y-2.5">
            <p className="text-xs font-black uppercase tracking-wider text-gray-700">
              1. Transfer to any of our accounts:
            </p>
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
        )}

        {/* IN-APP RECEIPT UPLOAD & OCR VERIFICATION SECTION */}
        {(paymentStatus === "unpaid" || showReuploadForm) && (
          <div className="pt-2 border-t border-gray-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wider text-gray-700">
                2. Upload Screenshot (Instant OCR Scan)
              </p>
              {showReuploadForm && (
                <button
                  type="button"
                  onClick={() => setShowReuploadForm(false)}
                  className="text-xs font-bold text-gray-500 hover:text-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSubmitProof} className="space-y-3">
              {/* Image Picker Dropzone */}
              {!selectedFile ? (
                <label className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50/70 transition rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer text-center group">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs sm:text-sm font-black text-gray-900">
                    Tap to Choose Screenshot
                  </span>
                  <span className="text-[11px] text-gray-600 font-medium mt-0.5">
                    Telebirr, CBE, or CBEBirr receipt (JPG, PNG)
                  </span>
                </label>
              ) : (
                <div className="rounded-2xl border-2 border-gray-200 bg-white p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 relative bg-gray-100 shrink-0">
                        <img
                          src={previewUrl}
                          alt="Receipt Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-gray-900 truncate max-w-[180px]">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {(selectedFile.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFullImageModal(previewUrl)}
                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 transition cursor-pointer"
                        title="Zoom Image"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleClearSelectedFile}
                        className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Scanning Animation / Indicator */}
                  {isScanning && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-xs font-bold text-amber-900 animate-pulse">
                      <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                      <span>Reading Reference ID & Amount with OCR...</span>
                    </div>
                  )}

                  {/* OCR Parsed / Editable Fields */}
                  {!isScanning && (
                    <div className="space-y-2.5 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Transaction Reference input */}
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 mb-1">
                            Transaction Reference / ID
                          </label>
                          <input
                            type="text"
                            value={refInput}
                            onChange={(e) => setRefInput(e.target.value)}
                            placeholder="e.g. T261008... or FT..."
                            className="w-full px-3 py-2 text-xs font-mono font-bold border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        {/* Amount Input */}
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 mb-1">
                            Amount Paid (Birr)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={amountInput}
                            onChange={(e) => setAmountInput(e.target.value)}
                            placeholder={String(currentTotal)}
                            className="w-full px-3 py-2 text-xs font-black border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Date Warning Banner */}
                      {ocrWarning && (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-800">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <span>{ocrWarning}</span>
                        </div>
                      )}

                      {/* Discrepancy Warning Banner (underpayment detection) */}
                      {hasDiscrepancy && (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-2 text-xs text-amber-900 font-semibold">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>Underpayment Warning:</strong> Receipt amount (
                            {numericAmountInput} Birr) is less than order total (
                            {currentTotal} Birr). Shortfall: <strong>{shortfall} Birr</strong>.
                          </div>
                        </div>
                      )}

                      {!hasDiscrepancy &&
                        numericAmountInput >= currentTotal &&
                        currentTotal > 0 && (
                          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Amount matches order total ({numericAmountInput} Birr).</span>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}

              {/* Error & Success Feedback */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                  {successMessage}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isUploading || isScanning || (!selectedFile && !refInput.trim())}
                className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs sm:text-sm shadow-md shadow-amber-200/60 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Receipt Proof...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Submit Payment Proof</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Telegram fallback link */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-xs leading-relaxed text-gray-600 flex items-center justify-between">
          <span>Need help or having issues uploading?</span>
          <a
            href={`https://t.me/ABDURAZACQ?text=Payment%20help%20for%20order%20${currentTrackingCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-amber-700 underline flex items-center gap-1 shrink-0 ml-2"
          >
            Telegram @ABDURAZACQ
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Full-size Image Lightbox Modal */}
      {fullImageModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setFullImageModal(null)}
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setFullImageModal(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={fullImageModal}
              alt="Receipt Preview"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
