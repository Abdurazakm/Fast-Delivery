const DEFAULT_PRICING = {
  sambusaPrice: 30,
  boiledEggPrice: 30,
  ertibNormalPrice: 115,
  ertibSpecialPrice: 140,
  extraKetchupPrice: 10,
  doubleFelafilPrice: 15,
  sambusaCost: 20,
  boiledEggCost: 20,
  ertibNormalCost: 100,
  ertibSpecialCost: 125,
  extraKetchupCost: 0,
  doubleFelafilCost: 0,
};

function toNonNegativeNumber(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return num;
}

function normalizePricing(value = {}) {
  return {
    sambusaPrice: toNonNegativeNumber(
      value.sambusaPrice,
      DEFAULT_PRICING.sambusaPrice
    ),
    boiledEggPrice: toNonNegativeNumber(
      value.boiledEggPrice ?? value.sambusaPrice,
      DEFAULT_PRICING.boiledEggPrice
    ),
    ertibNormalPrice: toNonNegativeNumber(
      value.ertibNormalPrice,
      DEFAULT_PRICING.ertibNormalPrice
    ),
    ertibSpecialPrice: toNonNegativeNumber(
      value.ertibSpecialPrice,
      DEFAULT_PRICING.ertibSpecialPrice
    ),
    extraKetchupPrice: toNonNegativeNumber(
      value.extraKetchupPrice,
      DEFAULT_PRICING.extraKetchupPrice
    ),
    doubleFelafilPrice: toNonNegativeNumber(
      value.doubleFelafilPrice,
      DEFAULT_PRICING.doubleFelafilPrice
    ),
    sambusaCost: toNonNegativeNumber(
      value.sambusaCost,
      DEFAULT_PRICING.sambusaCost
    ),
    boiledEggCost: toNonNegativeNumber(
      value.boiledEggCost ?? value.sambusaCost,
      DEFAULT_PRICING.boiledEggCost
    ),
    ertibNormalCost: toNonNegativeNumber(
      value.ertibNormalCost,
      DEFAULT_PRICING.ertibNormalCost
    ),
    ertibSpecialCost: toNonNegativeNumber(
      value.ertibSpecialCost,
      DEFAULT_PRICING.ertibSpecialCost
    ),
    extraKetchupCost: toNonNegativeNumber(
      value.extraKetchupCost,
      DEFAULT_PRICING.extraKetchupCost
    ),
    doubleFelafilCost: toNonNegativeNumber(
      value.doubleFelafilCost,
      DEFAULT_PRICING.doubleFelafilCost
    ),
  };
}

function calcUnitPrice(item, pricing = DEFAULT_PRICING) {
  const safePricing = normalizePricing(pricing);

  if (item?.foodType === "sambusa") {
    return safePricing.sambusaPrice;
  }

  if (item?.foodType === "boiled_egg") {
    return safePricing.boiledEggPrice;
  }

  let base =
    item?.ertibType === "special"
      ? safePricing.ertibSpecialPrice
      : safePricing.ertibNormalPrice;

  if (item?.extraKetchup) base += safePricing.extraKetchupPrice;
  if (item?.doubleFelafil) base += safePricing.doubleFelafilPrice;

  return base;
}

function calcUnitEstimatedCost(item, pricing = DEFAULT_PRICING) {
  const safePricing = normalizePricing(pricing);

  if (item?.foodType === "sambusa") {
    return safePricing.sambusaCost;
  }

  if (item?.foodType === "boiled_egg") {
    return safePricing.boiledEggCost;
  }

  let base =
    item?.ertibType === "special"
      ? safePricing.ertibSpecialCost
      : safePricing.ertibNormalCost;

  if (item?.extraKetchup) base += safePricing.extraKetchupCost;
  if (item?.doubleFelafil) base += safePricing.doubleFelafilCost;

  return base;
}

async function getActivePricing(prisma) {
  try {
    const pricing = await prisma.pricing.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    return pricing ? normalizePricing(pricing) : DEFAULT_PRICING;
  } catch (err) {
    return DEFAULT_PRICING;
  }
}

module.exports = {
  DEFAULT_PRICING,
  normalizePricing,
  calcUnitPrice,
  calcUnitEstimatedCost,
  getActivePricing,
};