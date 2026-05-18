const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const { emitAvailabilityUpdated } = require("../socket");
const {
  normalizeItemAvailability,
  parseAvailabilityMetadata,
  serializeAvailabilityMetadata,
} = require("../config/itemAvailability");
const {
  authMiddleware,
  adminMiddleware,
} = require("../middlewares/authMiddleware");

// GET current availability
router.get("/", async (req, res) => {
  try {
    const availability = await prisma.availability.findFirst();
    if (availability && availability.weeklyDays) {
      // Convert string back to array
      availability.weeklyDays = availability.weeklyDays.split(",");
      const { reasonText, itemAvailability } = parseAvailabilityMetadata(
        availability.tempCloseReason,
      );
      availability.tempCloseReason = reasonText;
      availability.itemAvailability = itemAvailability;
    }
    res.json(availability);
  } catch (err) {
    console.error("❌ Prisma Error:", err);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

// POST or PUT — create/update availability
router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  const {
    weeklyDays,
    cutoffTime,
    isTemporarilyClosed,
    tempCloseReason,
    itemAvailability,
  } = req.body;

  try {
    const weeklyDaysString = Array.isArray(weeklyDays)
      ? weeklyDays.join(",")
      : weeklyDays;
    const normalizedItemAvailability =
      normalizeItemAvailability(itemAvailability);
    const metadata = serializeAvailabilityMetadata(
      tempCloseReason,
      normalizedItemAvailability,
    );

    const existing = await prisma.availability.findFirst();

    if (existing) {
      // update
      const updated = await prisma.availability.update({
        where: { id: existing.id },
        data: {
          weeklyDays: weeklyDaysString,
          cutoffTime,
          isTemporarilyClosed,
          tempCloseReason: metadata,
        },
      });
      // Convert back to array before sending response
      updated.weeklyDays = updated.weeklyDays.split(",");
      updated.tempCloseReason = tempCloseReason || "";
      updated.itemAvailability = normalizedItemAvailability;
      emitAvailabilityUpdated(updated);
      res.json(updated);
    } else {
      // create
      const created = await prisma.availability.create({
        data: {
          weeklyDays: weeklyDaysString,
          cutoffTime,
          isTemporarilyClosed,
          tempCloseReason: metadata,
        },
      });
      created.weeklyDays = created.weeklyDays.split(",");
      created.tempCloseReason = tempCloseReason || "";
      created.itemAvailability = normalizedItemAvailability;
      emitAvailabilityUpdated(created);
      res.json(created);
    }
  } catch (err) {
    console.error("❌ Prisma Error:", err);
    res.status(500).json({ error: "Failed to save availability" });
  }
});

module.exports = router;
