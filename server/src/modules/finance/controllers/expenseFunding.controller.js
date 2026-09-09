import {
  createExpenseFundingAllocationService,
  getExpenseFundingAllocationByIdService,
  getExpenseFundingAllocationsByExpenseIdService,
  voidExpenseFundingAllocationService,
  correctExpenseFundingAllocationService,
  getFundingAllocationCorrectionsService,
} from "../services/expenseFunding.service.js";

async function createExpenseFundingAllocationController(req, res, next) {
  try {
    const idempotencyKey = req.get("Idempotency-Key");

    const result = await createExpenseFundingAllocationService(
      req.params.expenseId,
      req.body,
      req.user.userId,
      idempotencyKey,
    );

    return res.status(result.isReplay ? 200 : 201).json({
      success: true,
      message: result.isReplay
        ? "Expense funding allocation replayed successfully"
        : "Expense funding allocation created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getExpenseFundingAllocationByIdController(req, res, next) {
  try {
    const allocation = await getExpenseFundingAllocationByIdService(
      req.params.allocationId,
    );

    return res.status(200).json({
      success: true,
      data: allocation,
    });
  } catch (error) {
    next(error);
  }
}

async function getExpenseFundingAllocationsByExpenseIdController(
  req,
  res,
  next,
) {
  try {
    const allocations = await getExpenseFundingAllocationsByExpenseIdService(
      req.params.expenseId,
    );

    return res.status(200).json({
      success: true,
      data: allocations,
    });
  } catch (error) {
    next(error);
  }
}

async function voidExpenseFundingAllocationController(req, res, next) {
  try {
    const allocation = await voidExpenseFundingAllocationService(
      req.params.allocationId,
      req.body,
      req.user.userId,
    );

    return res.status(200).json({
      success: true,
      message: "Expense funding allocation voided successfully",
      data: allocation,
    });
  } catch (error) {
    next(error);
  }
}

async function correctExpenseFundingAllocation(req, res, next) {
  try {
    const { allocationId } = req.params;

    const correctedBy = req.user.userId;

    const idempotencyKey = req.headers["idempotency-key"];

    const result = await correctExpenseFundingAllocationService(
      allocationId,
      req.body,
      correctedBy,
      idempotencyKey,
    );

    return res.status(result.isReplay ? 200 : 201).json({
      message: result.isReplay
        ? "Funding allocation correction replayed"
        : "Funding allocation corrected successfully",

      correction: result.correction,
      allocation: result.allocation,
    });
  } catch (error) {
    next(error);
  }
}

async function getFundingAllocationCorrections(req, res, next) {
  try {
    const { allocationId } = req.params;

    const corrections =
      await getFundingAllocationCorrectionsService(allocationId);

    return res.status(200).json({
      success: true,
      data: corrections,
    });
  } catch (error) {
    next(error);
  }
}

export {
  createExpenseFundingAllocationController,
  getExpenseFundingAllocationByIdController,
  getExpenseFundingAllocationsByExpenseIdController,
  voidExpenseFundingAllocationController,
  correctExpenseFundingAllocation,
  getFundingAllocationCorrections,
};
