import express from "express";

import {
  createAnimalIntakeController,
  getAnimalIntakesController,
} from "./intake.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.js";

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

export default router;
