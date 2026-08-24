import { getCurrentManilaDate } from "../../utils/date.js";

function validateCreateIntakeInput(intakeData) {
  if (
    !intakeData.intakeDate ||
    !intakeData.intakeCategory ||
    !intakeData.intakeSource
  ) {
    const error = new Error("Intake date, category, and source are required");
    error.statusCode = 400;
    throw error;
  }

  if (
    typeof intakeData.intakeDate !== "string" ||
    typeof intakeData.intakeCategory !== "string" ||
    typeof intakeData.intakeSource !== "string"
  ) {
    const error = new Error(
      "Intake date, category, and source must be strings",
    );
    error.statusCode = 400;
    throw error;
  }

  const intakeCategory = intakeData.intakeCategory.trim().toUpperCase();

  const intakeSource = intakeData.intakeSource.trim().toUpperCase();

  const allowedIntakeCategories = [
    "RESCUE",
    "SURRENDERED",
    "ABANDONED_DUMPED",
    "ADOPTION_RETURN",
    "TRANSFER",
    "OTHER",
  ];

  const allowedIntakeSources = [
    "MNP_VOLUNTEER",
    "OUTSIDE_PERSON",
    "FOUND_BY_MNP",
    "UNKNOWN",
    "OTHER",
  ];

  if (!allowedIntakeCategories.includes(intakeCategory)) {
    const error = new Error("Invalid intake category");
    error.statusCode = 400;
    throw error;
  }

  if (!allowedIntakeSources.includes(intakeSource)) {
    const error = new Error("Invalid intake source");
    error.statusCode = 400;
    throw error;
  }

  // Intake date
  const intakeDate = intakeData.intakeDate.trim();

  const intakeDatePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!intakeDatePattern.test(intakeDate)) {
    const error = new Error("Intake date must be in YYYY-MM-DD format");
    error.statusCode = 400;
    throw error;
  }

  const parsedDate = new Date(`${intakeDate}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== intakeDate
  ) {
    const error = new Error("Intake date is invalid");
    error.statusCode = 400;
    throw error;
  }

  const today = getCurrentManilaDate();
  if (intakeDate > today) {
    const error = new Error("Intake date cannot be in the future");
    error.statusCode = 400;
    throw error;
  }

  // Found location
  let foundLocation = null;

  if (intakeData.foundLocation != null) {
    if (typeof intakeData.foundLocation !== "string") {
      const error = new Error("Found location must be a string");
      error.statusCode = 400;
      throw error;
    }

    foundLocation = intakeData.foundLocation.trim() || null;

    if (foundLocation && foundLocation.length > 255) {
      const error = new Error("Found location must not exceed 255 characters");
      error.statusCode = 400;
      throw error;
    }
  }

  // Age at intake
  let ageAtIntake = null;

  if (intakeData.ageAtIntake != null) {
    if (typeof intakeData.ageAtIntake !== "string") {
      const error = new Error("Age at intake must be a string");
      error.statusCode = 400;
      throw error;
    }

    ageAtIntake = intakeData.ageAtIntake.trim() || null;

    if (ageAtIntake && ageAtIntake.length > 50) {
      const error = new Error("Age at intake must not exceed 50 characters");
      error.statusCode = 400;
      throw error;
    }
  }

  // Observed condition
  let observedCondition = null;

  if (intakeData.observedCondition != null) {
    if (typeof intakeData.observedCondition !== "string") {
      const error = new Error("Observed condition must be a string");
      error.statusCode = 400;
      throw error;
    }

    observedCondition = intakeData.observedCondition.trim() || null;
  }

  // Internal rescuer
  let rescuedByUserId = null;

  if (intakeData.rescuedByUserId != null) {
    if (typeof intakeData.rescuedByUserId !== "string") {
      const error = new Error("Rescued by user ID must be a string");
      error.statusCode = 400;
      throw error;
    }

    rescuedByUserId = intakeData.rescuedByUserId.trim();

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(rescuedByUserId)) {
      const error = new Error("Invalid rescued by user ID");
      error.statusCode = 400;
      throw error;
    }
  }

  // Outside rescuer
  let outsideRescuerName = null;

  if (intakeData.outsideRescuerName != null) {
    if (typeof intakeData.outsideRescuerName !== "string") {
      const error = new Error("Outside rescuer name must be a string");
      error.statusCode = 400;
      throw error;
    }

    outsideRescuerName = intakeData.outsideRescuerName.trim() || null;

    if (outsideRescuerName && outsideRescuerName.length > 100) {
      const error = new Error(
        "Outside rescuer name must not exceed 100 characters",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  let outsideRescuerContact = null;

  if (intakeData.outsideRescuerContact != null) {
    if (typeof intakeData.outsideRescuerContact !== "string") {
      const error = new Error("Outside rescuer contact must be a string");
      error.statusCode = 400;
      throw error;
    }

    outsideRescuerContact = intakeData.outsideRescuerContact.trim() || null;

    if (outsideRescuerContact && outsideRescuerContact.length > 100) {
      const error = new Error(
        "Outside rescuer contact must not exceed 100 characters",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Notes
  let notes = null;

  if (intakeData.notes != null) {
    if (typeof intakeData.notes !== "string") {
      const error = new Error("Notes must be a string");
      error.statusCode = 400;
      throw error;
    }

    notes = intakeData.notes.trim() || null;
  }

  // Source-specific rules
  if (intakeSource === "MNP_VOLUNTEER" && !rescuedByUserId) {
    const error = new Error("Rescued by user ID is required for MNP_VOLUNTEER");
    error.statusCode = 400;
    throw error;
  }

  if (intakeSource === "OUTSIDE_PERSON" && !outsideRescuerName) {
    const error = new Error(
      "Outside rescuer name is required for OUTSIDE_PERSON",
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    intakeDate,
    intakeCategory,
    intakeSource,
    foundLocation,
    ageAtIntake,
    observedCondition,
    rescuedByUserId,
    outsideRescuerName,
    outsideRescuerContact,
    notes,
  };
}

function validateIntakeId(intakeId) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (typeof intakeId !== "string" || !uuidRegex.test(intakeId)) {
    const error = new Error("Invalid intake ID");
    error.statusCode = 400;
    throw error;
  }

  return intakeId;
}

function validateUpdateIntakeInput(intakeData) {
  const hasField = (field) =>
    Object.prototype.hasOwnProperty.call(intakeData, field);

  const updates = {};

  if (hasField("notes")) {
    if (intakeData.notes !== null && typeof intakeData.notes !== "string") {
      const error = new Error("Notes must be a string or null");
      error.statusCode = 400;
      throw error;
    }

    updates.notes =
      typeof intakeData.notes === "string"
        ? intakeData.notes.trim() || null
        : null;
  }

  if (hasField("foundLocation")) {
    if (
      intakeData.foundLocation !== null &&
      typeof intakeData.foundLocation !== "string"
    ) {
      const error = new Error("Found location must be a string or null");
      error.statusCode = 400;
      throw error;
    }

    const foundLocation =
      typeof intakeData.foundLocation === "string"
        ? intakeData.foundLocation.trim() || null
        : null;

    if (foundLocation && foundLocation.length > 255) {
      const error = new Error("Found location must not exceed 255 characters");
      error.statusCode = 400;
      throw error;
    }

    updates.foundLocation = foundLocation;
  }

  if (hasField("ageAtIntake")) {
    if (
      intakeData.ageAtIntake !== null &&
      typeof intakeData.ageAtIntake !== "string"
    ) {
      const error = new Error("Age at intake musst be a string or null");
      error.statusCode = 400;
      throw error;
    }

    const ageAtIntake =
      typeof intakeData.ageAtIntake === "string"
        ? intakeData.ageAtIntake.trim() || null
        : null;

    if (ageAtIntake && ageAtIntake.length > 50) {
      const error = new Error("Age at intake must not exceed 50 characters");
      error.statusCode = 400;
      throw error;
    }

    updates.ageAtIntake = ageAtIntake;
  }

  if (hasField("observedCondition")) {
    if (
      intakeData.observedCondition !== null &&
      typeof intakeData.observedCondition !== "string"
    ) {
      const error = new Error("Observe condition musst be a string or null");
      error.statusCode = 400;
      throw error;
    }

    const observedCondition =
      typeof intakeData.observedCondition === "string"
        ? intakeData.observedCondition.trim() || null
        : null;

    updates.observedCondition = observedCondition;

    if (hasField("outsideRescuerName")) {
      if (
        intakeData.outsideRescuerName !== null &&
        typeof intakeData.outsideRescuerName !== "string"
      ) {
        const error = new Error(
          "Outside rescuer name must be a string or null",
        );
        error.statusCode = 400;
        throw error;
      }

      const outsideRescuerName =
        typeof intakeData.outsideRescuerName === "string"
          ? intakeData.outsideRescuerName.trim() || null
          : null;

      if (outsideRescuerName && outsideRescuerName.length > 100) {
        const error = new Error(
          "Outside rescuer name must not exceed 100 characters",
        );
        error.statusCode = 400;
        throw error;
      }

      updates.outsideRescuerName = outsideRescuerName;
    }

    if (hasField("outsideRescuerContact")) {
      if (
        intakeData.outsideRescuerContact !== null &&
        typeof intakeData.outsideRescuerContact !== "string"
      ) {
        const error = new Error(
          "Outside rescuer contact must be a string or null",
        );
        error.statusCode = 400;
        throw error;
      }

      const outsideRescuerContact =
        typeof intakeData.outsideRescuerContact === "string"
          ? intakeData.outsideRescuerContact.trim() || null
          : null;

      if (outsideRescuerContact && outsideRescuerContact.length > 100) {
        const error = new Error(
          "Outside rescuer contact must not exceed 100 characters",
        );
        error.statusCode = 400;
        throw error;
      }
      updates.outsideRescuerContact = outsideRescuerContact;
    }
  }

  if (hasField("intakeDate")) {
    if (typeof intakeData.intakeDate !== "string") {
      const error = new Error("Intake date must be a string");
      error.statusCode = 400;
      throw error;
    }

    const intakeDate = intakeData.intakeDate.trim();

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(intakeDate)) {
      const error = new Error("Intake date must be in YYYY-MM-DD format");
      error.statusCode = 400;
      throw error;
    }

    const parsedDate = new Date(`${intakeDate}T00:00:00Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== intakeDate
    ) {
      const error = new Error("Intake date is invalid");
      error.statusCode = 400;
      throw error;
    }

    const today = getCurrentManilaDate();
    if (intakeDate > today) {
      const error = new Error("Intake date cannot be in the future");
      error.statusCode = 400;
      throw error;
    }

    updates.intakeDate = intakeDate;
  }

  if (hasField("intakeCategory")) {
    if (typeof intakeData.intakeCategory !== "string") {
      const error = new Error("Intake category must be a string");
      error.statusCode = 400;
      throw error;
    }

    const intakeCategory = intakeData.intakeCategory.trim().toUpperCase();

    const allowedIntakeCategories = [
      "RESCUE",
      "SURRENDERED",
      "ABANDONED_DUMPED",
      "ADOPTION_RETURN",
      "TRANSFER",
      "OTHER",
    ];

    if (!allowedIntakeCategories.includes(intakeCategory)) {
      const error = new Error(
        "Intake category must be RESCUE, SURRENDERED, ABANDONED_DUMPED, ADOPTION_RETURN, TRANSFER, or OTHER",
      );
      error.statusCode = 400;
      throw error;
    }

    updates.intakeCategory = intakeCategory;
  }

  if (hasField("intakeSource")) {
    if (typeof intakeData.intakeSource !== "string") {
      const error = new Error("Intake source must be a string");
      error.statusCode = 400;
      throw error;
    }

    const intakeSource = intakeData.intakeSource.trim().toUpperCase();

    const allowedIntakeSources = [
      "MNP_VOLUNTEER",
      "OUTSIDE_PERSON",
      "FOUND_BY_MNP",
      "UNKNOWN",
      "OTHER",
    ];

    if (!allowedIntakeSources.includes(intakeSource)) {
      const error = new Error(
        "Intake source must be MNP_VOLUNTEER, OUTSIDE_PERSON, FOUND_BY_MNP, UNKNOWN, or OTHER",
      );
      error.statusCode = 400;
      throw error;
    }

    updates.intakeSource = intakeSource;
  }

  if (hasField("rescuedByUserId")) {
    if (
      intakeData.rescuedByUserId !== null &&
      typeof intakeData.rescuedByUserId !== "string"
    ) {
      const error = new Error("Rescued by user ID must be a string or null");
      error.statusCode = 400;
      throw error;
    }

    const rescuedByUserId =
      typeof intakeData.rescuedByUserId === "string"
        ? intakeData.rescuedByUserId.trim() || null
        : null;

    if (rescuedByUserId) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(rescuedByUserId)) {
        const error = new Error("Rescued by user ID must be a valid UUID");
        error.statusCode = 400;
        throw error;
      }
    }

    updates.rescuedByUserId = rescuedByUserId;
  }

  if (Object.keys(updates).length === 0) {
    const error = new Error(
      "At least one intake field must be provided for update",
    );
    error.statusCode = 400;
    throw error;
  }

  return updates;
}

export { validateCreateIntakeInput, validateIntakeId, validateUpdateIntakeInput };
