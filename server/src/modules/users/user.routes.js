import express from "express";
const router = express.Router();

import { createUserController } from "./user.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.js";

router.post("/", authenticate, authorizeRoles("ADMIN"), createUserController);

export default router;
