# Preventive Care Module

## Overview

The Preventive Care module records completed preventive health procedures for shelter animals.

Currently supported preventive care types are:

- `VACCINATION`
- `DEWORMING`

A preventive care record represents a **historical care event that has already been performed**.

It is not a scheduling/task system.

Future preventive care is represented using the optional `nextDueDate` field. The API derives a `dueStatus` from this date instead of storing the status in the database.

---

## Module Location

```text
src/modules/preventive_care/
├── preventiveCare.controller.js
├── preventiveCare.repository.js
├── preventiveCare.routes.js
├── preventiveCare.service.js
└── preventiveCare.validation.js
```

The router is mounted in:

```text
src/app.js
```

using:

```js
app.use("/api", preventiveCareRouter);
```

---

# Database

Preventive care records are stored in:

```text
preventive_care_records
```

The table was originally created in:

```text
011_create_preventive_care_records.sql
```

Important fields include:

| Field                | Description                        |
| -------------------- | ---------------------------------- |
| `preventive_care_id` | UUID primary key                   |
| `animal_id`          | Animal receiving preventive care   |
| `medical_record_id`  | Optional related medical record    |
| `care_type`          | `VACCINATION` or `DEWORMING`       |
| `date_given`         | Date preventive care was performed |
| `product_name`       | Optional vaccine/deworming product |
| `dose`               | Optional dosage information        |
| `next_due_date`      | Optional next recommended date     |
| `clinic`             | Optional clinic                    |
| `vet_name`           | Optional veterinarian              |
| `notes`              | Optional additional notes          |
| `created_by`         | User who created the record        |
| `updated_by`         | User who last updated the record   |
| `created_at`         | Creation timestamp                 |
| `updated_at`         | Last update timestamp              |

Database constraints also ensure:

```text
care_type IN ('VACCINATION', 'DEWORMING')
```

and:

```text
next_due_date IS NULL
OR next_due_date >= date_given
```

---

# Roles and Access

The following roles may use the Preventive Care module:

- `ADMIN`
- `VOLUNTEER`
- `CARETAKER`

All three roles may:

- Create preventive care records
- View preventive care records
- View preventive care for a specific animal
- Update preventive care records

There is currently **no delete endpoint**.

All routes require authentication.

---

# API Routes

## Create Preventive Care

```http
POST /api/preventive-care
```

Allowed roles:

```text
ADMIN
VOLUNTEER
CARETAKER
```

### Required Fields

```text
animalId
careType
dateGiven
```

### Optional Fields

```text
medicalRecordId
productName
dose
nextDueDate
clinic
vetName
notes
```

### Example Request

```json
{
  "animalId": "1ebf59a1-6ddd-415a-bc17-bb5d865b87b1",
  "medicalRecordId": null,
  "careType": "VACCINATION",
  "dateGiven": "2026-08-25",
  "productName": "Example Vaccine",
  "dose": "1 mL",
  "nextDueDate": "2027-08-25",
  "clinic": "Example Veterinary Clinic",
  "vetName": "Dr. Example",
  "notes": "Annual vaccination"
}
```

### Successful Response

```http
201 Created
```

Example:

