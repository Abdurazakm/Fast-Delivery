const FOOD_TYPES = ["ertib", "fetira", "donut", "sambusa", "boiled_egg"];

const FOOD_TYPE_LABELS = {
  ertib: "Ertib",
  fetira: "Fetira",
  donut: "Donut",
  sambusa: "Sambusa",
  boiled_egg: "Boiled Egg",
};

const DEFAULT_ITEM_AVAILABILITY = Object.freeze({
  ertib: true,
  fetira: true,
  donut: true,
  sambusa: true,
  boiled_egg: true,
});

function parseItemAvailability(rawValue) {
  if (!rawValue) return {};

  if (typeof rawValue === "object") {
    return rawValue;
  }

  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (err) {
      return {};
    }
  }

  return {};
}

function parseAvailabilityMetadata(rawTempCloseReason) {
  if (!rawTempCloseReason || typeof rawTempCloseReason !== "string") {
    return {
      reasonText: "",
      itemAvailability: { ...DEFAULT_ITEM_AVAILABILITY },
    };
  }

  try {
    const parsed = JSON.parse(rawTempCloseReason);
    if (parsed && typeof parsed === "object") {
      return {
        reasonText: String(parsed.reasonText || ""),
        itemAvailability: normalizeItemAvailability(parsed.itemAvailability),
      };
    }
  } catch (err) {
    return {
      reasonText: rawTempCloseReason,
      itemAvailability: { ...DEFAULT_ITEM_AVAILABILITY },
    };
  }

  return {
    reasonText: rawTempCloseReason,
    itemAvailability: { ...DEFAULT_ITEM_AVAILABILITY },
  };
}

function serializeAvailabilityMetadata(reasonText = "", itemAvailability = {}) {
  return JSON.stringify({
    reasonText: String(reasonText || ""),
    itemAvailability: normalizeItemAvailability(itemAvailability),
  });
}

function normalizeItemAvailability(rawValue) {
  const parsed = parseItemAvailability(rawValue);

  return FOOD_TYPES.reduce((acc, foodType) => {
    const fallback = DEFAULT_ITEM_AVAILABILITY[foodType];
    const current = parsed[foodType];
    acc[foodType] = typeof current === "boolean" ? current : fallback;
    return acc;
  }, {});
}

function getUnavailableFoodTypes(
  items = [],
  itemAvailability = DEFAULT_ITEM_AVAILABILITY,
) {
  if (!Array.isArray(items) || items.length === 0) return [];

  const unavailable = new Set();

  for (const item of items) {
    const foodType = String(item?.foodType || "ertib").toLowerCase();
    const isAvailable = itemAvailability[foodType] !== false;

    if (!isAvailable) {
      unavailable.add(foodType);
    }
  }

  return Array.from(unavailable);
}

function formatFoodTypeLabel(foodType) {
  return FOOD_TYPE_LABELS[foodType] || foodType;
}

module.exports = {
  FOOD_TYPES,
  FOOD_TYPE_LABELS,
  DEFAULT_ITEM_AVAILABILITY,
  normalizeItemAvailability,
  getUnavailableFoodTypes,
  formatFoodTypeLabel,
  parseAvailabilityMetadata,
  serializeAvailabilityMetadata,
};
