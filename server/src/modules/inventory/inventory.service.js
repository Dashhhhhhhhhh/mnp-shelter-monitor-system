import pool from "../../config/db.js";
import crypto from "crypto";

import {
  findInventoryItemById,
  findInventoryItemByIdForUpdate,
  findInventoryItems,
  findDuplicateInventoryItem,
  insertInventoryItem,
  updateInventoryItem,
  setInventoryItemActiveStatus,
  hasInventoryStockRecords,
  getCurrentStock,
  insertStockRecord,
  findStockRecordsByInventoryItemId,
  findStockRecordByIdempotencyKey,
} from "./inventory.repository.js";

import {
  validateInventoryItemId,
  validateCreateInventoryItemInput,
  validateUpdateInventoryItemInput,
  validateCreateStockRecordInput,
  validateItemTypeCategory,
  validatePackagePair,
  validateQuantityForUnit,
} from "./inventory.validation.js";

function validateIdempotencyKey(idempotencyKey) {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (typeof idempotencyKey !== "string" || !uuidPattern.test(idempotencyKey)) {
    const error = new Error("A valid Idempotency-Key header is required");
    error.statusCode = 400;
    throw error;
  }

  return idempotencyKey;
}

function createStockRecordRequestHash(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

function hasOwn(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
}

function toNullableNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function mapInventoryItem(record) {
  return {
    inventoryItemId: record.inventory_item_id,
    itemName: record.item_name,
    variant: record.variant,
    itemType: record.item_type,
    category: record.category,

    packageSize: toNullableNumber(record.package_size),
    packageSizeUnit: record.package_size_unit,
    unit: record.unit,

    isActive: record.is_active,

    currentStock:
      record.current_stock === undefined
        ? undefined
        : Number(record.current_stock),

    createdBy: record.created_by,
    updatedBy: record.updated_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapStockRecord(record) {
  return {
    stockRecordId: record.stock_record_id,
    inventoryItemId: record.inventory_item_id,
    recordType: record.record_type,

    quantity: toNullableNumber(record.quantity),
    adjustmentDirection: record.adjustment_direction,

    estimatedLevel: record.estimated_level,
    stockStatus: record.stock_status,

    notes: record.notes,
    recordedBy: record.recorded_by,
    createdAt: record.created_at,
  };
}

function validateStockRecordPermission(userRole, recordType) {
  if (userRole === "ADMIN" || userRole === "VOLUNTEER") {
    return;
  }

  if (
    userRole === "CARETAKER" &&
    (recordType === "USED" || recordType === "STOCK_CHECK")
  ) {
    return;
  }

  const error = new Error(
    "You are not authorized to create this stock record type",
  );
  error.statusCode = 403;
  throw error;
}

async function createInventoryItemService(data, createdBy) {
  const validated = validateCreateInventoryItemInput(data);

  const duplicate = await findDuplicateInventoryItem(validated);

  if (duplicate) {
    const error = new Error("Inventory item already exists");
    error.statusCode = 409;
    throw error;
  }

  let created;

  try {
    created = await insertInventoryItem({
      ...validated,
      createdBy,
    });
  } catch (error) {
    if (
      error.code === "23505" &&
      error.constraint === "uq_inventory_items_identity"
    ) {
      const conflictError = new Error("Inventory item already exists");
      conflictError.statusCode = 409;
      throw conflictError;
    }

    throw error;
  }

  const inventoryItem = await findInventoryItemById(created.inventory_item_id);

  return mapInventoryItem(inventoryItem);
}

async function getInventoryItemService(inventoryItemId) {
  const validInventoryItemId = validateInventoryItemId(inventoryItemId);

  const inventoryItem = await findInventoryItemById(validInventoryItemId);

  if (!inventoryItem) {
    const error = new Error("Inventory item not found");
    error.statusCode = 404;
    throw error;
  }

  return mapInventoryItem(inventoryItem);
}

async function getInventoryItemsService() {
  const inventoryItems = await findInventoryItems();

  return inventoryItems.map(mapInventoryItem);
}

async function updateInventoryItemService(inventoryItemId, data, updatedBy) {
  const validInventoryItemId = validateInventoryItemId(inventoryItemId);

  const validatedUpdates = validateUpdateInventoryItemInput(data);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingItem = await findInventoryItemByIdForUpdate(
      validInventoryItemId,
      client,
    );

    if (!existingItem) {
      const error = new Error("Inventory item not found");
      error.statusCode = 404;
      throw error;
    }

    const nextItemName = hasOwn(validatedUpdates, "itemName")
      ? validatedUpdates.itemName
      : existingItem.item_name;

    const nextVariant = hasOwn(validatedUpdates, "variant")
      ? validatedUpdates.variant
      : existingItem.variant;

    const nextItemType = hasOwn(validatedUpdates, "itemType")
      ? validatedUpdates.itemType
      : existingItem.item_type;

    const nextCategory = hasOwn(validatedUpdates, "category")
      ? validatedUpdates.category
      : existingItem.category;

    const nextPackageSize = hasOwn(validatedUpdates, "packageSize")
      ? validatedUpdates.packageSize
      : toNullableNumber(existingItem.package_size);

    const nextPackageSizeUnit = hasOwn(validatedUpdates, "packageSizeUnit")
      ? validatedUpdates.packageSizeUnit
      : existingItem.package_size_unit;

    const nextUnit = hasOwn(validatedUpdates, "unit")
      ? validatedUpdates.unit
      : existingItem.unit;

    validateItemTypeCategory(nextItemType, nextCategory);

    validatePackagePair(nextPackageSize, nextPackageSizeUnit);

    const unitChanged =
      hasOwn(validatedUpdates, "unit") &&
      validatedUpdates.unit !== existingItem.unit;

    const packageSizeChanged =
      hasOwn(validatedUpdates, "packageSize") &&
      validatedUpdates.packageSize !==
        toNullableNumber(existingItem.package_size);

    const packageSizeUnitChanged =
      hasOwn(validatedUpdates, "packageSizeUnit") &&
      validatedUpdates.packageSizeUnit !== existingItem.package_size_unit;

    if (unitChanged || packageSizeChanged || packageSizeUnitChanged) {
      const hasStockHistory = await hasInventoryStockRecords(
        validInventoryItemId,
        client,
      );

      if (hasStockHistory) {
        const error = new Error(
          "Unit and package size cannot be changed after stock records exist",
        );
        error.statusCode = 409;
        throw error;
      }
    }

    const duplicate = await findDuplicateInventoryItem(
      {
        itemName: nextItemName,
        variant: nextVariant,
        itemType: nextItemType,
        category: nextCategory,
        packageSize: nextPackageSize,
        packageSizeUnit: nextPackageSizeUnit,
        unit: nextUnit,
      },
      validInventoryItemId,
      client,
    );

    if (duplicate) {
      const error = new Error("Inventory item already exists");
      error.statusCode = 409;
      throw error;
    }

    const updated = await updateInventoryItem(
      validInventoryItemId,
      validatedUpdates,
      updatedBy,
      client,
    );

    if (!updated) {
      const error = new Error("Inventory item could not be updated");
      error.statusCode = 409;
      throw error;
    }

    const currentStock = await getCurrentStock(validInventoryItemId, client);

    await client.query("COMMIT");

    return mapInventoryItem({
      ...updated,
      current_stock: currentStock,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (
      error.code === "23505" &&
      error.constraint === "uq_inventory_items_identity"
    ) {
      const conflictError = new Error("Inventory item already exists");
      conflictError.statusCode = 409;
      throw conflictError;
    }

    throw error;
  } finally {
    client.release();
  }
}

async function deactivateInventoryItemService(inventoryItemId, updatedBy) {
  const validInventoryItemId = validateInventoryItemId(inventoryItemId);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const inventoryItem = await findInventoryItemByIdForUpdate(
      validInventoryItemId,
      client,
    );

    if (!inventoryItem) {
      const error = new Error("Inventory item not found");
      error.statusCode = 404;
      throw error;
    }

    if (!inventoryItem.is_active) {
      const error = new Error("Inventory item is already inactive");
      error.statusCode = 409;
      throw error;
    }

    const currentStock = Number(
      await getCurrentStock(validInventoryItemId, client),
    );

    if (currentStock > 0) {
      const error = new Error(
        "Inventory item cannot be deactivated while stock remains",
      );
      error.statusCode = 409;
      throw error;
    }

    const updated = await setInventoryItemActiveStatus(
      validInventoryItemId,
      false,
      updatedBy,
      client,
    );

    await client.query("COMMIT");

    return mapInventoryItem({
      ...updated,
      current_stock: currentStock,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function reactivateInventoryItemService(inventoryItemId, updatedBy) {
  const validInventoryItemId = validateInventoryItemId(inventoryItemId);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const inventoryItem = await findInventoryItemByIdForUpdate(
      validInventoryItemId,
      client,
    );

    if (!inventoryItem) {
      const error = new Error("Inventory item not found");
      error.statusCode = 404;
      throw error;
    }

    if (inventoryItem.is_active) {
      const error = new Error("Inventory item is already active");
      error.statusCode = 409;
      throw error;
    }

    const updated = await setInventoryItemActiveStatus(
      validInventoryItemId,
      true,
      updatedBy,
      client,
    );

    const currentStock = await getCurrentStock(validInventoryItemId, client);

    await client.query("COMMIT");

    return mapInventoryItem({
      ...updated,
      current_stock: currentStock,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function createStockRecordService(
  inventoryItemId,
  data,
  recordedBy,
  userRole,
  idempotencyKey,
) {
  const validInventoryItemId = validateInventoryItemId(inventoryItemId);

  const validIdempotencyKey = validateIdempotencyKey(idempotencyKey);

  const validated = validateCreateStockRecordInput(data);

  validateStockRecordPermission(userRole, validated.recordType);

  const idempotencyRequestHash = createStockRecordRequestHash({
    inventoryItemId: validInventoryItemId,
    recordType: validated.recordType,
    quantity: validated.quantity,
    adjustmentDirection: validated.adjustmentDirection,
    estimatedLevel: validated.estimatedLevel,
    stockStatus: validated.stockStatus,
    notes: validated.notes,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Fast replay check.
    const existingStockRecord = await findStockRecordByIdempotencyKey(
      recordedBy,
      validIdempotencyKey,
      client,
    );

    if (existingStockRecord) {
      if (
        existingStockRecord.idempotency_request_hash !== idempotencyRequestHash
      ) {
        const error = new Error(
          "Idempotency key has already been used for a different stock request",
        );
        error.statusCode = 409;
        throw error;
      }

      const currentStock = Number(
        await getCurrentStock(existingStockRecord.inventory_item_id, client),
      );

      await client.query("COMMIT");

      return {
        stockRecord: {
          ...mapStockRecord(existingStockRecord),
          currentStock,
        },
        isReplay: true,
      };
    }

    const inventoryItem = await findInventoryItemByIdForUpdate(
      validInventoryItemId,
      client,
    );

    if (!inventoryItem) {
      const error = new Error("Inventory item not found");
      error.statusCode = 404;
      throw error;
    }

    /*
      Re-check after acquiring the item lock.

      This protects against another request that used the same
      idempotency key while this request was waiting for the row lock.
    */
    const replayAfterLock = await findStockRecordByIdempotencyKey(
      recordedBy,
      validIdempotencyKey,
      client,
    );

    if (replayAfterLock) {
      if (replayAfterLock.idempotency_request_hash !== idempotencyRequestHash) {
        const error = new Error(
          "Idempotency key has already been used for a different stock request",
        );
        error.statusCode = 409;
        throw error;
      }

      const currentStock = Number(
        await getCurrentStock(replayAfterLock.inventory_item_id, client),
      );

      await client.query("COMMIT");

      return {
        stockRecord: {
          ...mapStockRecord(replayAfterLock),
          currentStock,
        },
        isReplay: true,
      };
    }

    if (!inventoryItem.is_active) {
      const error = new Error("Inventory item is inactive");
      error.statusCode = 409;
      throw error;
    }

    if (validated.quantity !== null) {
      validateQuantityForUnit(validated.quantity, inventoryItem.unit);
    }

    const currentStock = Number(
      await getCurrentStock(validInventoryItemId, client),
    );

    const subtractsStock =
      validated.recordType === "USED" ||
      (validated.recordType === "ADJUSTMENT" &&
        validated.adjustmentDirection === "REMOVE");

    if (subtractsStock && validated.quantity > currentStock) {
      const error = new Error("Insufficient stock");
      error.statusCode = 409;
      throw error;
    }

    const stockRecord = await insertStockRecord(
      {
        inventoryItemId: validInventoryItemId,
        ...validated,
        recordedBy,
        idempotencyKey: validIdempotencyKey,
        idempotencyRequestHash,
      },
      client,
    );

    const updatedCurrentStock = Number(
      await getCurrentStock(validInventoryItemId, client),
    );

    await client.query("COMMIT");

    return {
      stockRecord: {
        ...mapStockRecord(stockRecord),
        currentStock: updatedCurrentStock,
      },
      isReplay: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    /*
      PostgreSQL unique constraint is our final protection
      against truly concurrent requests.
    */
    if (
      error.code === "23505" &&
      error.constraint === "uq_inventory_stock_recorded_by_idempotency_key"
    ) {
      const concurrentExisting = await findStockRecordByIdempotencyKey(
        recordedBy,
        validIdempotencyKey,
      );

      if (
        !concurrentExisting ||
        concurrentExisting.idempotency_request_hash !== idempotencyRequestHash
      ) {
        const conflictError = new Error(
          "Idempotency key has already been used for a different stock request",
        );
        conflictError.statusCode = 409;
        throw conflictError;
      }

      const currentStock = Number(
        await getCurrentStock(concurrentExisting.inventory_item_id),
      );

      return {
        stockRecord: {
          ...mapStockRecord(concurrentExisting),
          currentStock,
        },
        isReplay: true,
      };
    }

    throw error;
  } finally {
    client.release();
  }
}

async function getInventoryItemStockRecordsService(inventoryItemId) {
  const validInventoryItemId = validateInventoryItemId(inventoryItemId);

  const inventoryItem = await findInventoryItemById(validInventoryItemId);

  if (!inventoryItem) {
    const error = new Error("Inventory item not found");
    error.statusCode = 404;
    throw error;
  }

  const stockRecords =
    await findStockRecordsByInventoryItemId(validInventoryItemId);
  return stockRecords.map(mapStockRecord);
}

export {
  createInventoryItemService,
  getInventoryItemService,
  getInventoryItemsService,
  updateInventoryItemService,
  deactivateInventoryItemService,
  reactivateInventoryItemService,
  createStockRecordService,
  getInventoryItemStockRecordsService,
};
