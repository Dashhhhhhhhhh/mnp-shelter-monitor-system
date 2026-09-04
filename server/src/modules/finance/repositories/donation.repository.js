import pool from "../../../config/db.js";

async function createDonation(
  {
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
    idempotencyKey,
    idempotencyRequestHash,
    createdBy,
  },
  db = pool,
) {
  const result = await db.query(
    `
    INSERT INTO donations (
      donation_type,
      donated_at,
      monetary_amount,
      payment_method,
      payment_provider,
      reference_number,
      donor_user_id,
      donor_name,
      donor_contact,
      is_anonymous,
      purpose,
      fund_restriction,
      restriction_category,
      restricted_expense_id,
      notes,
      received_by,
      idempotency_key,
      idempotency_request_hash,
      created_by
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19
    )
    RETURNING
      donation_id,
      donation_type,
      donated_at,
      monetary_amount,
      payment_method,
      payment_provider,
      reference_number,
      donor_user_id,
      donor_name,
      donor_contact,
      is_anonymous,
      purpose,
      fund_restriction,
      restriction_category,
      restricted_expense_id,
      notes,
      received_by,
      idempotency_key,
      idempotency_request_hash,
      created_by,
      created_at,
      updated_at
    `,
    [
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
      idempotencyKey,
      idempotencyRequestHash,
      createdBy,
    ],
  );

  return result.rows[0];
}

async function findDonationById(donationId, db = pool) {
  const result = await db.query(
    `
        SELECT
            donation_id,
            donation_type,
            donated_at,
            monetary_amount,
            payment_method,
            payment_provider,
            reference_number,
            donor_user_id,
            donor_name,
            donor_contact,
            is_anonymous,
            purpose,
            fund_restriction,
            restriction_category,
            restricted_expense_id,
            notes,
            received_by,
            void_reason,
            voided_by,
            voided_at,
            idempotency_key,
            idempotency_request_hash,
            created_by,
            updated_by,
            created_at,
            updated_at
        FROM donations
        WHERE donation_id = $1
        `,
    [donationId],
  );
  return result.rows[0];
}

async function findDonationByIdForUpdate(donationId, db = pool) {
  const result = await db.query(
    `
        SELECT
            donation_id,
            donation_type,
            donated_at,
            monetary_amount,
            payment_method,
            payment_provider,
            reference_number,
            donor_user_id,
            donor_name,
            donor_contact,
            is_anonymous,
            purpose,
            fund_restriction,
            restriction_category,
            restricted_expense_id,
            notes,
            received_by,
            void_reason,
            voided_by,
            voided_at,
            idempotency_key,
            idempotency_request_hash,
            created_by,
            updated_by,
            created_at,
            updated_at
        FROM donations
        WHERE donation_id = $1
        FOR UPDATE
        `,
    [donationId],
  );
  return result.rows[0];
}

async function findDonationByIdempotencyKey(
  createdBy,
  idempotencyKey,
  db = pool,
) {
  const result = await db.query(
    `
        SELECT
            donation_id,
            donation_type,
            donated_at,
            monetary_amount,
            payment_method,
            payment_provider,
            reference_number,
            donor_user_id,
            donor_name,
            donor_contact,
            is_anonymous,
            purpose,
            fund_restriction,
            restriction_category,
            restricted_expense_id,
            notes,
            received_by,
            void_reason,
            voided_by,
            voided_at,
            idempotency_key,
            idempotency_request_hash,
            created_by,
            updated_by,
            created_at,
            updated_at
        FROM donations
        WHERE created_by = $1
            AND idempotency_key = $2`,
    [createdBy, idempotencyKey],
  );
  return result.rows[0];
}

async function voidDonation(
  donationId,
  voidedBy,
  voidReason,

  db = pool,
) {
  const result = await db.query(
    `
    UPDATE donations
    SET
        voided_by = $2,
        void_reason = $3,
        voided_at = CURRENT_TIMESTAMP,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE donation_id = $1
    RETURNING
        donation_id,
        voided_by,
        void_reason,
        voided_at,
        updated_by,
        updated_at`,
    [donationId, voidedBy, voidReason],
  );
  return result.rows[0];
}