```json
{
  "success": true,
  "preventiveCare": {
    "preventiveCareId": "uuid",
    "animalId": "uuid",
    "medicalRecordId": null,
    "animalCode": null,
    "animalName": null,
    "careType": "VACCINATION",
    "dateGiven": "2026-08-25",
    "productName": "Example Vaccine",
    "dose": "1 mL",
    "nextDueDate": "2027-08-25",
    "clinic": "Example Veterinary Clinic",
    "vetName": "Dr. Example",
    "notes": "Annual vaccination",
    "dueStatus": "UPCOMING",
    "createdBy": "uuid",
    "updatedBy": "uuid",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

Note:

The create repository response does not join the `animals` table, so `animalCode` and `animalName` may not be populated on the immediate create response depending on the returned row.

Subsequent GET operations include the animal information through a database join.

---

# Get All Preventive Care Records

```http
GET /api/preventive-care
```

Allowed roles:

```text
ADMIN
VOLUNTEER
CARETAKER
```

### Successful Response

```http
200 OK
```

```json
{
  "success": true,
  "preventiveCareRecords": []
}
```

Records are ordered by:

```text
date_given DESC
created_at DESC
```

Newest preventive care events therefore appear first.

---

# Get One Preventive Care Record

```http
GET /api/preventive-care/:preventiveCareId
```

Allowed roles:

```text
ADMIN
VOLUNTEER
CARETAKER
```

### Successful Response

```http
200 OK
```

### Invalid UUID

```http
400 Bad Request
```

Example:

```json
{
  "success": false,
  "message": "Invalid preventive care ID"
}
```

### Record Does Not Exist

```http
404 Not Found
```

```json
{
  "success": false,
  "message": "Preventive care record not found"
}
```

---

# Get Preventive Care by Animal

```http
GET /api/animals/:animalId/preventive-care
```

Allowed roles:

```text
ADMIN
VOLUNTEER
CARETAKER
```

The animal must exist.

If the animal exists but has no preventive care history:

```http
200 OK
```

```json
{
  "success": true,
  "preventiveCareRecords": []
}
```

If the animal does not exist:

```http
404 Not Found
```

---

# Update Preventive Care

```http
PATCH /api/preventive-care/:preventiveCareId
```

Allowed roles:

```text
ADMIN
VOLUNTEER
CARETAKER
```

The following fields may be updated:

```text
animalId
medicalRecordId
careType
dateGiven
productName
dose
nextDueDate
clinic
vetName
notes
```

Audit fields are controlled by the server.

The client does not directly provide:

```text
createdBy
updatedBy
createdAt
updatedAt
dueStatus
```

`updatedBy` comes from the authenticated user.

`updatedAt` is generated by the database.

---

## Partial Update Behavior

PATCH only changes fields explicitly supplied by the client.

For example:

```json
{
  "dose": "1.5 mL",
  "notes": "Updated by caretaker"
}
```

does not overwrite unrelated fields.

The repository dynamically builds a parameterized SQL `UPDATE` statement using only validated fields.

---

## Empty PATCH

A PATCH request must contain at least one supported preventive care field.

Example:

```json
{}
```

returns:

```http
400 Bad Request
```

```json
{
  "success": false,
  "message": "At least one preventive care field must be provided"
}
```

---

# Business Rules

## 1. Preventive Care Represents Completed Care

A preventive care record represents something that has already happened.

Therefore:

```text
dateGiven <= current date in Asia/Manila
```

A future `dateGiven` is rejected.

Example:

```json
{
  "dateGiven": "future-date"
}
```

returns:

```http
409 Conflict
```

with:

```text
Date given cannot be in the future
```

---

## 2. Supported Care Types

Only:

```text
VACCINATION
DEWORMING
```

are accepted.

Input is normalized using:

```text
trim()
toUpperCase()
```

For example:

```text
vaccination
```

becomes:

```text
VACCINATION
```

Any unsupported type returns:

```http
400 Bad Request
```

with:

```text
Care type must be VACCINATION or DEWORMING
```

---

# Date Validation

Dates must use:

```text
YYYY-MM-DD
```

The validator also checks that the date is a real calendar date.

For example:

```text
2026-02-31
```

is rejected even though it matches the basic `YYYY-MM-DD` pattern.

Example error:

```http
400 Bad Request
```

```text
Date given must be a valid calendar date
```

---

# Next Due Date

`nextDueDate` is optional.

It may represent:

- A future preventive care date
- A care event due today
- A care event that has become overdue
- A historical recommended date

The API does not automatically calculate this field.

It is entered by staff because vaccination and deworming schedules may vary depending on:

- Product
- Animal
- Vet recommendation
- Age
- Medical condition
- Treatment history

---

## Date Relationship Rule

If `nextDueDate` exists:

```text
nextDueDate >= dateGiven
```

Example invalid state:

```text
dateGiven    = 2026-08-25
nextDueDate  = 2026-08-20
```

returns:

```http
400 Bad Request
```

with:

```text
Next due date cannot be earlier than date given
```

---

# Final-State PATCH Validation

The service does not validate PATCH fields independently only.

It calculates the final state using:

```text
existing database values
+
validated PATCH values
```

This prevents a partial PATCH from producing an invalid record.

Example existing record:

```text
dateGiven   = 2026-08-10
nextDueDate = 2026-08-20
```

Request:

```json
{
  "dateGiven": "2026-08-25"
}
```

Although only one field is being updated, the resulting state would become:

```text
dateGiven   = 2026-08-25
nextDueDate = 2026-08-20
```

which is invalid.

The request is therefore rejected.

The same final-state approach is used for:

```text
animalId + medicalRecordId
```

relationships.

---

# Medical Record Relationship

`medicalRecordId` is optional.

A preventive care record may exist without a medical record.

For example:

```json
{
  "medicalRecordId": null
}
```

is valid.

If a medical record is supplied:

1. The medical record must exist.
2. The medical record must belong to the same animal as the preventive care record.

---

## Missing Medical Record

A valid UUID referencing a nonexistent medical record returns:

```http
404 Not Found
```

```json
{
  "success": false,
  "message": "Medical record not found"
}
```

---

## Medical Record / Animal Mismatch

Example:

```text
preventive care animal = Animal A
medical record animal  = Animal B
```

returns:

```http
409 Conflict
```

with:

```text
Medical record animal does not match the preventive care animal
```

This prevents medical history from one animal being accidentally linked to another.

---

# Changing Relationships During PATCH

If either:

```text
animalId
medicalRecordId
```

is changed, the service calculates the final relationship.

Conceptually:

```text
nextAnimalId =
  new animalId if provided
  otherwise existing animalId

