import {
  createExpenseService,
  getExpensesService,
  getExpenseByIdService,
  voidExpenseService,
  createExpenseAmountCorrectionService,
  getExpenseAmountCorrectionsService,
} from "../services/expense.service.js";

async function createExpenseController(req, res, next) {
  try {
    const idempotencyKey = req.get("Idempotency-Key");

    const { expense, isReplay } = await createExpenseService(
      req.body,
      req.user.userId,
      idempotencyKey,
    );

    res.status(isReplay ? 200 : 201).json({
      success: true,
      expense,
      isReplay,
    });
  } catch (error) {
    next(error);
  }
}

async function getExpensesController(req, res, next) {
  try {
    const result = await getExpensesService(req.query);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

async function getExpenseByIdController(req, res, next) {
  try {
    const expense = await getExpenseByIdService(req.params.expenseId);

    res.status(200).json({
      success: true,
      expense,
    });
  } catch (error) {
    next(error);
  }
}

async function voidExpenseController(req, res, next) {
  try {
    const expense = await voidExpenseService(
      req.params.expenseId,
      req.body,
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      expense,
    });
  } catch (error) {
    next(error);
  }
}

async function createExpenseAmountCorrectionController(req, res, next) {
  try {
    const idempotencyKey = req.get("Idempotency-Key");

    const result = await createExpenseAmountCorrectionService(
      req.params.expenseId,
      req.body,
      req.user.userId,
      idempotencyKey,
    );

    return res.status(result.isReplay ? 200 : 201).json({
      success: true,
      message: result.isReplay
        ? "Expense amount correction replayed successfully"
        : "Expense amount corrected successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getExpenseAmountCorrectionsController(req, res, next) {
  try {
    const corrections = await getExpenseAmountCorrectionsService(
      req.params.expenseId,
    );

    return res.status(200).json({
      success: true,
      data: corrections,
    });
  } catch (error) {
    next(error);
  }
}

export {
  createExpenseController,
  getExpensesController,
  getExpenseByIdController,
  voidExpenseController,
  createExpenseAmountCorrectionController,
  getExpenseAmountCorrectionsController,
};
