// serviceAvailability.js
const prisma = require("../config/prisma");

const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function getEATNowParts(referenceDate = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Addis_Ababa",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(referenceDate);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);

  return { weekday, hour, minute };
}

async function checkServiceAvailability(req, res, next) {
  try {
    const availability = await prisma.availability.findFirst();
    if (!availability) return next();

    const nowEAT = getEATNowParts();

    // Temporary closure
    if (availability.isTemporarilyClosed) {
      return res.status(403).json({
        message: availability.tempCloseReason || "Service temporarily closed.",
      });
    }

    // Weekly days
    let weeklyDays = availability.weeklyDays;
    if (typeof weeklyDays === "string") {
      weeklyDays = weeklyDays.split(",").map((d) => d.trim());
    }

    const isWorkingDay = weeklyDays?.includes(nowEAT.weekday);

    if (!isWorkingDay) {
      return res.status(403).json({ message: "Service is unavailable today." });
    }

    // Cutoff time (24-hour from UI)
    if (availability.cutoffTime) {
      const [h, m] = availability.cutoffTime.split(":").map(Number);
      const nowMinutes = nowEAT.hour * 60 + nowEAT.minute;
      const cutoffMinutes = h * 60 + m;

      if (nowMinutes > cutoffMinutes) {
        return res.status(403).json({
          message: `Ordering time has passed for today. Cutoff was at ${availability.cutoffTime}.`,
        });
      }
    }

    next();
  } catch (err) {
    console.error("checkServiceAvailability error:", err);
    res.status(500).json({
      message: "Server error validating service availability",
      error: err.message,
    });
  }
}

module.exports = checkServiceAvailability;
