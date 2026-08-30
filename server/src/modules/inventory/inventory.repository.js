import pool from "../../config/db.js";

async function findInventoryItemById(inventoryItemId, db = pool) {
  const result = await db.query(
    `
      SELECT
        i.inventory_item_id,
        i.item_name,
        i.variant,
        i.item_type,
        i.category,
        i.package_size::text AS package_size,
        i.package_size_unit,
        i.unit,
        i.is_active,
        i.created_by,
        i.updated_by,
        i.created_at,
        i.updated_at,

        COALESCE(
          (
            SELECT SUM(
              CASE
                WHEN sr.record_type = 'RECEIVED'
                  THEN sr.quantity

                WHEN sr.record_type = 'USED'
                  THEN -sr.quantity

                WHEN sr.record_type = 'ADJUSTMENT'
                  AND sr.adjustment_direction = 'ADD'
                  THEN sr.quantity

                WHEN sr.record_type = 'ADJUSTMENT'
                  AND sr.adjustment_direction = 'REMOVE'
                  THEN -sr.quantity

                ELSE 0
              END
            )
            FROM inventory_stock_records sr
            WHERE sr.inventory_item_id = i.inventory_item_id
          ),
          0
        )::text AS current_stock

      FROM inventory_items i
      WHERE i.inventory_item_id = $1
    `,
    [inventoryItemId],
  );

  return result.rows[0] || null;
}

async function findInventoryItemByIdForUpdate(inventoryItemId, db = pool) {
  const result = await db.query(
    `
      SELECT
        inventory_item_id,
        item_name,
        variant,
        item_type,
        category,
        package_size::text AS package_size,
        package_size_unit,
        unit,
        is_active,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM inventory_items
      WHERE inventory_item_id = $1
      FOR UPDATE
    `,
    [inventoryItemId],
  );

  return result.rows[0] || null;
}

async function findInventoryItems(db = pool) {
  const result = await db.query(
    `
      SELECT
        i.inventory_item_id,
        i.item_name,
        i.variant,
        i.item_type,
        i.category,
        i.package_size::text AS package_size,
        i.package_size_unit,
        i.unit,
        i.is_active,
        i.created_by,
        i.updated_by,
        i.created_at,
        i.updated_at,

        COALESCE(
          (
            SELECT SUM(
              CASE
                WHEN sr.record_type = 'RECEIVED'
                  THEN sr.quantity

                WHEN sr.record_type = 'USED'
                  THEN -sr.quantity

                WHEN sr.record_type = 'ADJUSTMENT'
                  AND sr.adjustment_direction = 'ADD'
                  THEN sr.quantity

                WHEN sr.record_type = 'ADJUSTMENT'
                  AND sr.adjustment_direction = 'REMOVE'
                  THEN -sr.quantity

                ELSE 0
              END
            )
            FROM inventory_stock_records sr
            WHERE sr.inventory_item_id = i.inventory_item_id
          ),
          0
        )::text AS current_stock

      FROM inventory_items i
      ORDER BY
        i.is_active DESC,
        i.item_name ASC,
        i.variant ASC NULLS FIRST,
        i.created_at ASC
    `,
  );

  return result.rows;
}

async function findDuplicateInventoryItem(
  data,
  excludedInventoryItemId = null,
  db = pool,
) {
  const { itemName, variant, packageSize, packageSizeUnit, unit } = data;

  const result = await db.query(
    `
      SELECT
        inventory_item_id
      FROM inventory_items
      WHERE LOWER(item_name) = LOWER($1)

        AND LOWER(COALESCE(variant, '')) =
            LOWER(COALESCE($2, ''))

        AND package_size IS NOT DISTINCT FROM $3::numeric

        AND package_size_unit IS NOT DISTINCT FROM $4

        AND unit = $5

        AND (
          $6::uuid IS NULL
          OR inventory_item_id <> $6::uuid
        )

      LIMIT 1
    `,
    [
      itemName,
      variant,
      packageSize,
      packageSizeUnit,
      unit,
      excludedInventoryItemId,
    ],
  );

  return result.rows[0] || null;
}

async function insertInventoryItem(data, db = pool) {
  const {
    itemName,
    variant,
    itemType,
    category,
    packageSize,
    packageSizeUnit,
    unit,
    createdBy,
  } = data;

  const result = await db.query(
    `
      INSERT INTO inventory_items (
        item_name,
        variant,
        item_type,
        category,
        package_size,
        package_size_unit,
        unit,
        created_by,
        updated_by
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $8
      )
      RETURNING
        inventory_item_id,
        item_name,
        variant,
        item_type,
        category,
        package_size::text AS package_size,
        package_size_unit,
        unit,
        is_active,
        created_by,
        updated_by,
        created_at,
        updated_at
    `,
    [
      itemName,
      variant,
      itemType,
      category,
      packageSize,
      packageSizeUnit,
      unit,
      createdBy,
    ],
  );

  return result.rows[0];
}

