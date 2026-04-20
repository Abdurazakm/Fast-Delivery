const DEFAULT_PRICING = {
  sambusaPrice: 30,
  boiledEggPrice: 30,
  ertibNormalPrice: 115,
  ertibSpecialPrice: 140,
  fetiraBasePrice: 120,
  fetiraExtraEggPrice: 30,
  donut1PairPackagePrice: 60,
  donut2PairPackagePrice: 120,
  donut4PairPackagePrice: 220,
  donut6PairPackagePrice: 320,
  extraKetchupPrice: 10,
  doubleFelafilPrice: 15,
  sambusaCost: 20,
  boiledEggCost: 20,
  ertibNormalCost: 100,
  ertibSpecialCost: 125,
  fetiraBaseCost: 100,
  fetiraExtraEggCost: 20,
  donut1PairPackageCost: 45,
  donut2PairPackageCost: 90,
  donut4PairPackageCost: 170,
  donut6PairPackageCost: 250,
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
      DEFAULT_PRICING.sambusaPrice,
    ),
    boiledEggPrice: toNonNegativeNumber(
      value.boiledEggPrice ?? value.sambusaPrice,
      DEFAULT_PRICING.boiledEggPrice,
    ),
    ertibNormalPrice: toNonNegativeNumber(
      value.ertibNormalPrice,
      DEFAULT_PRICING.ertibNormalPrice,
    ),
    ertibSpecialPrice: toNonNegativeNumber(
      value.ertibSpecialPrice,
      DEFAULT_PRICING.ertibSpecialPrice,
    ),
    fetiraBasePrice: toNonNegativeNumber(
      value.fetiraBasePrice,
      DEFAULT_PRICING.fetiraBasePrice,
    ),
    fetiraExtraEggPrice: toNonNegativeNumber(
      value.fetiraExtraEggPrice,
      DEFAULT_PRICING.fetiraExtraEggPrice,
    ),
    donut1PairPackagePrice: toNonNegativeNumber(
      value.donut1PairPackagePrice ??
        (value.donut2PairPackagePrice != null
          ? Number(value.donut2PairPackagePrice) / 2
          : undefined),
      DEFAULT_PRICING.donut1PairPackagePrice,
    ),
    donut2PairPackagePrice: toNonNegativeNumber(
      value.donut2PairPackagePrice,
      DEFAULT_PRICING.donut2PairPackagePrice,
    ),
    donut4PairPackagePrice: toNonNegativeNumber(
      value.donut4PairPackagePrice,
      DEFAULT_PRICING.donut4PairPackagePrice,
    ),
    donut6PairPackagePrice: toNonNegativeNumber(
      value.donut6PairPackagePrice,
      DEFAULT_PRICING.donut6PairPackagePrice,
    ),
    extraKetchupPrice: toNonNegativeNumber(
      value.extraKetchupPrice,
      DEFAULT_PRICING.extraKetchupPrice,
    ),
    doubleFelafilPrice: toNonNegativeNumber(
      value.doubleFelafilPrice,
      DEFAULT_PRICING.doubleFelafilPrice,
    ),
    sambusaCost: toNonNegativeNumber(
      value.sambusaCost,
      DEFAULT_PRICING.sambusaCost,
    ),
    boiledEggCost: toNonNegativeNumber(
      value.boiledEggCost ?? value.sambusaCost,
      DEFAULT_PRICING.boiledEggCost,
    ),
    ertibNormalCost: toNonNegativeNumber(
      value.ertibNormalCost,
      DEFAULT_PRICING.ertibNormalCost,
    ),
    ertibSpecialCost: toNonNegativeNumber(
      value.ertibSpecialCost,
      DEFAULT_PRICING.ertibSpecialCost,
    ),
    fetiraBaseCost: toNonNegativeNumber(
      value.fetiraBaseCost,
      DEFAULT_PRICING.fetiraBaseCost,
    ),
    fetiraExtraEggCost: toNonNegativeNumber(
      value.fetiraExtraEggCost,
      DEFAULT_PRICING.fetiraExtraEggCost,
    ),
    donut1PairPackageCost: toNonNegativeNumber(
      value.donut1PairPackageCost ??
        (value.donut2PairPackageCost != null
          ? Number(value.donut2PairPackageCost) / 2
          : undefined),
      DEFAULT_PRICING.donut1PairPackageCost,
    ),
    donut2PairPackageCost: toNonNegativeNumber(
      value.donut2PairPackageCost,
      DEFAULT_PRICING.donut2PairPackageCost,
    ),
    donut4PairPackageCost: toNonNegativeNumber(
      value.donut4PairPackageCost,
      DEFAULT_PRICING.donut4PairPackageCost,
    ),
    donut6PairPackageCost: toNonNegativeNumber(
      value.donut6PairPackageCost,
      DEFAULT_PRICING.donut6PairPackageCost,
    ),
    extraKetchupCost: toNonNegativeNumber(
      value.extraKetchupCost,
      DEFAULT_PRICING.extraKetchupCost,
    ),
    doubleFelafilCost: toNonNegativeNumber(
      value.doubleFelafilCost,
      DEFAULT_PRICING.doubleFelafilCost,
    ),
  };
}

function getDonutPackageUnitPrice(pairsPerPackage, safePricing) {
  const pairs = Number(pairsPerPackage) || 1;
  if (pairs === 1) return safePricing.donut1PairPackagePrice;
  if (pairs === 2) return safePricing.donut2PairPackagePrice;
  if (pairs === 4) return safePricing.donut4PairPackagePrice;
  if (pairs === 6) return safePricing.donut6PairPackagePrice;

  // Fallback: keep future sizes flexible even when exact package field is missing.
  const pairRate =
    safePricing.donut1PairPackagePrice > 0
      ? safePricing.donut1PairPackagePrice
      : safePricing.donut2PairPackagePrice / 2;
  return Math.max(0, pairs * pairRate);
}

function getDonutPackageUnitCost(pairsPerPackage, safePricing) {
  const pairs = Number(pairsPerPackage) || 1;
  if (pairs === 1) return safePricing.donut1PairPackageCost;
  if (pairs === 2) return safePricing.donut2PairPackageCost;
  if (pairs === 4) return safePricing.donut4PairPackageCost;
  if (pairs === 6) return safePricing.donut6PairPackageCost;

  const pairCostRate =
    safePricing.donut1PairPackageCost > 0
      ? safePricing.donut1PairPackageCost
      : safePricing.donut2PairPackageCost / 2;
  return Math.max(0, pairs * pairCostRate);
}

function calcUnitPrice(item, pricing = DEFAULT_PRICING) {
  const safePricing = normalizePricing(pricing);

  if (item?.foodType === "sambusa") {
    return safePricing.sambusaPrice;
  }

  if (item?.foodType === "boiled_egg") {
    return safePricing.boiledEggPrice;
  }

  if (item?.foodType === "fetira") {
    const extraEggs = Math.max(0, Number(item?.extraEggs) || 0);
    return (
      safePricing.fetiraBasePrice + extraEggs * safePricing.fetiraExtraEggPrice
    );
  }

  if (item?.foodType === "donut") {
    return getDonutPackageUnitPrice(item?.donutPairsPerPackage, safePricing);
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

  if (item?.foodType === "fetira") {
    const extraEggs = Math.max(0, Number(item?.extraEggs) || 0);
    return (
      safePricing.fetiraBaseCost + extraEggs * safePricing.fetiraExtraEggCost
    );
  }

  if (item?.foodType === "donut") {
    return getDonutPackageUnitCost(item?.donutPairsPerPackage, safePricing);
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