nextMedicalRecordId =
  new medicalRecordId if provided
  otherwise existing medicalRecordId
```

The service then validates that final combination.

This protects against inconsistent partial updates.

---

# Animal Validation

The referenced animal must exist.

A preventive care record may still belong to an animal whose current lifecycle status is no longer `ACTIVE`.

Preventive care is historical medical information and should remain accessible even after an animal has:

- Been adopted
- Left the shelter
- Changed lifecycle status

Historical medical records should not disappear simply because the animal is no longer currently active in shelter operations.

---

# Clearing Optional Fields

Nullable optional values can be explicitly cleared.

For example:

```json
{
  "medicalRecordId": null
}
```

removes the medical-record relationship.

Likewise:

```json
{
  "nextDueDate": null
}
```

removes the next due date.

The derived status will then become:

```text
NO_DUE_DATE
```

Optional text fields containing only whitespace are normalized to:

```text
null
```

---

# Derived Due Status

`dueStatus` is not stored in PostgreSQL.

It is calculated by the service whenever a preventive care record is returned.

The current date is calculated using:

```text
Asia/Manila
```

timezone.

Possible statuses:

| Condition                  | dueStatus     |
| -------------------------- | ------------- |
| `nextDueDate` is null      | `NO_DUE_DATE` |
| `nextDueDate` before today | `OVERDUE`     |
| `nextDueDate` equals today | `DUE`         |
| `nextDueDate` after today  | `UPCOMING`    |

Example:

```text
Today:       2026-08-28
Next due:    2026-09-28
```

returns:

```text
UPCOMING
```

Example:

```text
Today:       2026-08-28
Next due:    2026-08-28
```

returns:

```text
DUE
```

Example:

```text
Today:       2026-08-28
Next due:    2026-08-20
```

returns:

```text
OVERDUE
```

Because this value is derived rather than stored, it automatically changes as time passes without requiring a database update.

---

# Field Validation

## UUID Fields

The following fields must contain valid UUIDs when provided:

```text
preventiveCareId
animalId
medicalRecordId
```

---

## Product Name

Maximum:

```text
150 characters
```

Violation:

```http
400 Bad Request
```

```text
Product name must not exceed 150 characters
```

---

## Dose

Maximum:

```text
100 characters
```

Violation:

```http
400 Bad Request
```

```text
Dose must not exceed 100 characters
```

---

## Clinic

Maximum:

```text
150 characters
```

Violation:

```http
400 Bad Request
```

```text
Clinic must not exceed 150 characters
```

---

## Vet Name

Maximum:

```text
100 characters
```

Violation:

```http
400 Bad Request
```

```text
Vet name must not exceed 100 characters
```

---

## Notes

`notes` uses a PostgreSQL `TEXT` column.

It is optional.

Blank strings are normalized to:

```text
null
```

---

# Validation Responsibilities

The module separates validation and business logic.

## Validation Layer

Responsible for rules such as:

- Request body must be an object
- UUID format
- Supported care type
- String validation
- Maximum lengths
- Date format
- Real calendar dates
- Basic date chronology
- Empty PATCH rejection
- Normalization

---

## Service Layer

Responsible for rules requiring application/database context, including:

- Animal existence
- Medical record existence
- Animal ↔ medical record relationship
- Current Manila date
- Preventing future `dateGiven`
- PATCH final-state validation
- Derived `dueStatus`

This maintains separation between basic input validation and business logic.

---

# Repository Responsibilities

The repository is responsible for PostgreSQL access only.

Responsibilities include:

- Find preventive care by ID
- Insert preventive care
- List all preventive care
- List preventive care by animal
- Update preventive care

Queries use PostgreSQL parameter placeholders:

```text
$1
$2
$3
...
```

Client values are never directly interpolated into SQL.

The dynamic PATCH repository only dynamically generates trusted column assignments defined by application code.

---

# Controller Responsibilities

Controllers remain intentionally thin.

They:

1. Read request data.
2. Call the service.
3. Return the HTTP response.
4. Pass errors to the global error handler.

Business logic is not implemented inside the controller.

---

# API Mapping

Database rows use PostgreSQL snake_case naming.

Example:

```text
preventive_care_id
medical_record_id
date_given
next_due_date
created_by
```

The service mapper converts these to API camelCase:

```text
preventiveCareId
medicalRecordId
dateGiven
nextDueDate
createdBy
```

The mapper also adds:

```text
animalCode
animalName
dueStatus
```

This keeps the external API response independent from the database naming convention.

---

# Error Status Summary

| Scenario                                 | Status |
| ---------------------------------------- | -----: |
| Invalid input                            |  `400` |
| Invalid UUID                             |  `400` |
| Invalid date format                      |  `400` |
| Invalid calendar date                    |  `400` |
| Invalid care type                        |  `400` |
| Empty PATCH                              |  `400` |
| `nextDueDate < dateGiven`                |  `400` |
| Missing animal                           |  `404` |
| Missing preventive care record           |  `404` |
| Missing medical record                   |  `404` |
| Medical record belongs to another animal |  `409` |
| Future `dateGiven`                       |  `409` |
| Update cannot be completed               |  `409` |
| Unexpected server failure                |  `500` |

Unexpected internal errors are handled by the application's global error handler.

---

# Manual Testing Completed

The Preventive Care module was manually tested before completion.

Tests included:

- Create vaccination
- Create deworming
- Create without medical record
- Create with valid medical record
- Reject mismatched animal and medical record
- Reject nonexistent medical record
- Reject future `dateGiven`
- Reject invalid date chronology
- Derive `UPCOMING`
- Derive `DUE`
- Derive `OVERDUE`
- Derive `NO_DUE_DATE`
- GET one record
- GET all records
- GET records by animal
- Existing animal with no records returns `[]`
- PATCH ordinary fields
- PATCH partial date causing invalid final state
- Clear `nextDueDate`
- Clear `medicalRecordId`
- CARETAKER create
- CARETAKER update
- Invalid preventive care UUID
- Missing preventive care record
- Empty PATCH
- Invalid care type
- Impossible calendar date
- Product name length limit
- Dose length limit
- Clinic length limit
- Vet name length limit

---

# Code Verification

All Preventive Care JavaScript files were checked using:

```bash
for file in src/modules/preventive_care/*.js; do
  node --check "$file" || exit 1
done
```

All files passed syntax checking.

Debug logging was checked using:

```bash
grep -R "console.log\|console.error" src/modules/preventive_care
```

No debug logging remained in the module.

---

# Design Decisions

## Why Preventive Care Is Separate From Medical Records

Medical Records represent broader medical encounters such as:

- Illness
- Injury
- Diagnosis
- Treatment
- Clinic visits

Preventive Care represents routine preventative procedures such as:

- Vaccination
- Deworming

Keeping them separate allows simpler reporting and easier future notification logic.

For example:

```text
Show all animals with overdue vaccinations
```

does not require analyzing general medical records.

---

## Why `dueStatus` Is Not Stored

A stored status such as:

```text
UPCOMING
```

could become incorrect automatically when time passes.

For example:

```text
Today        → UPCOMING
Due date     → tomorrow
```

Tomorrow that same row should become:

```text
DUE
```

and later:

```text
OVERDUE
```

without anybody editing the record.

Therefore only:

```text
next_due_date
```

is stored.

The API calculates the current status dynamically.

---

## Why There Is No Delete Endpoint

Preventive Care is medical history.

Deleting vaccination or deworming history could remove information needed for:

- Shelter staff
- Veterinarians
- Adoption records
- Future medical decisions
- Audit/history purposes

For the current MVP, records can be corrected using PATCH but are not deleted through the API.

---

# Future Integration

The module can later support the Notifications and Reports modules.

Examples:

```text
Vaccination due today
Vaccination overdue
Deworming due soon
Animals without upcoming preventive care dates
Preventive procedures completed this month
```

These future features can use:

```text
next_due_date
care_type
date_given
```

without changing the current Preventive Care data model.

---

# Module Status

```text
Database              COMPLETE
Validation            COMPLETE
Repository            COMPLETE
Service               COMPLETE
Controller            COMPLETE
Routes / RBAC          COMPLETE
Manual API Testing    COMPLETE
Syntax Verification   COMPLETE
Final Review          COMPLETE
Documentation         COMPLETE
```

The Preventive Care backend module is considered complete for the current M & P Shelter Monitoring System MVP.
