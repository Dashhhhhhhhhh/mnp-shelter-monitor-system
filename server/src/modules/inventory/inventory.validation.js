const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_ITEM_TYPES = ["FOOD", "SUPPLY"];

const ALLOWED_CATEGORIES = [
  "CAT_FOOD",
  "DOG_FOOD",
  "CAT_LITTER",
  "CLEANING_SUPPLY",
  "MEDICAL_SUPPLY",
  "CAGE_SUPPLY",
  "OTHER",
];

const FOOD_CATEGORIES = ["CAT_FOOD", "DOG_FOOD"];

const SUPPLY_CATEGORIES = [
  "CAT_LITTER",
  "CLEANING_SUPPLY",
  "MEDICAL_SUPPLY",
  "CAGE_SUPPLY",
  "OTHER",
];

const ALLOWED_PACKAGE_SIZE_UNITS = ["G", "KG", "ML", "L"];

const ALLOWED_UNITS = [
  "SACHET",
  "BAG",
  "CAN",
  "BOTTLE",
  "BOX",
  "PACK",
  "PIECE",
  "ROLL",
  "VIAL",
  "TABLET",
  "G",
  "KG",
  "ML",
  "L",
];

const COUNTABLE_UNITS = [
  "SACHET",
  "BAG",
  "CAN",
  "BOTTLE",
  "BOX",
  "PACK",
  "PIECE",
  "ROLL",
  "VIAL",
  "TABLET",
];

const ALLOWED_RECORD_TYPES = ["RECEIVED", "USED", "ADJUSTMENT", "STOCK_CHECK"];

const ALLOWED_ADJUSTMENT_DIRECTIONS = ["ADD", "REMOVE"];

const ALLOWED_ESTIMATED_LEVELS = [
  "FULL",
  "THREE_QUARTERS",
  "HALF",
  "ONE_QUARTER",
  "ALMOST_EMPTY",
  "EMPTY",
];

const ALLOWED_STOCK_STATUSES = ["GOOD", "LOW", "OUT"];

function hasAtMostTwoDecimalPlaces(value) {
  return Number(value.toFixed(2)) === value;
}

function hasOwn(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
}

function validateUuid(value, fieldName) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.statusCode = 400;
    throw error;
  }

  return value;
}

function validateInventoryItemId(inventoryItemId) {
  return validateUuid(inventoryItemId, "inventory item ID");
}

