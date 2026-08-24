import express from "express";

import {
  createAnimalIntakeController,
  getAnimalIntakesController,
  getIntakeByIdController,
  updateIntakeController,
} from "./intake.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.js";
import { findIntakeById } from "./intake.repository.js";
import { updateIntake } from "./intake.service.js";

const router = express.Router({ mergeParams: true });

router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "VOLUNTEER"),
  createAnimalIntakeController,
);

router.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getAnimalIntakesController,
);

router.get(
  "/:intakeId",
  authenticate,
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getIntakeByIdController,
);

router.patch(
  "/:intakeId",
  authenticate,
  authorizeRoles("ADMIN", "VOLUNTEER"),
  updateIntakeController,
);
export default router;
