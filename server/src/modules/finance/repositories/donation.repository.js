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

async function getDonations(filters, db = pool) {
  const {
    limit,
    offset,
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
  } = filters;

  const conditions = [];
  const values = [];

  function addCondition(condition, value) {
    values.push(value);
    conditions.push(condition.replace("?", `$${values.length}`));
  }

  if (donationType !== null) {
    addCondition("donation_type = ?", donationType);
  }

  if (paymentMethod !== null) {
    addCondition("payment_method = ?", paymentMethod);
  }

  if (fundRestriction !== null) {
    addCondition("fund_restriction = ?", fundRestriction);
  }

  if (restrictionCategory !== null) {
    addCondition("restriction_category = ?", restrictionCategory);
  }

  if (isVoided === true) {
    conditions.push("voided_at IS NOT NULL");
  }

  if (isVoided === false) {
    conditions.push("voided_at IS NULL");
  }

  if (search !== null) {
    addCondition("donor_name ILIKE '%' || ? || '%'", search);
  }

  if (dateFrom !== null) {
    addCondition("donated_at >= ?", dateFrom);
  }

  if (dateTo !== null) {
    addCondition("donated_at <= ?", dateTo);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sortColumns = {
    donatedAt: "donated_at",
    monetaryAmount: "monetary_amount",
    createdAt: "created_at",
    donorName: "donor_name",
  };

  const sortColumn = sortColumns[sortBy];

  const countResult = await db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM donations
      ${whereClause}
    `,
    values,
  );

  const queryValues = [...values, limit, offset];

  const limitPlaceholder = `$${values.length + 1}`;
  const offsetPlaceholder = `$${values.length + 2}`;

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
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
    `,
    queryValues,
  );

  return {
    donations: result.rows,
    total: countResult.rows[0].total,
  };
}

async function findDonationItemByIdForUpdate(donationItemId, db = pool) {
  const result = await db.query(
    `
      SELECT
        di.donation_item_id,
        di.donation_id,
        di.inventory_item_id,
        di.quantity::text AS donated_quantity,
        di.unit AS donated_unit,
        d.donation_type,
        d.voided_at
      FROM donation_items di
      JOIN donations d
        ON d.donation_id = di.donation_id
      WHERE di.donation_item_id = $1
      FOR UPDATE OF di, d
    `,
    [donationItemId],
  );

  return result.rows[0] || null;
}

async function createDonationItem(
  { donation_id, inventory_item_id, item_name, quantity, unit, notes },
  db = pool,
) {
  const result = await db.query(
    `
      INSERT INTO donation_items (
        donation_id,
        inventory_item_id,
        item_name,
        quantity,
        unit,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        donation_item_id,
        donation_id,
        inventory_item_id,
        item_name,
        quantity::text AS quantity,
        unit,
        notes
    `,
    [donation_id, inventory_item_id, item_name, quantity, unit, notes],
  );

  return result.rows[0];
}

async function getDonationItemsByDonationId(donationId, db = pool) {
  const result = await db.query(
    `
      SELECT
        donation_item_id,
        donation_id,
        inventory_item_id,
        item_name,
        quantity::text AS quantity,
        unit,
        notes
      FROM donation_items
      WHERE donation_id = $1
      ORDER BY donation_item_id
    `,
    [donationId],
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
  findDonationItemByIdForUpdate,
  createDonationItem,
  getDonationItemsByDonationId,
};
