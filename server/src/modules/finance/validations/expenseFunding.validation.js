import {
  validateEnum,
  validateMoneyAmount,
  validateUuid,
  validateOptionalUuid,
  validateOptionalText,
  validateDateTime,
} from "./finance.validation.utils.js";

const FUNDING_TYPES = [
  "SHELTER_FUNDS",
  "PERSONAL_ADVANCE",
  "PERSONAL_CONTRIBUTION",
  "DIRECT_PAYMENT",
];

const PAYMENT_METHODS = ["CASH", "E_WALLET", "BANK_TRANSFER", "OTHER"];

function validateCreateExpenseFundingInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Expense funding data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const fundingType = validateEnum(
    data.fundingType,
    "Funding type",
    FUNDING_TYPES,
  );

  const allocationAmount = validateMoneyAmount(
    data.allocationAmount,
    "Allocation amount",
  );

  const fundedAt = validateDateTime(data.fundedAt, "Funded at");

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

  const advancedByUserId = validateOptionalUuid(
    data.advancedByUserId,
    "Advanced by user ID",
  );

  const contributedByUserId = validateOptionalUuid(
    data.contributedByUserId,
    "Contributed by user ID",
  );

  const directPaidByUserId = validateOptionalUuid(
    data.directPaidByUserId,
    "Direct paid by user ID",
  );

  const outsidePayerName = validateOptionalText(
    data.outsidePayerName,
    "Outside payer name",
  );

  if (fundingType === "SHELTER_FUNDS") {
    if (
      advancedByUserId ||
      contributedByUserId ||
      directPaidByUserId ||
      outsidePayerName
    ) {
      const error = new Error(
        "Shelter funds cannot have a personal payer identity",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  if (fundingType === "PERSONAL_ADVANCE") {
    if (!advancedByUserId) {
      const error = new Error(
        "Advanced by user ID is required for personal advance",
      );
      error.statusCode = 400;
      throw error;
    }

    if (contributedByUserId || directPaidByUserId || outsidePayerName) {
      const error = new Error("Personal advance contains invalid payer fields");
      error.statusCode = 400;
      throw error;
    }
  }

  if (fundingType === "PERSONAL_CONTRIBUTION") {
    if (!contributedByUserId) {
      const error = new Error(
        "Contributed by user ID is required for personal contribution",
      );
      error.statusCode = 400;
      throw error;
    }

    if (advancedByUserId || directPaidByUserId || outsidePayerName) {
      const error = new Error(
        "Personal contribution contains invalid payer fields",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  if (fundingType === "DIRECT_PAYMENT") {
    if (advancedByUserId || contributedByUserId) {
      const error = new Error(
        "Direct payment contains invalid personal funding fields",
      );
      error.statusCode = 400;
      throw error;
    }

    const hasRegisteredPayer = directPaidByUserId !== null;
    const hasOutsidePayer = outsidePayerName !== null;

    if (hasRegisteredPayer === hasOutsidePayer) {
      const error = new Error(
        "Direct payment requires exactly one payer: directPaidByUserId or outsidePayerName",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  return {
    fundingType,
    allocationAmount,
    fundedAt,
    paymentMethod,
    paymentProvider,
    referenceNumber,
    advancedByUserId,
    contributedByUserId,
    directPaidByUserId,
    outsidePayerName,
    notes,
  };
}

function validateVoidExpenseFundingInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Expense funding void data must be an object");
    error.statusCode = 400;
    throw error;
  }

  if (typeof data.voidReason !== "string" || !data.voidReason.trim()) {
    const error = new Error("Void reason is required");
    error.statusCode = 400;
    throw error;
  }

  return {
    voidReason: data.voidReason.trim(),
  };
}

function validateFundingAllocationCorrectionInput(data, currentFundingType) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error(
      "Funding allocation correction data must be an object",
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    typeof data.correctionReason !== "string" ||
    !data.correctionReason.trim()
  ) {
    const error = new Error("Correction reason is required");
    error.statusCode = 400;
    throw error;
  }

  const correctedState = validateCreateExpenseFundingInput(data.newState);

  if (correctedState.fundingType !== currentFundingType) {
    const error = new Error(
      "Funding type cannot be changed through a correction",
    );
    error.statusCode = 409;
    throw error;
  }

  return {
    newState: correctedState,
    correctionReason: data.correctionReason.trim(),
  };
}
export {
  validateCreateExpenseFundingInput,
  validateVoidExpenseFundingInput,
  validateFundingAllocationCorrectionInput,
};
