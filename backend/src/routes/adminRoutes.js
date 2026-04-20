const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const prisma = require("../config/prisma");
const {
  authMiddleware,
  adminMiddleware,
} = require("../middlewares/authMiddleware");
const { normalizePhone } = require("../utils/phone");
const { normalizePricing, getActivePricing } = require("../config/pricing");
const { emitPricingUpdated } = require("../socket");

router.post(
  "/create-admin",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { name, phone, password } = req.body;

      if (!name || !phone || !password) {
        return res.status(400).json({ message: "Missing fields" });
      }

      const normalizedPhone = normalizePhone(phone);

      const existing = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (existing) {
        return res.status(400).json({ message: "Phone already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.create({
        data: {
          name,
          phone: normalizedPhone,
          password: hashedPassword,
          role: "admin",
          block: "",
        },
      });

      res.json({ message: "Admin created" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

router.get("/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const today = new Date();
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const [ordersToday, incomeTodayAgg] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: start } } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: start } },
        _sum: { total: true },
      }),
    ]);

    const incomeToday = incomeTodayAgg?._sum?.total || 0;
    res.json({ ordersToday, incomeToday });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/pricing", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const pricing = await getActivePricing(prisma);
    res.json(pricing);
  } catch (err) {
    console.error("❌ Error loading pricing:", err);
    res.status(500).json({ message: "Failed to load pricing" });
  }
});

router.put("/pricing", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const parsed = normalizePricing(req.body || {});

    const existing = await prisma.pricing.findFirst({
      orderBy: { id: "asc" },
    });

    const data = {
      sambusaPrice: parsed.sambusaPrice,
      boiledEggPrice: parsed.boiledEggPrice,
      ertibNormalPrice: parsed.ertibNormalPrice,
      ertibSpecialPrice: parsed.ertibSpecialPrice,
      fetiraBasePrice: parsed.fetiraBasePrice,
      fetiraExtraEggPrice: parsed.fetiraExtraEggPrice,
      donut1PairPackagePrice: parsed.donut1PairPackagePrice,
      donut2PairPackagePrice: parsed.donut2PairPackagePrice,
      donut4PairPackagePrice: parsed.donut4PairPackagePrice,
      donut6PairPackagePrice: parsed.donut6PairPackagePrice,
      extraKetchupPrice: parsed.extraKetchupPrice,
      doubleFelafilPrice: parsed.doubleFelafilPrice,
      sambusaCost: parsed.sambusaCost,
      boiledEggCost: parsed.boiledEggCost,
      ertibNormalCost: parsed.ertibNormalCost,
      ertibSpecialCost: parsed.ertibSpecialCost,
      fetiraBaseCost: parsed.fetiraBaseCost,
      fetiraExtraEggCost: parsed.fetiraExtraEggCost,
      donut1PairPackageCost: parsed.donut1PairPackageCost,
      donut2PairPackageCost: parsed.donut2PairPackageCost,
      donut4PairPackageCost: parsed.donut4PairPackageCost,
      donut6PairPackageCost: parsed.donut6PairPackageCost,
      extraKetchupCost: parsed.extraKetchupCost,
      doubleFelafilCost: parsed.doubleFelafilCost,
    };

    // Backward-compatible fallback for environments where Prisma client
    // has not been regenerated after adding donut1 fields.
    const dataWithoutDonut1 = {
      ...data,
    };
    delete dataWithoutDonut1.donut1PairPackagePrice;
    delete dataWithoutDonut1.donut1PairPackageCost;

    const persistPricing = async (payload) =>
      existing
        ? prisma.pricing.update({ where: { id: existing.id }, data: payload })
        : prisma.pricing.create({ data: payload });

    let updated;
    try {
      updated = await persistPricing(data);
    } catch (persistErr) {
      const msg = String(persistErr?.message || "");
      const unknownDonut1Field =
        msg.includes("donut1PairPackagePrice") ||
        msg.includes("donut1PairPackageCost");

      if (!unknownDonut1Field) throw persistErr;

      updated = await persistPricing(dataWithoutDonut1);
    }

    const normalized = normalizePricing(updated);
    emitPricingUpdated(normalized);

    res.json(normalized);
  } catch (err) {
    console.error("❌ Error updating pricing:", err);
    res.status(500).json({ message: "Failed to update pricing" });
  }
});

module.exports = router;
