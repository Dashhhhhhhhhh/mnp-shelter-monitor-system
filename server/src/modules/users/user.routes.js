import express from "express";
import { createUserController } from "./user.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.js";

const router = express.Router();

router.post("/", authenticate, authorizeRoles("ADMIN"), createUserController);

export default router;
