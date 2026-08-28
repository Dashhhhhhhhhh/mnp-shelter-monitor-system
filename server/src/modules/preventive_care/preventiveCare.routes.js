import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.js";

import {
  createPreventiveCare,
  getPreventiveCare,
  getPreventiveCareRecords,
  getAnimalPreventiveCare,
  updatePreventiveCare,
} from "./preventiveCare.controller.js";

const router = Router();

router.use(authenticate);

router.post(
  "/preventive-care",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  createPreventiveCare,
);

router.get(
  "/preventive-care",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getPreventiveCareRecords,
);

router.get(
  "/preventive-care/:preventiveCareId",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getPreventiveCare,
);

router.get(
  "/animals/:animalId/preventive-care",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getAnimalPreventiveCare,
);

router.patch(
  "/preventive-care/:preventiveCareId",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  updatePreventiveCare,
);

export default router;