async function updateInventoryItem(
  inventoryItemId,
  updates,
  updatedBy,
  db = pool,
) {
  const fields = [];
  const values = [];

  let index = 1;

  if (Object.prototype.hasOwnProperty.call(updates, "itemName")) {
    fields.push(`item_name = $${index}`);
    values.push(updates.itemName);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "variant")) {
    fields.push(`variant = $${index}`);
    values.push(updates.variant);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "itemType")) {
    fields.push(`item_type = $${index}`);
    values.push(updates.itemType);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "category")) {
    fields.push(`category = $${index}`);
    values.push(updates.category);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "packageSize")) {
    fields.push(`package_size = $${index}`);
    values.push(updates.packageSize);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "packageSizeUnit")) {
    fields.push(`package_size_unit = $${index}`);
    values.push(updates.packageSizeUnit);
    index++;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "unit")) {
    fields.push(`unit = $${index}`);
    values.push(updates.unit);
    index++;
  }

  fields.push(`updated_by = $${index}`);
  values.push(updatedBy);
  index++;

  fields.push("updated_at = CURRENT_TIMESTAMP");

  values.push(inventoryItemId);

  const result = await db.query(
    `
      UPDATE inventory_items
      SET ${fields.join(", ")}
      WHERE inventory_item_id = $${index}
      RETURNING
        inventory_item_id,
        item_name,
        variant,
        item_type,
        category,
        package_size::text AS package_size,
        package_size_unit,
        unit,
        is_active,
        created_by,
        updated_by,
        created_at,
        updated_at
    `,
    values,
  );

  return result.rows[0] || null;
}

async function setInventoryItemActiveStatus(
  inventoryItemId,
  isActive,
  updatedBy,
  db = pool,
) {
  const result = await db.query(
    `
      UPDATE inventory_items
      SET
        is_active = $1,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE inventory_item_id = $3
      RETURNING
        inventory_item_id,
        item_name,
        variant,
        item_type,
        category,
        package_size::text AS package_size,
        package_size_unit,
        unit,
        is_active,
        created_by,
        updated_by,
        created_at,
        updated_at
    `,
    [isActive, updatedBy, inventoryItemId],
  );

  return result.rows[0] || null;
}

async function findStockRecordByIdempotencyKey(
  recordedBy,
  idempotencyKey,
  db = pool,
) {
  const result = await db.query(
    `
      SELECT
        stock_record_id,
        inventory_item_id,
        record_type,
        quantity::text AS quantity,
        adjustment_direction,
        estimated_level,
        stock_status,
        notes,
        recorded_by,
        created_at,
        idempotency_key,
        idempotency_request_hash
      FROM inventory_stock_records
      WHERE recorded_by = $1
        AND idempotency_key = $2
      LIMIT 1
    `,
    [recordedBy, idempotencyKey],
  );

  return result.rows[0] || null;
}

async function hasInventoryStockRecords(inventoryItemId, db = pool) {
  const result = await db.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM inventory_stock_records
        WHERE inventory_item_id = $1
      ) AS has_stock_records
    `,
    [inventoryItemId],
  );

  return result.rows[0].has_stock_records;
}

async function getCurrentStock(inventoryItemId, db = pool) {
  const result = await db.query(
    `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN record_type = 'RECEIVED'
                THEN quantity

              WHEN record_type = 'USED'
                THEN -quantity

              WHEN record_type = 'ADJUSTMENT'
                AND adjustment_direction = 'ADD'
                THEN quantity

              WHEN record_type = 'ADJUSTMENT'
                AND adjustment_direction = 'REMOVE'
                THEN -quantity

              ELSE 0
            END
          ),
          0
        )::text AS current_stock

      FROM inventory_stock_records
      WHERE inventory_item_id = $1
    `,
    [inventoryItemId],
  );

  return result.rows[0].current_stock;
}

async function insertStockRecord(data, db = pool) {
  const {
    inventoryItemId,
    recordType,
    quantity,
    adjustmentDirection,
    estimatedLevel,
    stockStatus,
    notes,
    recordedBy,
    idempotencyKey,
    idempotencyRequestHash,
  } = data;

  const result = await db.query(
    `
      INSERT INTO inventory_stock_records (
        inventory_item_id,
        record_type,
        quantity,
        adjustment_direction,
        estimated_level,
        stock_status,
        notes,
        recorded_by,
        idempotency_key,
        idempotency_request_hash
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10
      )
      RETURNING
        stock_record_id,
        inventory_item_id,
        record_type,
        quantity::text AS quantity,
        adjustment_direction,
        estimated_level,
        stock_status,
        notes,
        recorded_by,
        created_at,
        idempotency_key,
        idempotency_request_hash
    `,
    [
      inventoryItemId,
      recordType,
      quantity,
      adjustmentDirection,
      estimatedLevel,
      stockStatus,
      notes,
      recordedBy,
      idempotencyKey,
      idempotencyRequestHash,
    ],
  );

  return result.rows[0];
}

async function findStockRecordsByInventoryItemId(inventoryItemId, db = pool) {
  const result = await db.query(
    `
      SELECT
        stock_record_id,
        inventory_item_id,
        record_type,
        quantity::text AS quantity,
        adjustment_direction,
        estimated_level,
        stock_status,
        notes,
        recorded_by,
        created_at
      FROM inventory_stock_records
      WHERE inventory_item_id = $1
      ORDER BY created_at DESC
    `,
    [inventoryItemId],
  );

  return result.rows;
}

export {
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
  findStockRecordByIdempotencyKey
};
