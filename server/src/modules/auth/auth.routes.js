import express from "express";
import { login, getMe, logout } from "./auth.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.js";

const router = express.Router();

router.post("/login", login);

router.get("/me", authenticate, getMe);

router.post("/logout", authenticate, logout);



export default router;
