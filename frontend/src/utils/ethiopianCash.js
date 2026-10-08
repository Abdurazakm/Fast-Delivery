/**
 * ethiopianCash.js
 * Helpers for Ethiopian Birr banknote combinations and Cash On Delivery (COD) change calculations.
 * Standard Ethiopian Birr banknotes in common circulation: 200, 100, 50, 10, 5 ETB notes / coins.
 */

export const ETHIOPIAN_NOTES = [200, 100, 50, 10, 5];

/**
 * Breakdown an amount into Ethiopian banknote combinations (greedy decomposition).
 * Example:
 *   50  -> "1 × 50 note"
 *   150 -> "1 × 100 + 1 × 50 notes"
 *   200 -> "1 × 200 note"
 *   300 -> "1 × 200 + 1 × 100 notes"
 *   400 -> "2 × 200 notes"
 *   250 -> "1 × 200 + 1 × 50 notes"
 *   40  -> "4 × 10 notes"
 */
export function getEthiopianNoteBreakdown(amount) {
  const roundAmt = Math.round(Number(amount) || 0);
  if (roundAmt <= 0) return "0 Birr";

  const parts = [];
  let rem = roundAmt;

  for (const note of ETHIOPIAN_NOTES) {
    if (rem >= note) {
      const count = Math.floor(rem / note);
      rem %= note;
      parts.push(count === 1 ? `1 × ${note}` : `${count} × ${note}`);
    }
  }

  if (rem > 0) {
    parts.push(`${rem} coin`);
  }

  const label = parts.length === 1 && parts[0].startsWith("1 ×") ? "note" : "notes";
  return `${parts.join(" + ")} ${label}`;
}

/**
 * Returns a human-friendly note label for the customer's cash note.
 * e.g. 200 -> "1 × 200 note"
 * e.g. 100 -> "1 × 100 note"
 * e.g. 300 -> "1 × 200 + 1 × 100 notes"
 * e.g. 400 -> "2 × 200 notes"
 */
export function getCustomerNoteLabel(amount) {
  const roundAmt = Math.round(Number(amount) || 0);
  if (roundAmt === 200) return "1 × 200 note";
  if (roundAmt === 100) return "1 × 100 note";
  if (roundAmt === 50) return "1 × 50 note";
  if (roundAmt === 400) return "2 × 200 notes";
  if (roundAmt === 300) return "1 × 200 + 1 × 100 notes";
  if (roundAmt === 500) return "2 × 200 + 1 × 100 notes";
  if (roundAmt === 600) return "3 × 200 notes";
  return getEthiopianNoteBreakdown(roundAmt);
}

/**
 * Generates relevant Ethiopian cash amounts a customer is likely to pay with
 * that are strictly greater than the order total, along with customer notes and change breakdowns.
 *
 * Example for order total = 150:
 *   Candidate 200 (1 × 200 note) -> change = 50 (1 × 50 note)
 *   Candidate 300 (1 × 200 + 1 × 100 notes) -> change = 150 (1 × 100 + 1 × 50 notes)
 *   Candidate 400 (2 × 200 notes) -> change = 250 (1 × 200 + 1 × 50 notes)
 */
export function getRelevantChangeOptions(total) {
  const t = Math.ceil(Number(total) || 0);
  if (t <= 0) return [];

  const candidateAmounts = new Set();

  if (t < 50) {
    candidateAmounts.add(50);
    candidateAmounts.add(100);
    candidateAmounts.add(200);
  } else if (t < 100) {
    candidateAmounts.add(100);
    candidateAmounts.add(150);
    candidateAmounts.add(200);
  } else if (t < 200) {
    const next50 = Math.ceil(t / 50) * 50;
    if (next50 > t && next50 < 200) {
      candidateAmounts.add(next50);
    }
    candidateAmounts.add(200);
    candidateAmounts.add(300);
    candidateAmounts.add(400);
  } else if (t < 300) {
    const next50 = Math.ceil(t / 50) * 50;
    if (next50 > t && next50 < 300) {
      candidateAmounts.add(next50);
    }
    candidateAmounts.add(300);
    candidateAmounts.add(400);
    candidateAmounts.add(500);
  } else if (t < 400) {
    const next50 = Math.ceil(t / 50) * 50;
    if (next50 > t && next50 < 400) {
      candidateAmounts.add(next50);
    }
    candidateAmounts.add(400);
    candidateAmounts.add(500);
    candidateAmounts.add(600);
  } else {
    const next100 = Math.ceil(t / 100) * 100;
    if (next100 > t) candidateAmounts.add(next100);
    const next200 = Math.ceil(t / 200) * 200;
    if (next200 > t) candidateAmounts.add(next200);
    candidateAmounts.add(next200 + 200);
    candidateAmounts.add(next200 + 400);
  }

  return Array.from(candidateAmounts)
    .filter((amt) => amt > t)
    .sort((a, b) => a - b)
    .slice(0, 3)
    .map((amt) => {
      const change = amt - t;
      return {
        amount: amt,
        change,
        customerNotes: getCustomerNoteLabel(amt),
        changeNotes: getEthiopianNoteBreakdown(change),
      };
    });
}
