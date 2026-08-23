import express from "express";

import {
  createAnimalController,
  getAnimalsController,
  getAnimalByIdController,
} from "./animal.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "VOLUNTEER"),
  createAnimalController,
);

router.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getAnimalsController,
);

router.get(
  "/:animalId",
  authenticate,
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getAnimalByIdController,
);
export default router;
