import express from "express";

import {
  createCageController,
  getCagesController,
  getCageByIdController,
  updateCageController,
} from "./cage.controller.js";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.js";

const router = express.Router();

router.use(authenticate);

router.post("/", authorizeRoles("ADMIN", "VOLUNTEER"), createCageController);

router.get(
  "/",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getCagesController,
);

router.get(
  "/:cageId",
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getCageByIdController,
);

router.patch(
  "/:cageId",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  updateCageController,
);

export default router;
