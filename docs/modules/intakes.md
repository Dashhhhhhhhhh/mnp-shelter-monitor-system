# Animal Intakes Module

## Overview

The Animal Intakes module records how and when an animal entered the M & P Shelter system.

An animal profile must exist before an intake record can be created.

Relationship:

Animal
→ has one or more intake records

Multiple intake records are allowed because an animal may return to the shelter after adoption.

Example:

RESCUE
→ ADOPTED
→ ADOPTION_RETURN

---

## Roles and Permissions

| Action | ADMIN | VOLUNTEER | CARETAKER |
|---|---|---|---|
| Create intake | Yes | Yes | No |
| View animal intake history | Yes | Yes | Yes |
| View specific intake | Yes | Yes | Yes |
| Update intake | Yes | Yes | No |

Caretakers can view intake information for care context but cannot modify official intake history.

---

## API Endpoints

### Create Intake

POST /api/animals/:animalId/intakes

Creates an intake record for an existing animal.

Requires:

- Authentication
- ADMIN or VOLUNTEER role
- Valid animal UUID
- Existing, non-archived animal
- Valid `Idempotency-Key` header

---

### Get Animal Intake History

GET /api/animals/:animalId/intakes

Returns all intake records belonging to one animal.

Records are ordered by:

1. intake date descending
2. created timestamp descending

If the animal exists but has no intake records, the endpoint returns an empty array.

---

### Get Intake by ID

GET /api/intakes/:intakeId

Returns one specific intake record.

Invalid UUID:
- 400 Bad Request

Valid UUID but record does not exist:
- 404 Not Found

---

### Update Intake

PATCH /api/intakes/:intakeId

Allows partial updates to an existing intake.

Only fields included in the request body are modified.

ADMIN and VOLUNTEER only.

---

## Intake Fields

Required when creating an intake:

- intakeDate
- intakeCategory
- intakeSource

Optional:

- foundLocation
- ageAtIntake
- observedCondition
- rescuedByUserId
- outsideRescuerName
- outsideRescuerContact
- notes

System-controlled:

- intakeId
- animalId
- createdBy
- updatedBy
- createdAt
- updatedAt
- idempotencyKey
- idempotencyRequestHash

---

## Intake Categories

Allowed values:

- RESCUE
- SURRENDERED
- ABANDONED_DUMPED
- ADOPTION_RETURN
- TRANSFER
- OTHER

---

## Intake Sources

Allowed values:

- MNP_VOLUNTEER
- OUTSIDE_PERSON
- FOUND_BY_MNP
- UNKNOWN
- OTHER

### Source-specific rules

#### MNP_VOLUNTEER

`rescuedByUserId` is required.

The user must:

- exist
- be active
- have ADMIN or VOLUNTEER role

Outside-rescuer fields are cleared.

#### OUTSIDE_PERSON

`outsideRescuerName` is required.

`outsideRescuerContact` is optional and accepts flexible contact information such as:

- phone number
- email
- Messenger/Facebook information

`rescuedByUserId` is cleared.

#### FOUND_BY_MNP

`rescuedByUserId` is optional.

Outside-rescuer fields are cleared.

#### UNKNOWN / OTHER

Rescuer information is optional.

Notes may be used to provide additional context.

---

## Validation Rules

### Intake Date

Format:

YYYY-MM-DD

The date must:

- be a real calendar date
- not be in the future

The current date is calculated using the `Asia/Manila` timezone rather than UTC.

PostgreSQL `DATE` values are returned as text using:

intake_date::text

This avoids timezone conversion changing the displayed calendar date.

### UUID Validation

UUID format is validated before database lookup for:

- animalId
- intakeId
- rescuedByUserId
- Idempotency-Key

UUID validation only checks format.

The service/database verifies whether referenced records actually exist.

---

## PATCH Behavior

PATCH validation uses `hasOwnProperty()` to distinguish between:

Field omitted:
→ keep existing value

Field explicitly set to null:
→ intentionally clear the value

The service combines:

existing database values
+
incoming PATCH values
=
candidate final state

The final state is then passed through the shared intake-source business-rule helper.

This allows rules to remain valid even when only one field is patched.

Example:

Existing:
intakeSource = OUTSIDE_PERSON

PATCH:
intakeSource = MNP_VOLUNTEER

The service checks the final state and requires a valid `rescuedByUserId`.

---

## Shared Source Validation Helper

`validateIntakeSourceDetails()` is used by both CREATE and PATCH.

Responsibilities:

- enforce source-specific rescuer requirements
- verify internal rescuer existence
- verify rescuer account is active
- verify allowed role
- remove source-incompatible rescuer fields
- return cleaned rescuer values

This prevents CREATE and PATCH from maintaining separate copies of the same business rules.

---

## Idempotency

Creating an intake uses an idempotency key to prevent accidental duplicate records caused by:

- double clicking the submit button
- network retries
- repeated HTTP requests

The client sends:

Idempotency-Key: <UUID>

The database stores:

- idempotency_key
- idempotency_request_hash

Database constraint:

UNIQUE (created_by, idempotency_key)

The request hash is generated using SHA-256 from the normalized intake request data.

### Behavior

New key + valid request:

201 Created

Same key + same request data:

200 OK

The existing intake is returned and no duplicate row is created.

Same key + different request data:

409 Conflict

The key cannot be reused for a different intended operation.

PostgreSQL unique-constraint error `23505` is intercepted by the service and translated into idempotent application behavior.

---

## Layer Responsibilities

Route
→ endpoint and role authorization

Controller
→ reads params, body, authenticated user and Idempotency-Key header

Validation
→ field type, format, enum, UUID and date validation

Service
→ business rules, source relationships, idempotency handling and response mapping

Repository
→ PostgreSQL SELECT, INSERT and UPDATE queries

Database
→ foreign keys, check constraints and idempotency unique constraint

---

## Database Migrations

Relevant Intake migrations include:

004_create_animal_intakes.sql

026_add_intake_idempotency_key.sql

027_add_intake_idempotency_request_hash.sql

---

## Current Design Decisions

Intake records are historical records and are not currently archived or hard-deleted.

Incorrect information can be corrected through PATCH.

Future consideration:

Admin-only intake voiding with:

- voided_at
- voided_by
- void_reason

This is deferred until the real shelter workflow demonstrates a need for it.

---

## Tested Scenarios

The module has been tested for:

- successful intake creation
- intake history retrieval
- specific intake retrieval
- partial updates
- invalid UUIDs
- nonexistent records
- intake-source switching
- rescuer-field cleanup
- required rescuer rules
- idempotent replay
- idempotency-key conflict
- Manila calendar-date handling
