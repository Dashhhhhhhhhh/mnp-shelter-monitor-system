const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_DONATION_TYPES = ["MONETARY", "IN_KIND", "DIRECT_PAYMENT"];

const ALLOWED_PAYMENT_METHODS = ["CASH", "E_WALLET", "BANK_TRANSFER", "OTHER"];

const ALLOWED_FUND_RESTRICTIONS = ["GENERAL", "RESTRICTED"];

const ALLOWED_RESTRICTION_CATEGORIES = [
  "VET",
  "MEDICINE",
  "FOOD",
  "LITTER",
  "CAGE_SUPPLIES",
  "CLEANING_SUPPLIES",
  "TRANSPORTATION",
  "SPECIFIC_EXPENSE",
  "OTHER",
];

function hasAtMostTwoDecimalPlaces(value) {
  return Number(value.toFixed(2)) === value;
}

function validateUuid(value, fieldName) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.statusCode = 400;
    throw error;
  }

  return value;
}

function validateOptionalUuid(value, fieldName) {
  if (value === undefined || value === null) {
    return null;
  }

  return validateUuid(value, fieldName);
}

function validateRequiredText(value, fieldName, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    const error = new Error(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function validateOptionalText(value, fieldName, maxLength = null) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    const error = new Error(`${fieldName} must be a string or null`);
    error.statusCode = 400;
    throw error;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (maxLength !== null && normalized.length > maxLength) {
    const error = new Error(
      `${fieldName} must not exceed ${maxLength} characters`,
    );
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function validateEnum(value, fieldName, allowedValues) {
  if (typeof value !== "string") {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }

  const normalized = value.trim().toUpperCase();

  if (!allowedValues.includes(normalized)) {
    const error = new Error(
      `${fieldName} must be one of: ${allowedValues.join(", ")}`,
    );
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function validateBoolean(value, fieldName) {
  if (typeof value !== "boolean") {
    const error = new Error(`${fieldName} must be a boolean`);
    error.statusCode = 400;
    throw error;
  }

  return value;
}

function validateDonationType(donationType) {
  return validateEnum(donationType, "Donation type", ALLOWED_DONATION_TYPES);
}

function validatePaymentMethod(paymentMethod) {
  return validateEnum(paymentMethod, "Payment method", ALLOWED_PAYMENT_METHODS);
}

function validateFundRestriction(fundRestriction) {
  return validateEnum(
    fundRestriction,
    "Fund restriction",
    ALLOWED_FUND_RESTRICTIONS,
  );
}

function validateRestrictionCategory(restrictionCategory) {
  return validateEnum(
    restrictionCategory,
    "Restriction category",
    ALLOWED_RESTRICTION_CATEGORIES,
  );
}

function validateMoneyAmount(value, fieldName) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    const error = new Error(`${fieldName} must be a number greater than 0`);
    error.statusCode = 400;
    throw error;
  }

  if (!hasAtMostTwoDecimalPlaces(value)) {
    const error = new Error(
      `${fieldName} must not have more than 2 decimal places`,
    );
    error.statusCode = 400;
    throw error;
  }

  if (value > 9999999999.99) {
    const error = new Error(`${fieldName} is too large`);
    error.statusCode = 400;
    throw error;
  }

  return value;
}

function validateDateTime(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} must be a valid date and time`);
    error.statusCode = 400;
    throw error;
  }

  if (date.getTime() > Date.now()) {
    const error = new Error(`${fieldName} cannot be in the future`);
    error.statusCode = 400;
    throw error;
  }

  return date.toISOString();
}

function rejectProvidedField(value, fieldName, donationType) {
  if (value !== undefined && value !== null) {
    const error = new Error(
      `${fieldName} is not allowed for ${donationType} donations`,
    );
    error.statusCode = 400;
    throw error;
  }
}

function validateVoidDonationInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Donation void data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const voidReason = validateRequiredText(data.voidReason, "Void reason", 255);

  return {
    voidReason,
  };
}

function validateDonationItems(donationItems) {
  if (!Array.isArray(donationItems) || donationItems.length === 0) {
    const error = new Error(
      "IN_KIND donation must contain at least one donation item",
    );
    error.statusCode = 400;
    throw error;
  }

  return donationItems.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      const error = new Error(`Donation item ${index + 1} must be an object`);
      error.statusCode = 400;
      throw error;
    }

    const inventoryItemId = validateOptionalUuid(
      item.inventoryItemId,
      `donation item ${index + 1} inventory item ID`,
    );

    const itemName = validateRequiredText(
      item.itemName,
      `Donation item ${index + 1} name`,
      150,
    );

    const quantity = Number(item.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      const error = new Error(
        `Donation item ${index + 1} quantity must be greater than zero`,
      );
      error.statusCode = 400;
      throw error;
    }

    const unit = validateRequiredText(
      item.unit,
      `Donation item ${index + 1} unit`,
      30,
    ).toUpperCase();

    const notes = validateOptionalText(
      item.notes,
      `Donation item ${index + 1} notes`,
    );

    return {
      inventoryItemId,
      itemName,
      quantity,
      unit,
      notes,
    };
  });
}

function validateCreateDonationInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error("Donation data must be an object");
    error.statusCode = 400;
    throw error;
  }

  const donationType = validateDonationType(data.donationType);

  const donatedAt = validateDateTime(data.donatedAt, "Donated at");

  const isAnonymous = validateBoolean(data.isAnonymous, "Is anonymous");

  const donorUserId = validateOptionalUuid(data.donorUserId, "donor user ID");

  const donorName = validateOptionalText(data.donorName, "Donor name", 100);

  const donorContact = validateOptionalText(
    data.donorContact,
    "Donor contact",
    100,
  );

  const purpose = validateOptionalText(data.purpose, "Purpose", 255);

  const notes = validateOptionalText(data.notes, "Notes");

  const receivedBy = validateOptionalUuid(
    data.receivedBy,
    "received by user ID",
  );

  // MONETARY
  if (donationType === "MONETARY") {
    const monetaryAmount = validateMoneyAmount(
      data.monetaryAmount,
      "Monetary amount",
    );

    const paymentMethod = validatePaymentMethod(data.paymentMethod);

    const paymentProvider = validateOptionalText(
      data.paymentProvider,
      "Payment provider",
      100,
    );

    const referenceNumber = validateOptionalText(
      data.referenceNumber,
      "Reference number",
      100,
    );

    const fundRestriction = validateFundRestriction(data.fundRestriction);

    let restrictionCategory = null;
    let restrictedExpenseId = null;

    if (fundRestriction === "GENERAL") {
      rejectProvidedField(
        data.restrictionCategory,
        "Restriction category",
        "GENERAL",
      );

      rejectProvidedField(
        data.restrictedExpenseId,
        "Restricted expense ID",
        "GENERAL",
      );
    }

    if (fundRestriction === "RESTRICTED") {
      restrictionCategory = validateRestrictionCategory(
        data.restrictionCategory,
      );

      if (restrictionCategory === "SPECIFIC_EXPENSE") {
        restrictedExpenseId = validateUuid(
          data.restrictedExpenseId,
          "restricted expense ID",
        );
      } else {
        rejectProvidedField(
          data.restrictedExpenseId,
          "Restricted expense ID",
          restrictionCategory,
        );
      }

      if (!purpose) {
        const error = new Error(
          "Purpose is required for RESTRICTED monetary donations",
        );
        error.statusCode = 400;
        throw error;
      }
    }

    rejectProvidedField(data.donationItems, "Donation items", donationType);

    return {
      donationType,
      donatedAt,
      monetaryAmount,
      paymentMethod,
      paymentProvider,
      referenceNumber,
      donorUserId,
      donorName,
      donorContact,
      isAnonymous,
      purpose,
      fundRestriction,
      restrictionCategory,
      restrictedExpenseId,
      notes,
      receivedBy,
    };
  }

  if (donationType === "IN_KIND") {
    const donationItems = validateDonationItems(data.donationItems);
    let monetaryAmount = null;

    if (data.monetaryAmount !== undefined && data.monetaryAmount !== null) {
      monetaryAmount = validateMoneyAmount(
        data.monetaryAmount,
        "Monetary amount",
      );
    }

    rejectProvidedField(data.paymentMethod, "Payment method", donationType);

    rejectProvidedField(data.paymentProvider, "Payment provider", donationType);

    rejectProvidedField(data.referenceNumber, "Reference number", donationType);

    rejectProvidedField(data.fundRestriction, "Fund restriction", donationType);

    rejectProvidedField(
      data.restrictionCategory,
      "Restriction category",
      donationType,
    );

    rejectProvidedField(
      data.restrictedExpenseId,
      "Restricted expense ID",
      donationType,
    );

    return {
      donationType,
      donatedAt,
      monetaryAmount,
      paymentMethod: null,
      paymentProvider: null,
      referenceNumber: null,
      donorUserId,
      donorName,
      donorContact,
      isAnonymous,
      purpose,
      fundRestriction: null,
      restrictionCategory: null,
      restrictedExpenseId: null,
      notes,
      receivedBy,
      donationItems,
    };
  }

  // DIRECT PAYMENT
  if (donationType === "DIRECT_PAYMENT") {
    const monetaryAmount = validateMoneyAmount(
      data.monetaryAmount,
      "Monetary amount",
    );

    const paymentMethod = validatePaymentMethod(data.paymentMethod);

    const paymentProvider = validateOptionalText(
      data.paymentProvider,
      "Payment provider",
      100,
    );

    const referenceNumber = validateOptionalText(
      data.referenceNumber,
      "Reference number",
      100,
    );

    if (isAnonymous) {
      const error = new Error("DIRECT_PAYMENT donations cannot be anonymous");
      error.statusCode = 400;
      throw error;
    }

    const hasDonorUser = donorUserId !== null;
    const hasDonorName = donorName !== null;

    if (hasDonorUser === hasDonorName) {
      const error = new Error(
        "DIRECT_PAYMENT requires exactly one payer: donor user ID or donor name",
      );
      error.statusCode = 400;
      throw error;
    }

    rejectProvidedField(data.fundRestriction, "Fund restriction", donationType);

    rejectProvidedField(
      data.restrictionCategory,
      "Restriction category",
      donationType,
    );

    rejectProvidedField(
      data.restrictedExpenseId,
      "Restricted expense ID",
      donationType,
    );

    rejectProvidedField(data.receivedBy, "Received by", donationType);

    rejectProvidedField(data.donationItems, "Donation items", donationType);

    return {
      donationType,
      donatedAt,
      monetaryAmount,
      paymentMethod,
      paymentProvider,
      referenceNumber,
      donorUserId,
      donorName,
      donorContact,
      isAnonymous,
      purpose,
      fundRestriction: null,
      restrictionCategory: null,
      restrictedExpenseId: null,
      notes,
      receivedBy: null,
    };
  }
}

function validateCreateRestrictionChangeInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const error = new Error(
      "Donation restriction change data must be an object",
    );
    error.statusCode = 400;
    throw error;
  }

  const changeAmount = validateMoneyAmount(data.changeAmount, "Change amount");

  const fromRestrictionType = validateFundRestriction(data.fromRestrictionType);

  const toRestrictionType = validateFundRestriction(data.toRestrictionType);

  // FROM STATE
  let fromRestrictionCategory = null;
  let fromRestrictedExpenseId = null;

  if (fromRestrictionType === "RESTRICTED") {
    fromRestrictionCategory = validateRestrictionCategory(
      data.fromRestrictionCategory,
    );

    if (fromRestrictionCategory === "SPECIFIC_EXPENSE") {
      fromRestrictedExpenseId = validateUuid(
        data.fromRestrictedExpenseId,
        "from restricted expense ID",
      );
    } else {
      rejectProvidedField(
        data.fromRestrictedExpenseId,
        "From restricted expense ID",
        fromRestrictionCategory,
      );
    }
  } else {
    rejectProvidedField(
      data.fromRestrictionCategory,
      "From restriction category",
      fromRestrictionType,
    );

    rejectProvidedField(
      data.fromRestrictedExpenseId,
      "From restricted expense ID",
      fromRestrictionType,
    );
  }

  // TO STATE
  let toRestrictionCategory = null;
  let toRestrictedExpenseId = null;

  if (toRestrictionType === "RESTRICTED") {
    toRestrictionCategory = validateRestrictionCategory(
      data.toRestrictionCategory,
    );

    if (toRestrictionCategory === "SPECIFIC_EXPENSE") {
      toRestrictedExpenseId = validateUuid(
        data.toRestrictedExpenseId,
        "to restricted expense ID",
      );
    } else {
      rejectProvidedField(
        data.toRestrictedExpenseId,
        "To restricted expense ID",
        toRestrictionCategory,
      );
    }
  } else {
    rejectProvidedField(
      data.toRestrictionCategory,
      "To restriction category",
      toRestrictionType,
    );

    rejectProvidedField(
      data.toRestrictedExpenseId,
      "To restricted expense ID",
      toRestrictionType,
    );
  }

  const sameRestrictionState =
    fromRestrictionType === toRestrictionType &&
    fromRestrictionCategory === toRestrictionCategory &&
    fromRestrictedExpenseId === toRestrictedExpenseId;

  if (sameRestrictionState) {
    const error = new Error(
      "Source and destination restriction states must be different",
    );
    error.statusCode = 400;
    throw error;
  }

  const authorizationNote = validateRequiredText(
    data.authorizationNote,
    "Authorization note",
    500,
  );

  const changeReason = validateRequiredText(
    data.changeReason,
    "Change reason",
    500,
  );

  const authorizedAt = validateDateTime(data.authorizedAt, "Authorized at");

  const changedAt = validateDateTime(data.changedAt, "Changed at");

  if (new Date(changedAt).getTime() < new Date(authorizedAt).getTime()) {
    const error = new Error("Changed at cannot be earlier than authorized at");
    error.statusCode = 400;
    throw error;
  }

  return {
    changeAmount,
    fromRestrictionType,
    fromRestrictionCategory,
    fromRestrictedExpenseId,
    toRestrictionType,
    toRestrictionCategory,
    toRestrictedExpenseId,
    authorizationNote,
    changeReason,
    authorizedAt,
    changedAt,
  };
}

function validateDonationListQuery(query) {
  if (!query || typeof query !== "object" || Array.isArray(query)) {
    const error = new Error("Donation query must be an object");
    error.statusCode = 400;
    throw error;
  }

  // Pagination
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);

  if (!Number.isInteger(page) || page < 1) {
    const error = new Error("Page must be a positive integer");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    const error = new Error("Limit must be an integer between 1 and 100");
    error.statusCode = 400;
    throw error;
  }

  // Sorting
  const allowedSortFields = [
    "donatedAt",
    "monetaryAmount",
    "createdAt",
    "donorName",
  ];

  const sortBy = query.sortBy ?? "donatedAt";

  if (!allowedSortFields.includes(sortBy)) {
    const error = new Error("Invalid donation sort field");
    error.statusCode = 400;
    throw error;
  }

  const sortOrder =
    query.sortOrder === undefined
      ? "DESC"
      : String(query.sortOrder).trim().toUpperCase();

  if (!["ASC", "DESC"].includes(sortOrder)) {
    const error = new Error("Sort order must be ASC or DESC");
    error.statusCode = 400;
    throw error;
  }

  // Filters
  const donationType =
    query.donationType === undefined
      ? null
      : validateDonationType(query.donationType);

  const paymentMethod =
    query.paymentMethod === undefined
      ? null
      : validatePaymentMethod(query.paymentMethod);

  const fundRestriction =
    query.fundRestriction === undefined
      ? null
      : validateFundRestriction(query.fundRestriction);

  const restrictionCategory =
    query.restrictionCategory === undefined
      ? null
      : validateRestrictionCategory(query.restrictionCategory);

  const dateFrom =
    query.dateFrom === undefined
      ? null
      : validateDateTime(query.dateFrom, "Date from");

  const dateTo =
    query.dateTo === undefined
      ? null
      : validateDateTime(query.dateTo, "Date to");

  if (dateFrom && dateTo && dateFrom > dateTo) {
    const error = new Error("Date from cannot be after date to");
    error.statusCode = 400;
    throw error;
  }
  6;

  let isVoided = null;

  if (query.isVoided !== undefined) {
    if (query.isVoided === "true") {
      isVoided = true;
    } else if (query.isVoided === "false") {
      isVoided = false;
    } else {
      const error = new Error("isVoided must be true or false");
      error.statusCode = 400;
      throw error;
    }
  }

  const search =
    query.search === undefined
      ? null
      : validateOptionalText(query.search, "Search", 150);

  return {
    page,
    limit,
    offset: (page - 1) * limit,

    sortBy,
    sortOrder,

    donationType,
    paymentMethod,
    fundRestriction,
    restrictionCategory,
    isVoided,
    search,

    dateFrom,
    dateTo,
  };
}

export {
  validateUuid,
  validateVoidDonationInput,
  validateCreateDonationInput,
  validateMoneyAmount,
  validateDateTime,
  validateRequiredText,
  validateCreateRestrictionChangeInput,
  validateDonationListQuery,
};
