import express from "express";
const router = express.Router();

import {
  createUserController,
  getActiveStaffController,
} from "./user.controller.js";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.js";

router.get(
  "/staff",
  authenticate,
  authorizeRoles("ADMIN", "VOLUNTEER", "CARETAKER"),
  getActiveStaffController,
);

router.post("/", authenticate, authorizeRoles("ADMIN"), createUserController);

export default router;
