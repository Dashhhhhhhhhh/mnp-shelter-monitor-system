import express from "express";

import {
  createExpenseController,
  getExpensesController,
  getExpenseByIdController,
  voidExpenseController,
  createExpenseAmountCorrectionController,
  getExpenseAmountCorrectionsController,
} from "../controllers/expense.controller.js";

import { authenticate } from "../../../middlewares/authenticate.js";
import { authorizeRoles } from "../../../middlewares/authorizeRoles.js";

const router = express.Router();

router.use(authenticate);

router.post("/", authorizeRoles("ADMIN", "VOLUNTEER"), createExpenseController);

router.get("/", authorizeRoles("ADMIN", "VOLUNTEER"), getExpensesController);

router.get(
  "/:expenseId",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  getExpenseByIdController,
);

router.post("/:expenseId/void", authorizeRoles("ADMIN"), voidExpenseController);

router.post(
  "/:expenseId/amount-corrections",
  authorizeRoles("ADMIN"),
  createExpenseAmountCorrectionController,
);

router.get(
  "/:expenseId/amount-corrections",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  getExpenseAmountCorrectionsController,
);
export default router;
