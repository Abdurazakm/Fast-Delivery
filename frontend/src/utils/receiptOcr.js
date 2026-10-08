import { createWorker } from "tesseract.js";

/**
 * Parses raw text extracted from Ethiopian banking & Telebirr receipts
 */
export function parseReceiptText(rawText = "") {
  if (!rawText || typeof rawText !== "string") {
    return {
      provider: "unknown",
      reference: "",
      amount: null,
      date: "",
      isOldDate: false,
      dateWarning: null,
      rawText: "",
    };
  }

  const text = rawText.replace(/\r\n/g, " ").replace(/\n/g, " ");

  // 1. Detect Provider
  let provider = "unknown";
  if (/telebirr/i.test(text)) {
    provider = "telebirr";
  } else if (/commercial\s*bank\s*of\s*ethiopia|cbe\s*birr|cbebirr|\bcbe\b/i.test(text)) {
    provider = "cbe";
  }

  // 2. Extract Transaction Reference
  let reference = "";
  const telebirrRefMatch = text.match(/\b(T\d{6}\.\d{4}\.[A-Za-z0-9]+)\b/i) ||
    text.match(/(?:transaction\s*(?:no|number|id)|txn\s*id)[\s:]*([A-Za-z0-9.]+)/i);

  const cbeRefMatch = text.match(/(?:voucher\s*(?:no|number)|transaction\s*id|txn\s*ref|ref(?:erence)?\s*(?:no)?)[\s:]*([A-Za-z0-9]+)/i) ||
    text.match(/\b(FT[0-9]{8,12})\b/i);

  if (telebirrRefMatch) {
    reference = telebirrRefMatch[1] || telebirrRefMatch[0];
  } else if (cbeRefMatch) {
    reference = cbeRefMatch[1] || cbeRefMatch[0];
  }

  // 3. Extract Amount
  let amount = null;
  const amountMatch = text.match(
    /(?:transferred\s*amount|amount|total|paid\s*amount)[\s:]*(?:etb|br)?[\s:]*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i
  ) || text.match(/(?:etb|br)[\s:]*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i);

  if (amountMatch) {
    const cleaned = amountMatch[1].replace(/,/g, "");
    const parsedNum = parseFloat(cleaned);
    if (!isNaN(parsedNum) && parsedNum > 0) {
      amount = parsedNum;
    }
  }

  // 4. Extract Date
  let date = "";
  let isOldDate = false;
  let dateWarning = null;

  const dateMatch = text.match(
    /(?:payment\s*date|value\s*date|transaction\s*date|date(?:\s*&\s*time)?)[\s:]*(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/][A-Za-z]{3}[-/]\d{4}|\d{2}[-/]\d{2}[-/]\d{4})/i
  ) || text.match(/\b(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-[A-Za-z]{3}-\d{4})\b/);

  if (dateMatch) {
    date = dateMatch[1];
  }

  // 5. Telebirr ID embedded date decode (e.g. T261008 -> 2026-10-08)
  const todayEAT = new Date().toLocaleDateString("en-CA", {
    timeZone: "Africa/Addis_Ababa",
  }); // YYYY-MM-DD in Ethiopian time

  if (reference && /^T\d{6}/i.test(reference)) {
    const teleMatch = reference.match(/^T(\d{2})(\d{2})(\d{2})/i);
    if (teleMatch) {
      const year = `20${teleMatch[1]}`;
      const month = teleMatch[2];
      const day = teleMatch[3];
      const decodedDate = `${year}-${month}-${day}`;
      if (!date) date = decodedDate;

      if (decodedDate !== todayEAT) {
        isOldDate = true;
        dateWarning = `Transaction ID date (${decodedDate}) is from a previous day (Today is ${todayEAT}).`;
      }
    }
  }

  return {
    provider,
    reference: reference ? reference.trim() : "",
    amount,
    date,
    isOldDate,
    dateWarning,
    rawText: text.slice(0, 1000),
  };
}

/**
 * Performs client-side OCR on an image file using Tesseract.js
 * Calls onProgress(pct) with 0-100 values
 */
export async function scanReceiptImage(imageFile, onProgress = () => {}) {
  let worker = null;
  try {
    worker = await createWorker("eng");
    
    // Listen for progress events
    const ret = await worker.recognize(imageFile);
    await worker.terminate();
    worker = null;

    const rawText = ret?.data?.text || "";
    const parsed = parseReceiptText(rawText);
    return {
      success: true,
      ...parsed,
    };
  } catch (err) {
    console.warn("OCR recognition error:", err);
    if (worker) {
      try { await worker.terminate(); } catch {}
    }
    return {
      success: false,
      error: err.message,
      provider: "unknown",
      reference: "",
      amount: null,
      date: "",
      isOldDate: false,
      dateWarning: null,
      rawText: "",
    };
  }
}
