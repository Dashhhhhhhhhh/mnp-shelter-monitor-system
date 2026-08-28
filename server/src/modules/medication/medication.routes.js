import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.js";

import {
  createMedication,
  getMedication,
  getMedications,
  getAnimalMedications,
  updateMedication,
  completeMedication,
  discontinueMedication,
} from "./medication.controller.js";

const router = Router();

router.use(authenticate);

router.post(
  "/medications",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  createMedication,
);

router.get(
  "/medications",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getMedications,
);

router.get(
  "/medications/:medicationId",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getMedication,
);

router.get(
  "/animals/:animalId/medications",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getAnimalMedications,
);

router.patch(
  "/medications/:medicationId",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  updateMedication,
);

router.post(
  "/medications/:medicationId/complete",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  completeMedication,
);

router.post(
  "/medications/:medicationId/discontinue",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  discontinueMedication,
);

export default router;
