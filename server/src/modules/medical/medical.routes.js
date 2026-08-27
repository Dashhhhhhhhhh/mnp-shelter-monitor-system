import express from "express";

import { authenticate } from "../../middlewares/authenticate.js";

import { authorizeRoles } from "../../middlewares/authorizeRoles.js";

import {
  createMedicalRecordController,
  getMedicalRecordsController,
  getMedicalRecordByIdController,
  getAnimalMedicalRecordsController,
  updateMedicalRecordController,
} from "./medical.controller.js";

const router = express.Router();

router.use(authenticate);

router.post(
  "/medical-records",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  createMedicalRecordController,
);

router.get(
  "/medical-records",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getMedicalRecordsController,
);

router.get(
  "/medical-records/:medicalRecordId",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getMedicalRecordByIdController,
);

router.patch(
  "/medical-records/:medicalRecordId",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  updateMedicalRecordController,
);

router.get(
  "/animals/:animalId/medical-records",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getAnimalMedicalRecordsController,
);

export default router;
