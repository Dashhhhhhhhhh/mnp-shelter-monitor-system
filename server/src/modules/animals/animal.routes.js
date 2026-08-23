import express from "express";

import {
  createAnimalController,
  getAnimalsController,
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
export default router;
