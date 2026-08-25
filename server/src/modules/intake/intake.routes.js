import express from "express";

import {
  createAnimalIntakeController,
  getAnimalIntakesController,
  getIntakeByIdController,
  updateIntakeController,
} from "./intake.controller.js";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.js";

const animalIntakeRouter = express.Router({
  mergeParams: true,
});

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

animalIntakeRouter.get(
  "/:intakeId",
  authenticate,
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getIntakeByIdController,
);

animalIntakeRouter.patch(
  "/:intakeId",
  authenticate,
  authorizeRoles("ADMIN", "VOLUNTEER"),
  updateIntakeController,
);

export { animalIntakeRouter };
