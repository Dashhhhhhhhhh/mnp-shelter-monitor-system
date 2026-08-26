import express from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.js";

import {
  createCareRecordController,
  completeCareController,
  getCareRecordsByDateController,
  getCareRecordsForCageController,
} from "./careRecord.controller.js";

const router = express.Router();

router.use(authenticate);

router.post(
  "/care-records",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  createCareRecordController,
);

router.get(
  "/care-records",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getCareRecordsByDateController,
);

router.post(
  "/care-records/:careRecordId/complete",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  completeCareController,
);

router.get(
  "/cages/:cageId/care-records",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getCareRecordsForCageController,
);

export default router;
