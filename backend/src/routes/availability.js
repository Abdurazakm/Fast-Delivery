const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET current availability
router.get("/", async (req, res) => {
  try {
    const availability = await prisma.availability.findFirst();
    if (availability && availability.weeklyDays) {
      // Convert string back to array
      availability.weeklyDays = availability.weeklyDays.split(",");
    }
    res.json(availability);
  } catch (err) {
    console.error("❌ Prisma Error:", err);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
});

// POST or PUT — create/update availability
router.post("/", async (req, res) => {
  const { weeklyDays, cutoffTime, isTemporarilyClosed, tempCloseReason } =
    req.body;

  try {
    const weeklyDaysString = Array.isArray(weeklyDays)
      ? weeklyDays.join(",")
      : weeklyDays;

    const existing = await prisma.availability.findFirst();

    if (existing) {
      // update
      const updated = await prisma.availability.update({
        where: { id: existing.id },
        data: {
          weeklyDays: weeklyDaysString,
          cutoffTime,
          isTemporarilyClosed,
          tempCloseReason,
        },
      });
      // Convert back to array before sending response
      updated.weeklyDays = updated.weeklyDays.split(",");
      res.json(updated);
    } else {
      // create
      const created = await prisma.availability.create({
        data: {
          weeklyDays: weeklyDaysString,
          cutoffTime,
          isTemporarilyClosed,
          tempCloseReason,
        },
      });
      created.weeklyDays = created.weeklyDays.split(",");
      res.json(created);
    }
  } catch (err) {
    console.error("❌ Prisma Error:", err);
    res.status(500).json({ error: "Failed to save availability" });
  }
});

module.exports = router;