function validateRequiredText(value, fieldName, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    const error = new Error(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function validateOptionalText(value, fieldName, maxLength = null) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    const error = new Error(`${fieldName} must be a string or null`);
    error.statusCode = 400;
    throw error;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (maxLength !== null && normalized.length > maxLength) {
    const error = new Error(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function validateEnum(value, fieldName, allowedValues) {
  if (typeof value !== "string") {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }

  const normalized = value.trim().toUpperCase();

  if (!allowedValues.includes(normalized)) {
    const error = new Error(
      `${fieldName} must be one of: ${allowedValues.join(", ")}`,
    );
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function validateItemType(itemType) {
  return validateEnum(itemType, "Item type", ALLOWED_ITEM_TYPES);
}

function validateCategory(category) {
  return validateEnum(category, "Category", ALLOWED_CATEGORIES);
}

function validateItemTypeCategory(itemType, category) {
  if (itemType === "FOOD" && !FOOD_CATEGORIES.includes(category)) {
    const error = new Error(
      "FOOD items must use CAT_FOOD or DOG_FOOD category",
    );
    error.statusCode = 400;
    throw error;
  }

  if (itemType === "SUPPLY" && !SUPPLY_CATEGORIES.includes(category)) {
    const error = new Error("SUPPLY items must use a supply category");
    error.statusCode = 400;
    throw error;
  }
}

function validatePackageSize(packageSize) {
  if (packageSize === undefined || packageSize === null) {
    return null;
  }

  if (
    typeof packageSize !== "number" ||
    !Number.isFinite(packageSize) ||
    packageSize <= 0
  ) {
    const error = new Error("Package size must be a number greater than 0");
    error.statusCode = 400;
    throw error;
  }

  if (!hasAtMostTwoDecimalPlaces(packageSize)) {
    const error = new Error(
      "Package size must not have more than 2 decimal places",
    );
    error.statusCode = 400;
    throw error;
  }

  if (packageSize > 99999999.99) {
    const error = new Error("Package size is too large");
    error.statusCode = 400;
    throw error;
  }

  return packageSize;
}

function validatePackageSizeUnit(packageSizeUnit) {
  if (packageSizeUnit === undefined || packageSizeUnit === null) {
    return null;
  }

  return validateEnum(
    packageSizeUnit,
    "Package size unit",
    ALLOWED_PACKAGE_SIZE_UNITS,
  );
}

function validateUnit(unit) {
  return validateEnum(unit, "Unit", ALLOWED_UNITS);
}

function validatePackagePair(packageSize, packageSizeUnit) {
  const hasPackageSize = packageSize !== null;
  const hasPackageSizeUnit = packageSizeUnit !== null;

  if (hasPackageSize !== hasPackageSizeUnit) {
    const error = new Error(
      "Package size and package size unit must be provided together",
    );
    error.statusCode = 400;
    throw error;
  }
}

function validateCreateInventoryItemInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Inventory item data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const itemName = validateRequiredText(data.itemName, "Item name", 150);

  const variant = validateOptionalText(data.variant, "Variant", 150);

  const itemType = validateItemType(data.itemType);
  const category = validateCategory(data.category);

  validateItemTypeCategory(itemType, category);

  const packageSize = validatePackageSize(data.packageSize);
  const packageSizeUnit = validatePackageSizeUnit(data.packageSizeUnit);

  validatePackagePair(packageSize, packageSizeUnit);

  const unit = validateUnit(data.unit);

  return {
    itemName,
    variant,
    itemType,
    category,
    packageSize,
    packageSizeUnit,
    unit,
  };
}

function validateUpdateInventoryItemInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Inventory item update data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const editableFields = [
    "itemName",
    "variant",
    "itemType",
    "category",
    "packageSize",
    "packageSizeUnit",
    "unit",
  ];

  const hasEditableField = editableFields.some((field) => hasOwn(data, field));

  if (!hasEditableField) {
    const error = new Error(
      "At least one inventory item field must be provided",
    );
    error.statusCode = 400;
    throw error;
  }

  const result = {};

  if (hasOwn(data, "itemName")) {
    result.itemName = validateRequiredText(data.itemName, "Item name", 150);
  }

  if (hasOwn(data, "variant")) {
    result.variant = validateOptionalText(data.variant, "Variant", 150);
  }

  if (hasOwn(data, "itemType")) {
    result.itemType = validateItemType(data.itemType);
  }

  if (hasOwn(data, "category")) {
    result.category = validateCategory(data.category);
  }

  if (hasOwn(data, "packageSize")) {
    result.packageSize = validatePackageSize(data.packageSize);
  }

  if (hasOwn(data, "packageSizeUnit")) {
    result.packageSizeUnit = validatePackageSizeUnit(data.packageSizeUnit);
  }

  if (hasOwn(data, "unit")) {
    result.unit = validateUnit(data.unit);
  }

  return result;
}

function validateStockRecordType(recordType) {
  return validateEnum(recordType, "Record type", ALLOWED_RECORD_TYPES);
}

function validateQuantity(quantity) {
  if (
    typeof quantity !== "number" ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    const error = new Error("Quantity must be a number greater than 0");
    error.statusCode = 400;
    throw error;
  }

  if (!hasAtMostTwoDecimalPlaces(quantity)) {
    const error = new Error(
      "Quantity must not have more than 2 decimal places",
    );
    error.statusCode = 400;
    throw error;
  }

  if (quantity > 99999999.99) {
    const error = new Error("Quantity is too large");
    error.statusCode = 400;
    throw error;
  }

  return quantity;
}

function validateQuantityForUnit(quantity, unit) {
  if (COUNTABLE_UNITS.includes(unit) && !Number.isInteger(quantity)) {
    const error = new Error(
      `Quantity must be a whole number when unit is ${unit}`,
    );
    error.statusCode = 400;
    throw error;
  }

  return quantity;
}

function validateAdjustmentDirection(adjustmentDirection) {
  return validateEnum(
    adjustmentDirection,
    "Adjustment direction",
    ALLOWED_ADJUSTMENT_DIRECTIONS,
  );
}

function validateEstimatedLevel(estimatedLevel) {
  return validateEnum(
    estimatedLevel,
    "Estimated level",
    ALLOWED_ESTIMATED_LEVELS,
  );
}

function validateStockStatus(stockStatus) {
  return validateEnum(stockStatus, "Stock status", ALLOWED_STOCK_STATUSES);
}

function validateCreateStockRecordInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Stock record data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const recordType = validateStockRecordType(data.recordType);

  const notes = validateOptionalText(data.notes, "Notes");

  if (recordType === "STOCK_CHECK") {
    if (data.quantity !== undefined && data.quantity !== null) {
      const error = new Error("Quantity is not allowed for a STOCK_CHECK");
      error.statusCode = 400;
      throw error;
    }

    if (
      data.adjustmentDirection !== undefined &&
      data.adjustmentDirection !== null
    ) {
      const error = new Error(
        "Adjustment direction is only allowed for ADJUSTMENT records",
      );
      error.statusCode = 400;
      throw error;
    }

    const estimatedLevel =
      data.estimatedLevel === undefined || data.estimatedLevel === null
        ? null
        : validateEstimatedLevel(data.estimatedLevel);

    const stockStatus =
      data.stockStatus === undefined || data.stockStatus === null
        ? null
        : validateStockStatus(data.stockStatus);

    if (!estimatedLevel && !stockStatus) {
      const error = new Error(
        "STOCK_CHECK requires estimated level or stock status",
      );
      error.statusCode = 400;
      throw error;
    }

    return {
      recordType,
      quantity: null,
      adjustmentDirection: null,
      estimatedLevel,
      stockStatus,
      notes,
    };
  }

  if (data.estimatedLevel !== undefined && data.estimatedLevel !== null) {
    const error = new Error(
      "Estimated level is only allowed for STOCK_CHECK records",
    );
    error.statusCode = 400;
    throw error;
  }

  if (data.stockStatus !== undefined && data.stockStatus !== null) {
    const error = new Error(
      "Stock status is only allowed for STOCK_CHECK records",
    );
    error.statusCode = 400;
    throw error;
  }

  const quantity = validateQuantity(data.quantity);

  if (recordType === "ADJUSTMENT") {
    const adjustmentDirection = validateAdjustmentDirection(
      data.adjustmentDirection,
    );

    if (!notes) {
      const error = new Error("Notes are required for an ADJUSTMENT record");
      error.statusCode = 400;
      throw error;
    }

    return {
      recordType,
      quantity,
      adjustmentDirection,
      estimatedLevel: null,
      stockStatus: null,
      notes,
    };
  }

  if (
    data.adjustmentDirection !== undefined &&
    data.adjustmentDirection !== null
  ) {
    const error = new Error(
      "Adjustment direction is only allowed for ADJUSTMENT records",
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    recordType,
    quantity,
    adjustmentDirection: null,
    estimatedLevel: null,
    stockStatus: null,
    notes,
  };
}

export {
  validateInventoryItemId,
  validateCreateInventoryItemInput,
  validateUpdateInventoryItemInput,
  validateCreateStockRecordInput,
  validateItemTypeCategory,
  validatePackagePair,
  validateQuantityForUnit,
};
