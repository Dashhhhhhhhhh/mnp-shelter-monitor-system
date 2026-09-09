import express from "express";

import {
  createExpenseFundingAllocationController,
  getExpenseFundingAllocationByIdController,
  getExpenseFundingAllocationsByExpenseIdController,
  voidExpenseFundingAllocationController,
  correctExpenseFundingAllocation,
  getFundingAllocationCorrections,
} from "../controllers/expenseFunding.controller.js";

import { authenticate } from "../../../middlewares/authenticate.js";

import { authorizeRoles } from "../../../middlewares/authorizeRoles.js";
const router = express.Router();

router.use(authenticate);

router.post(
  "/:expenseId/funding-allocations",
  authorizeRoles("ADMIN"),
  createExpenseFundingAllocationController,
);

router.get(
  "/funding-allocations/:allocationId",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  getExpenseFundingAllocationByIdController,
);

router.get(
  "/:expenseId/funding-allocations",
  authorizeRoles("ADMIN", "VOLUNTEER"),
  getExpenseFundingAllocationsByExpenseIdController,
);

router.post(
  "/funding-allocations/:allocationId/void",
  authorizeRoles("ADMIN"),
  voidExpenseFundingAllocationController,
);

router.post(
  "/funding-allocations/:allocationId/corrections",
  correctExpenseFundingAllocation,
);

router.get(
  "/funding-allocations/:allocationId/corrections",
  getFundingAllocationCorrections,
);
export default router;
