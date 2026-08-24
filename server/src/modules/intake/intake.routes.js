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

const animalIntakeRouter = express.Router({ mergeParams: true });
const intakeRouter = express.Router();

animalIntakeRouter.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "VOLUNTEER"),
  createAnimalIntakeController,
);

animalIntakeRouter.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getAnimalIntakesController,
);

intakeRouter.get(
  "/:intakeId",
  authenticate,
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getIntakeByIdController,
);

intakeRouter.patch(
  "/:intakeId",
  authenticate,
  authorizeRoles("ADMIN", "VOLUNTEER"),
  updateIntakeController,
);
export { animalIntakeRouter, intakeRouter };
