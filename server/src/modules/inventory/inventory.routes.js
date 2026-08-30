import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.js";

import {
  createInventoryItem,
  getInventoryItem,
  getInventoryItems,
  updateInventoryItem,
  deactivateInventoryItem,
  reactivateInventoryItem,
  createStockRecord,
  getInventoryItemStockRecords,
} from "./inventory.controller.js";

const router = Router();

router.use(authenticate);

router.post(
  "/inventory/items",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  createInventoryItem,
);

router.get(
  "/inventory/items",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getInventoryItems,
);

router.get(
  "/inventory/items/:inventoryItemId",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getInventoryItem,
);

router.patch(
  "/inventory/items/:inventoryItemId",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  updateInventoryItem,
);

router.post(
  "/inventory/items/:inventoryItemId/deactivate",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  deactivateInventoryItem,
);

router.post(
  "/inventory/items/:inventoryItemId/reactivate",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  reactivateInventoryItem,
);

router.post(
  "/inventory/items/:inventoryItemId/stock-records",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  createStockRecord,
);

router.get(
  "/inventory/items/:inventoryItemId/stock-records",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getInventoryItemStockRecords,
);

export default router;
