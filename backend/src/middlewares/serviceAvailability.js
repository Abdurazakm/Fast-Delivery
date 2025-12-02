// serviceAvailability.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

async function checkServiceAvailability(req, res, next) {
  try {
    const availability = await prisma.availability.findFirst();
    if (!availability) return next();

    const now = new Date(); // server local time

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

    const today = now.getDay();
    const isWorkingDay = weeklyDays?.includes(Object.keys(dayMap)[today]);

    if (!isWorkingDay) {
      return res.status(403).json({ message: "Service is unavailable today." });
    }

    // Cutoff time (24-hour from UI)
    if (availability.cutoffTime) {
      const [h, m] = availability.cutoffTime.split(":").map(Number);

      const cutoff = new Date();
      cutoff.setHours(h, m, 0, 0); // server local time

      if (now > cutoff) {
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
