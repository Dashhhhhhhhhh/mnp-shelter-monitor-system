import {
  createPersonalAdvanceReimbursementService,
  createReimbursementReversalService,
  createReimbursementReversalCorrectionService,
  getReimbursementsByAllocationIdService,
  getReimbursementReversalsByReimbursementIdService,
  getReimbursementReversalCorrectionsByReversalIdService,
  getPersonalAdvanceReimbursementSummaryService,
} from "../services/reimbursement.service.js";

async function createPersonalAdvanceReimbursement(req, res, next) {
  try {
    const { allocationId } = req.params;

    const createdBy = req.user.userId;

    const idempotencyKey = req.headers["idempotency-key"];

    const result = await createPersonalAdvanceReimbursementService(
      allocationId,
      req.body,
      createdBy,
      idempotencyKey,
    );

    return res.status(result.isReplay ? 200 : 201).json({
      success: true,
      message: result.isReplay
        ? "Reimbursement replayed successfully"
        : "Reimbursement created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
async function createReimbursementReversal(req, res, next) {
  try {
    const { reimbursementId } = req.params;

    const createdBy = req.user.userId;

    const idempotencyKey = req.headers["idempotency-key"];

    const result = await createReimbursementReversalService(
      reimbursementId,
      req.body,
      createdBy,
      idempotencyKey,
    );

    return res.status(result.isReplay ? 200 : 201).json({
      success: true,
      message: result.isReplay
        ? "Reimbursement reversal replayed successfully"
        : "Reimbursement reversal created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function createReimbursementReversalCorrection(req, res, next) {
  try {
    const { reversalId } = req.params;

    const createdBy = req.user.userId;

    const idempotencyKey = req.headers["idempotency-key"];

    const result = await createReimbursementReversalCorrectionService(
      reversalId,
      req.body,
      createdBy,
      idempotencyKey,
    );

    return res.status(result.isReplay ? 200 : 201).json({
      success: true,
      message: result.isReplay
        ? "Reimbursement reversal correction replayed successfully"
        : "Reimbursement reversal correction created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getReimbursementsByAllocationId(req, res, next) {
  try {
    const { allocationId } = req.params;

    const reimbursements =
      await getReimbursementsByAllocationIdService(allocationId);

    return res.status(200).json({
      success: true,
      data: reimbursements,
    });
  } catch (error) {
    next(error);
  }
}

async function getReimbursementReversalsByReimbursementId(req, res, next) {
  try {
    const { reimbursementId } = req.params;

    const reversals =
      await getReimbursementReversalsByReimbursementIdService(reimbursementId);

    return res.status(200).json({
      success: true,
      data: reversals,
    });
  } catch (error) {
    next(error);
  }
}

async function getReimbursementReversalCorrectionsByReversalId(req, res, next) {
  try {
    const { reversalId } = req.params;

    const corrections =
      await getReimbursementReversalCorrectionsByReversalIdService(reversalId);

    return res.status(200).json({
      success: true,
      data: corrections,
    });
  } catch (error) {
    next(error);
  }
}

async function getPersonalAdvanceReimbursementSummary(req, res, next) {
  try {
    const { allocationId } = req.params;

    const summary =
      await getPersonalAdvanceReimbursementSummaryService(allocationId);

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

export {
  createPersonalAdvanceReimbursement,
  createReimbursementReversal,
  createReimbursementReversalCorrection,
  getReimbursementsByAllocationId,
  getReimbursementReversalsByReimbursementId,
  getReimbursementReversalCorrectionsByReversalId,
  getPersonalAdvanceReimbursementSummary,
};
