import {
  createInventoryItemService,
  getInventoryItemService,
  getInventoryItemsService,
  updateInventoryItemService,
  deactivateInventoryItemService,
  reactivateInventoryItemService,
  createStockRecordService,
  getInventoryItemStockRecordsService,
} from "./inventory.service.js";

async function createInventoryItem(req, res, next) {
  try {
    const inventoryItem = await createInventoryItemService(
      req.body,
      req.user.userId,
    );

    res.status(201).json({
      success: true,
      inventoryItem,
    });
  } catch (error) {
    next(error);
  }
}

async function getInventoryItem(req, res, next) {
  try {
    const inventoryItem = await getInventoryItemService(
      req.params.inventoryItemId,
    );

    res.status(200).json({
      success: true,
      inventoryItem,
    });
  } catch (error) {
    next(error);
  }
}

async function getInventoryItems(req, res, next) {
  try {
    const inventoryItems = await getInventoryItemsService();

    res.status(200).json({
      success: true,
      inventoryItems,
    });
  } catch (error) {
    next(error);
  }
}

async function updateInventoryItem(req, res, next) {
  try {
    const inventoryItem = await updateInventoryItemService(
      req.params.inventoryItemId,
      req.body,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      inventoryItem,
    });
  } catch (error) {
    next(error);
  }
}

async function deactivateInventoryItem(req, res, next) {
  try {
    const inventoryItem = await deactivateInventoryItemService(
      req.params.inventoryItemId,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      inventoryItem,
    });
  } catch (error) {
    next(error);
  }
}

async function reactivateInventoryItem(req, res, next) {
  try {
    const inventoryItem = await reactivateInventoryItemService(
      req.params.inventoryItemId,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      inventoryItem,
    });
  } catch (error) {
    next(error);
  }
}

async function createStockRecord(req, res, next) {
  try {
    const idempotencyKey = req.get("Idempotency-Key");

    const { stockRecord, isReplay } = await createStockRecordService(
      req.params.inventoryItemId,
      req.body,
      req.user.userId,
      req.user.role,
      idempotencyKey,
    );

    res.status(isReplay ? 200 : 201).json({
      success: true,
      stockRecord,
      isReplay,
    });
  } catch (error) {
    next(error);
  }
}
async function getInventoryItemStockRecords(req, res, next) {
  try {
    const stockRecords = await getInventoryItemStockRecordsService(
      req.params.inventoryItemId,
    );

    res.status(200).json({
      success: true,
      stockRecords,
    });
  } catch (error) {
    next(error);
  }
}

export {
  createInventoryItem,
  getInventoryItem,
  getInventoryItems,
  updateInventoryItem,
  deactivateInventoryItem,
  reactivateInventoryItem,
  createStockRecord,
  getInventoryItemStockRecords,
};
