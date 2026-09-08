import crypto from "node:crypto";

import pool from "../../../config/db.js";

import {
  createDonation,
  findDonationById,
  findDonationByIdForUpdate,
  findDonationByIdempotencyKey,
  getDonations,
  voidDonation,
  createRestrictionChange,
  findRestrictionChangeByIdempotencyKey,
  getRestrictionChangesByDonationId,
  createDonationItem,
  getDonationItemsByDonationId,
} from "../repositories/donation.repository.js";

import {
  hasCashMovementsForDonation,
  getCashMovementsByDonationId,
} from "../repositories/financeCashMovement.repository.js";

import { hasFundingAllocationForDirectPaymentDonation } from "../repositories/expenseFunding.repository.js";

import { hasReceivedStockForDonation } from "../../inventory/inventory.repository.js";

import {
  validateEnum,
  validateMoneyAmount,
  validateUuid,
  validateOptionalUuid,
  validateOptionalText,
  validateIdempotencyKey,
  validateDateTime,
} from "../validations/finance.validation.utils.js";

import {
  validateCreateDonationInput,
  validateRequiredText,
  validateVoidDonationInput,
  validateCreateRestrictionChangeInput,
  validateDonationListQuery,
} from "../validations/donation.validation.js";

function createRestrictionChangeRequestHash(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

function createDonationRequestHash(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

function sameRestrictionBucket(
  typeA,
  categoryA,
  expenseIdA,
  typeB,
  categoryB,
  expenseIdB,
) {
  return (
    typeA === typeB && categoryA === categoryB && expenseIdA === expenseIdB
  );
}

function getAvailableAmountForRestrictionBucket(
  donation,
  restrictionChanges,
  cashMovements,
  restrictionType,
  restrictionCategory,
  restrictedExpenseId,
) {
  let availableAmount = 0;

  const originalMatches = sameRestrictionBucket(
    donation.fund_restriction,
    donation.restriction_category,
    donation.restricted_expense_id,
    restrictionType,
    restrictionCategory,
    restrictedExpenseId,
  );

  if (originalMatches) {
    availableAmount += Number(donation.monetary_amount);
  }

  for (const change of restrictionChanges) {
    const fromMatches = sameRestrictionBucket(
      change.from_restriction_type,
      change.from_restriction_category,
      change.from_restricted_expense_id,
      restrictionType,
      restrictionCategory,
      restrictedExpenseId,
    );

    const toMatches = sameRestrictionBucket(
      change.to_restriction_type,
      change.to_restriction_category,
      change.to_restricted_expense_id,
      restrictionType,
      restrictionCategory,
      restrictedExpenseId,
    );

    if (fromMatches) {
      availableAmount -= Number(change.change_amount);
    }

    if (toMatches) {
      availableAmount += Number(change.change_amount);
    }
  }

  for (const movement of cashMovements) {
    const movementMatches = sameRestrictionBucket(
      movement.source_restriction_type,
      movement.source_restriction_category,
      movement.source_restricted_expense_id,
      restrictionType,
      restrictionCategory,
      restrictedExpenseId,
    );

    if (!movementMatches) {
      continue;
    }

    if (
      movement.movement_type === "ALLOCATION_USE" ||
      movement.movement_type === "REIMBURSEMENT_USE" ||
      movement.movement_type === "REIMBURSEMENT_RECONSUME"
    ) {
      availableAmount -= Number(movement.movement_amount);
    }

    if (
      movement.movement_type === "ALLOCATION_RESTORE" ||
      movement.movement_type === "REIMBURSEMENT_RESTORE"
    ) {
      availableAmount += Number(movement.movement_amount);
    }
  }

  return availableAmount;
}

function mapDonation(donation) {
  if (!donation) return null;

  return {
    donationId: donation.donation_id,
    donationType: donation.donation_type,
    donatedAt: donation.donated_at,

    monetaryAmount:
      donation.monetary_amount === null ||
      donation.monetary_amount === undefined
        ? null
        : Number(donation.monetary_amount),

    paymentMethod: donation.payment_method,
    paymentProvider: donation.payment_provider,
    referenceNumber: donation.reference_number,

    donorUserId: donation.donor_user_id,
    donorName: donation.donor_name,
    donorContact: donation.donor_contact,
    isAnonymous: donation.is_anonymous,

    purpose: donation.purpose,

    fundRestriction: donation.fund_restriction,
    restrictionCategory: donation.restriction_category,
    restrictedExpenseId: donation.restricted_expense_id,

    notes: donation.notes,
    receivedBy: donation.received_by,

    voidReason: donation.void_reason ?? null,
    voidedBy: donation.voided_by ?? null,
    voidedAt: donation.voided_at ?? null,

    createdBy: donation.created_by,
    updatedBy: donation.updated_by ?? null,
    createdAt: donation.created_at,
    updatedAt: donation.updated_at,
  };
}

function mapRestrictionChange(change) {
  if (!change) return null;

  return {
    restrictionChangeId: change.restriction_change_id,
    donationId: change.donation_id,

    changeAmount:
      change.change_amount === null || change.change_amount === undefined
        ? null
        : Number(change.change_amount),

    fromRestrictionType: change.from_restriction_type,
    fromRestrictionCategory: change.from_restriction_category,
    fromRestrictedExpenseId: change.from_restricted_expense_id,

    toRestrictionType: change.to_restriction_type,
    toRestrictionCategory: change.to_restriction_category,
    toRestrictedExpenseId: change.to_restricted_expense_id,

    authorizationNote: change.authorization_note,
    changeReason: change.change_reason,

    authorizedAt: change.authorized_at,
    changedAt: change.changed_at,

    createdBy: change.created_by,
    createdAt: change.created_at,
  };
}

function mapDonationItem(item) {
  if (!item) return null;

  return {
    donationItemId: item.donation_item_id,
    donationId: item.donation_id,
    inventoryItemId: item.inventory_item_id,
    itemName: item.item_name,
    quantity:
      item.quantity === null || item.quantity === undefined
        ? null
        : Number(item.quantity),
    unit: item.unit,
    notes: item.notes,
  };
}

async function createDonationService(data, createdBy, idempotencyKey) {
  const validIdempotencyKey = validateIdempotencyKey(idempotencyKey);

  const validated = validateCreateDonationInput(data);

  if (validated.donationType === "DIRECT_PAYMENT") {
    const error = new Error(
      "Direct payment donations must be created through the expense funding workflow",
    );
    error.statusCode = 409;
    throw error;
  }

  const idempotencyRequestHash = createDonationRequestHash({
    donationType: validated.donationType,
    donatedAt: validated.donatedAt,
    monetaryAmount: validated.monetaryAmount,
    paymentMethod: validated.paymentMethod,
    paymentProvider: validated.paymentProvider,
    referenceNumber: validated.referenceNumber,
    donorUserId: validated.donorUserId,
    donorName: validated.donorName,
    donorContact: validated.donorContact,
    isAnonymous: validated.isAnonymous,
    purpose: validated.purpose,
    fundRestriction: validated.fundRestriction,
    restrictionCategory: validated.restrictionCategory,
    restrictedExpenseId: validated.restrictedExpenseId,
    notes: validated.notes,
    receivedBy: validated.receivedBy,

    donationItems: validated.donationItems ?? null,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingDonation = await findDonationByIdempotencyKey(
      createdBy,
      validIdempotencyKey,
      client,
    );

    if (existingDonation) {
      if (
        existingDonation.idempotency_request_hash !== idempotencyRequestHash
      ) {
        const error = new Error(
          "Idempotency key has already been used for a different donation request",
        );
        error.statusCode = 409;
        throw error;
      }

      let existingDonationItems = [];

      if (existingDonation.donation_type === "IN_KIND") {
        existingDonationItems = await getDonationItemsByDonationId(
          existingDonation.donation_id,
          client,
        );
      }

      await client.query("COMMIT");

      return {
        donation: {
          ...mapDonation(existingDonation),
          donationItems: existingDonationItems.map(mapDonationItem),
        },
        isReplay: true,
      };
    }

    const createdDonation = await createDonation(
      {
        ...validated,
        idempotencyKey: validIdempotencyKey,
        idempotencyRequestHash,
        createdBy,
      },
      client,
    );

    const createdDonationItems = [];

    if (validated.donationType === "IN_KIND") {
      for (const item of validated.donationItems) {
        const createdItem = await createDonationItem(
          {
            donation_id: createdDonation.donation_id,
            inventory_item_id: item.inventoryItemId,
            item_name: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            notes: item.notes,
          },
          client,
        );

        createdDonationItems.push(createdItem);
      }
    }

    await client.query("COMMIT");

    return {
      donation: {
        ...mapDonation(createdDonation),
        donationItems: createdDonationItems.map(mapDonationItem),
      },
      isReplay: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (
      error.code === "23505" &&
      error.constraint === "uq_donations_created_by_idempotency_key"
    ) {
      const concurrentExistingDonation = await findDonationByIdempotencyKey(
        createdBy,
        validIdempotencyKey,
      );

      if (
        !concurrentExistingDonation ||
        concurrentExistingDonation.idempotency_request_hash !==
          idempotencyRequestHash
      ) {
        const conflictError = new Error(
          "Idempotency key has already been used for a different donation request",
        );
        conflictError.statusCode = 409;
        throw conflictError;
      }

      let concurrentDonationItems = [];

      if (concurrentExistingDonation.donation_type === "IN_KIND") {
        concurrentDonationItems = await getDonationItemsByDonationId(
          concurrentExistingDonation.donation_id,
        );
      }

      return {
        donation: {
          ...mapDonation(concurrentExistingDonation),
          donationItems: concurrentDonationItems.map(mapDonationItem),
        },
        isReplay: true,
      };
    }

    if (
      error.code === "23503" &&
      error.constraint === "fk_donation_items_inventory_item"
    ) {
      const notFoundError = new Error("Inventory item not found");
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    throw error;
  } finally {
    client.release();
  }
}

async function getDonationsService(query) {
  const validated = validateDonationListQuery(query);
  const { donations, total } = await getDonations(validated);

  const totalPages = Math.ceil(total / validated.limit);

  return {
    donations: donations.map(mapDonation),
    pagination: {
      page: validated.page,
      limit: validated.limit,
      total,
      totalPages,
    },
  };
}

async function getDonationByIdService(donationId) {
  const validDonationId = validateUuid(donationId, "donation ID");

  const donation = await findDonationById(validDonationId);

  if (!donation) {
    const error = new Error("Donation not found");
    error.statusCode = 404;
    throw error;
  }

  let donationItems = [];

  if (donation.donation_type === "IN_KIND") {
    donationItems = await getDonationItemsByDonationId(validDonationId);
  }

  return {
    ...mapDonation(donation),
    donationItems: donationItems.map(mapDonationItem),
  };
}
async function voidDonationService(donationId, data, voidedBy) {
  const validDonationId = validateUuid(donationId, "donation ID");

  const validated = validateVoidDonationInput(data);

  const voidReason = validated.voidReason;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const donation = await findDonationByIdForUpdate(validDonationId, client);

    if (!donation) {
      const error = new Error("Donation not found");
      error.statusCode = 404;
      throw error;
    }

    if (donation.donation_type === "MONETARY") {
      const hasCashMovements = await hasCashMovementsForDonation(
        validDonationId,
        client,
      );

      if (hasCashMovements) {
        const error = new Error(
          "Donation cannot be voided after its funds have been used",
        );
        error.statusCode = 409;
        throw error;
      }
    }

    if (donation.donation_type === "DIRECT_PAYMENT") {
      const hasLinkedAllocation =
        await hasFundingAllocationForDirectPaymentDonation(
          validDonationId,
          client,
        );

      if (hasLinkedAllocation) {
        const error = new Error(
          "Direct payment donation cannot be voided independently while linked to a funding allocation",
        );
        error.statusCode = 409;
        throw error;
      }
    }

    if (donation.donation_type === "IN_KIND") {
      const hasReceivedStock = await hasReceivedStockForDonation(
        validDonationId,
        client,
      );

      if (hasReceivedStock) {
        const error = new Error(
          "In-kind donation cannot be voided after donated items have been received into inventory",
        );
        error.statusCode = 409;
        throw error;
      }
    }

    const voided = await voidDonation(
      validDonationId,
      voidedBy,
      voidReason,
      client,
    );

    if (!voided) {
      const error = new Error("Donation could not be voided");
      error.statusCode = 409;
      throw error;
    }

    await client.query("COMMIT");

    return mapDonation({
      ...donation,
      ...voided,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function createRestrictionChangeService(
  donationId,
  data,
  createdBy,
  idempotencyKey,
) {
  const validDonationId = validateUuid(donationId, "donation ID");

  const validIdempotencyKey = validateIdempotencyKey(idempotencyKey);

  const validated = validateCreateRestrictionChangeInput(data);

  const idempotencyRequestHash = createRestrictionChangeRequestHash({
    donationId: validDonationId,
    changeAmount: validated.changeAmount,

    fromRestrictionType: validated.fromRestrictionType,
    fromRestrictionCategory: validated.fromRestrictionCategory,
    fromRestrictedExpenseId: validated.fromRestrictedExpenseId,

    toRestrictionType: validated.toRestrictionType,
    toRestrictionCategory: validated.toRestrictionCategory,
    toRestrictedExpenseId: validated.toRestrictedExpenseId,

    authorizationNote: validated.authorizationNote,
    changeReason: validated.changeReason,
    authorizedAt: validated.authorizedAt,
    changedAt: validated.changedAt,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingRestrictionChange =
      await findRestrictionChangeByIdempotencyKey(
        createdBy,
        validIdempotencyKey,
        client,
      );

    if (existingRestrictionChange) {
      if (
        existingRestrictionChange.idempotency_request_hash !==
        idempotencyRequestHash
      ) {
        const error = new Error(
          "Idempotency key has already been used for a different restriction change request",
        );
        error.statusCode = 409;
        throw error;
      }

      await client.query("COMMIT");

      return {
        restrictionChange: mapRestrictionChange(existingRestrictionChange),
        isReplay: true,
      };
    }

    const donation = await findDonationByIdForUpdate(validDonationId, client);

    if (!donation) {
      const error = new Error("Donation not found");
      error.statusCode = 404;
      throw error;
    }

    if (donation.donation_type !== "MONETARY") {
      const error = new Error(
        "Only monetary donations can have restriction changes",
      );
      error.statusCode = 409;
      throw error;
    }

    if (donation.voided_at !== null) {
      const error = new Error(
        "Voided donations cannot have restriction changes",
      );
      error.statusCode = 409;
      throw error;
    }

    const restrictionChanges = await getRestrictionChangesByDonationId(
      validDonationId,
      client,
    );

    const cashMovements = await getCashMovementsByDonationId(
      validDonationId,
      client,
    );

    const availableFromAmount = getAvailableAmountForRestrictionBucket(
      donation,
      restrictionChanges,
      cashMovements,
      validated.fromRestrictionType,
      validated.fromRestrictionCategory,
      validated.fromRestrictedExpenseId,
    );

    if (validated.changeAmount > availableFromAmount) {
      const error = new Error(
        "Restriction change amount exceeds the available amount in the source restriction bucket",
      );
      error.statusCode = 409;
      throw error;
    }

    const createdRestrictionChange = await createRestrictionChange(
      {
        donation_id: validDonationId,
        change_amount: validated.changeAmount,

        from_restriction_type: validated.fromRestrictionType,
        from_restriction_category: validated.fromRestrictionCategory,
        from_restricted_expense_id: validated.fromRestrictedExpenseId,

        to_restriction_type: validated.toRestrictionType,
        to_restriction_category: validated.toRestrictionCategory,
        to_restricted_expense_id: validated.toRestrictedExpenseId,

        authorization_note: validated.authorizationNote,
        change_reason: validated.changeReason,
        authorized_at: validated.authorizedAt,
        changed_at: validated.changedAt,

        idempotency_key: validIdempotencyKey,
        idempotency_request_hash: idempotencyRequestHash,
        created_by: createdBy,
      },
      client,
    );

    await client.query("COMMIT");

    return {
      restrictionChange: mapRestrictionChange(createdRestrictionChange),
      isReplay: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (
      error.code === "23505" &&
      error.constraint === "uq_donation_restriction_change_idempotency"
    ) {
      const concurrentExistingRestrictionChange =
        await findRestrictionChangeByIdempotencyKey(
          createdBy,
          validIdempotencyKey,
        );

      if (
        !concurrentExistingRestrictionChange ||
        concurrentExistingRestrictionChange.idempotency_request_hash !==
          idempotencyRequestHash
      ) {
        const conflictError = new Error(
          "Idempotency key has already been used for a different restriction change request",
        );
        conflictError.statusCode = 409;
        throw conflictError;
      }

      return {
        restrictionChange: concurrentExistingRestrictionChange,
        isReplay: true,
      };
    }

    throw error;
  } finally {
    client.release();
  }
}

async function getRestrictionChangesService(donationId) {
  const validDonationId = validateUuid(donationId, "donation ID");

  const donation = await findDonationById(validDonationId);

  if (!donation) {
    const error = new Error("Donation not found");
    error.statusCode = 404;
    throw error;
  }

  const restrictionChanges =
    await getRestrictionChangesByDonationId(validDonationId);

  return restrictionChanges.map(mapRestrictionChange);
}

export {
  createDonationService,
  getDonationsService,
  getDonationByIdService,
  voidDonationService,
  getAvailableAmountForRestrictionBucket,
  createRestrictionChangeService,
  getRestrictionChangesService,
};
