import {
  validateMoneyAmount,
  validateEnum,
  validateOptionalText,
  validateDateTime,
} from "./finance.validation.utils.js";

const PAYMENT_METHODS = ["CASH", "E_WALLET", "BANK_TRANSFER", "OTHER"];

function validateCreateReimbursementInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Reimbursement data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const reimbursementAmount = validateMoneyAmount(
    data.reimbursementAmount,
    "Reimbursement amount",
  );

  const reimbursedAt = validateDateTime(data.reimbursedAt, "Reimbursed at");

  const paymentMethod = validateEnum(
    data.paymentMethod,
    "Payment method",
    PAYMENT_METHODS,
  );

  const paymentProvider = validateOptionalText(
    data.paymentProvider,
    "Payment provider",
  );

  const referenceNumber = validateOptionalText(
    data.referenceNumber,
    "Reference number",
  );

  const notes = validateOptionalText(data.notes, "Notes");

  return {
    reimbursementAmount,
    reimbursedAt,
    paymentMethod,
    paymentProvider,
    referenceNumber,
    notes,
  };
}

function validateCreateReimbursementReversalInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Reimbursement reversal data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const reversalAmount = validateMoneyAmount(
    data.reversalAmount,
    "Reversal amount",
  );

  if (typeof data.reversalReason !== "string" || !data.reversalReason.trim()) {
    const error = new Error("Reversal reason is required");
    error.statusCode = 400;
    throw error;
  }

  return {
    reversalAmount,
    reversalReason: data.reversalReason.trim(),
  };
}

function validateCreateReimbursementReversalCorrectionInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error(
      "Reimbursement reversal correction data must be an object",
    );
    error.statusCode = 400;
    throw error;
  }

  const correctionAmount = validateMoneyAmount(
    data.correctionAmount,
    "Correction amount",
  );

  if (
    typeof data.correctionReason !== "string" ||
    !data.correctionReason.trim()
  ) {
    const error = new Error("Correction reason is required");
    error.statusCode = 400;
    throw error;
  }

  return {
    correctionAmount,
    correctionReason: data.correctionReason.trim(),
  };
}

export {
  validateCreateReimbursementInput,
  validateCreateReimbursementReversalInput,
  validateCreateReimbursementReversalCorrectionInput,
};
