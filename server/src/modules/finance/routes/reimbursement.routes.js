import express from "express";

import {
  createPersonalAdvanceReimbursement,
  createReimbursementReversal,
  createReimbursementReversalCorrection,
  getReimbursementsByAllocationId,
  getReimbursementReversalsByReimbursementId,
  getReimbursementReversalCorrectionsByReversalId,
  getPersonalAdvanceReimbursementSummary,
} from "../controllers/reimbursement.controller.js";

const router = express.Router();

router.post(
  "/funding-allocations/:allocationId/reimbursements",
  createPersonalAdvanceReimbursement,
);

router.post(
  "/reimbursements/:reimbursementId/reversals",
  createReimbursementReversal,
);

router.post(
  "/reimbursement-reversals/:reversalId/corrections",
  createReimbursementReversalCorrection,
);

router.get(
  "/funding-allocations/:allocationId/reimbursements",
  getReimbursementsByAllocationId,
);

router.get(
  "/reimbursements/:reimbursementId/reversals",
  getReimbursementReversalsByReimbursementId,
);

router.get(
  "/reimbursement-reversals/:reversalId/corrections",
  getReimbursementReversalCorrectionsByReversalId,
);

router.get(
  "/funding-allocations/:allocationId/reimbursement-summary",
  getPersonalAdvanceReimbursementSummary,
);

export default router;