async function createRestrictionChange(
  {
    donation_id,
    change_amount,
    from_restriction_type,
    from_restriction_category,
    from_restricted_expense_id,
    to_restriction_type,
    to_restriction_category,
    to_restricted_expense_id,
    authorization_note,
    change_reason,
    authorized_at,
    changed_at,
    idempotency_key,
    idempotency_request_hash,
    created_by,
  },
  db = pool,
) {
  const result = await db.query(
    `
    INSERT INTO donation_restriction_changes (
      donation_id,
      change_amount,
      from_restriction_type,
      from_restriction_category,
      from_restricted_expense_id,
      to_restriction_type,
      to_restriction_category,
      to_restricted_expense_id,
      authorization_note,
      change_reason,
      authorized_at,
      changed_at,
      idempotency_key,
      idempotency_request_hash,
      created_by
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15
    )
    RETURNING
      restriction_change_id,
      donation_id,
      change_amount,
      from_restriction_type,
      from_restriction_category,
      from_restricted_expense_id,
      to_restriction_type,
      to_restriction_category,
      to_restricted_expense_id,
      authorization_note,
      change_reason,
      authorized_at,
      changed_at,
      idempotency_key,
      idempotency_request_hash,
      created_by,
      created_at
    `,
    [
      donation_id,
      change_amount,
      from_restriction_type,
      from_restriction_category,
      from_restricted_expense_id,
      to_restriction_type,
      to_restriction_category,
      to_restricted_expense_id,
      authorization_note,
      change_reason,
      authorized_at,
      changed_at,
      idempotency_key,
      idempotency_request_hash,
      created_by,
    ],
  );

  return result.rows[0];
}

async function findRestrictionChangeByIdempotencyKey(
  createdBy,
  idempotencyKey,
  db = pool,
) {
  const result = await db.query(
    `
    SELECT
      restriction_change_id,
      donation_id,
      change_amount,
      from_restriction_type,
      from_restriction_category,
      from_restricted_expense_id,
      to_restriction_type,
      to_restriction_category,
      to_restricted_expense_id,
      authorization_note,
      change_reason,
      authorized_at,
      changed_at,
      idempotency_key,
      idempotency_request_hash,
      created_by,
      created_at
    FROM donation_restriction_changes
    WHERE created_by = $1
      AND idempotency_key = $2
    `,
    [createdBy, idempotencyKey],
  );

  return result.rows[0];
}

async function getRestrictionChangesByDonationId(donationId, db = pool) {
  const result = await db.query(
    `
    SELECT
      restriction_change_id,
      donation_id,
      change_amount,
      from_restriction_type,
      from_restriction_category,
      from_restricted_expense_id,
      to_restriction_type,
      to_restriction_category,
      to_restricted_expense_id,
      authorization_note,
      change_reason,
      authorized_at,
      changed_at,
      idempotency_key,
      idempotency_request_hash,
      created_by,
      created_at
    FROM donation_restriction_changes
    WHERE donation_id = $1
    ORDER BY changed_at ASC
    `,
    [donationId],
  );

  return result.rows;
}

async function getDonations(db = pool) {
  const result = await db.query(
    `
    SELECT
      donation_id,
      donation_type,
      donated_at,
      monetary_amount,
      payment_method,
      payment_provider,
      reference_number,
      donor_user_id,
      donor_name,
      donor_contact,
      is_anonymous,
      purpose,
      fund_restriction,
      restriction_category,
      restricted_expense_id,
      notes,
      received_by,
      void_reason,
      voided_by,
      voided_at,
      created_by,
      updated_by,
      created_at,
      updated_at
    FROM donations
    ORDER BY donated_at DESC
    `,
  );

  return result.rows;
}

export {
  createDonation,
  findDonationById,
  findDonationByIdForUpdate,
  findDonationByIdempotencyKey,
  voidDonation,
  createRestrictionChange,
  findRestrictionChangeByIdempotencyKey,
  getRestrictionChangesByDonationId,
  getDonations,
};
