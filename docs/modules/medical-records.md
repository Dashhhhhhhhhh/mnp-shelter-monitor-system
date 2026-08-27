Medical Records Module

Overview

The Medical Records module stores and manages medical history for shelter animals.

It supports medical events such as:

veterinary visits

treatments

follow-up care

other medical events

Medical records may be created manually or linked to an Observation that has already been escalated to medical attention.

The module is designed to preserve historical medical information even when an animal's current lifecycle status later changes.

Architecture

The module follows the backend layered architecture:

Route
↓
Middleware
↓
Controller
↓
Service
↓
Repository
↓
PostgreSQL

Module location:

src/modules/medical/
├── medical.routes.js
├── medical.controller.js
├── medical.service.js
├── medical.repository.js
└── medical.validation.js

Supporting modules used by Medical Records:

animals
observations
authentication
RBAC

Database

The primary table is:

medical_records

Main fields:

medical_record_id
animal_id
observation_id
medical_type
medical_date
reason
clinic
vet_name
diagnosis
treatment
follow_up_date
notes
created_by
updated_by
created_at
updated_at

Required and Optional Fields

Required fields:

animalId
medicalType
medicalDate
reason

Optional fields:

observationId
clinic
vetName
diagnosis
treatment
followUpDate
notes

Medical Types

Allowed values:

VET_VISIT
TREATMENT
FOLLOW_UP
OTHER

Input is normalized using:

trim()
toUpperCase()

Invalid values return 400 Bad Request.

Historical Medical Records

A Medical Record may be created for any existing non-archived animal regardless of the animal's current lifecycle status.

This allows legitimate historical medical information to be entered later even if the animal is now adopted, passed away, missing, or escaped.

Observation Relationship

observationId is optional.

If supplied, the service requires:

observation exists
↓
observation status = ESCALATED_TO_MEDICAL
↓
observation has an animalId
↓
observation animalId matches medical record animalId

Cage-level observations with animalId = null cannot be linked directly to an animal Medical Record.

One escalated Observation may link to multiple Medical Records.

Date Rules

medicalDate:

required
must be a valid YYYY-MM-DD calendar date
may be today
may be in the past
may NOT be in the future

Future-date comparison uses Asia/Manila business time.

followUpDate is optional.

If provided:

must be a real YYYY-MM-DD calendar date
must be >= medicalDate

The database also enforces that follow-up date cannot be earlier than medical date.

Partial Update Date Validation

PATCH may provide only one date field.

The service combines incoming values with the existing database values and validates the final state.

Example:

existing medicalDate = 2026-08-20
existing followUpDate = 2026-08-25

PATCH medicalDate = 2026-08-26

Final state would be invalid because:

2026-08-25 < 2026-08-26

so the service returns 400 Bad Request.

Text Validation

reason is required, trimmed, and cannot be blank.

Optional text fields:

clinic
vetName
diagnosis
treatment
notes

normalize blank values to null.

Database length protection is mirrored in validation:

clinic → maximum 150 characters
vetName → maximum 100 characters

Exceeding the limit returns 400 Bad Request.

Role-Based Access Control

Permissions:

ADMIN
→ create
→ read
→ update

VOLUNTEER
→ create
→ read
→ update

CARETAKER
→ read only

DELETE is not supported for the MVP.

Routes

Method

Endpoint

ADMIN

VOLUNTEER

CARETAKER

POST

/api/medical-records

✅

✅

❌

GET

/api/medical-records

✅

✅

✅

GET

/api/medical-records/:medicalRecordId

✅

✅

✅

PATCH

/api/medical-records/:medicalRecordId

✅

✅

❌

GET

/api/animals/:animalId/medical-records

✅

✅

✅

All routes require authentication.

Dynamic PATCH Pattern

PATCH updates only fields supplied by the client.

The repository uses:

hasOwnProperty checks
↓
dynamic SET fields
↓
parameterized values
↓
UPDATE

Omitted fields remain unchanged.

An explicitly supplied null can clear nullable fields such as observationId.

Reading and Ordering

GET /api/medical-records and animal medical history use:

medical_date DESC
created_at DESC

The newest medical event appears first.

When the medical date is the same, the most recently created record appears first.

PostgreSQL DATE Handling

The repository returns DATE fields as text:

medical_date::text AS medical_date
follow_up_date::text AS follow_up_date

This keeps API values in predictable YYYY-MM-DD string form.

API Mapping

Database snake_case fields are mapped to camelCase API fields, for example:

medical_record_id → medicalRecordId
animal_id → animalId
observation_id → observationId
medical_type → medicalType
medical_date → medicalDate
vet_name → vetName
follow_up_date → followUpDate
created_by → createdBy
updated_by → updatedBy

Joined display fields may include:

animalCode
animalName

HTTP Status Usage

200 OK
→ successful read/update

201 Created
→ successful Medical Record creation

400 Bad Request
→ malformed UUID
→ invalid medical type
→ invalid calendar date
→ blank required reason
→ follow-up before medical date
→ empty PATCH
→ invalid text type
→ clinic/vetName exceeds allowed length

403 Forbidden
→ CARETAKER attempts create/update
→ role not authorized

404 Not Found
→ medical record not found
→ animal not found
→ observation not found

409 Conflict
→ future medical date
→ Observation not escalated to medical
→ cage-level Observation linked to animal Medical Record
→ Observation animal mismatch
→ update cannot be completed

Tested Workflows

The following cases were manually tested:

Manual Medical Record without Observation → 201 ✅
Future medicalDate → 409 ✅
followUpDate before medicalDate → 400 ✅
Observation not escalated → 409 ✅
Escalated cage-level Observation → 409 ✅
Valid escalated animal Observation → Medical Record 201 ✅
Wrong animal for escalated Observation → 409 ✅
Multiple Medical Records from one Observation → supported ✅
GET one Medical Record → 200 ✅
GET all Medical Records → 200 ✅
GET animal medical history → 200 ✅
Dynamic PATCH → 200 ✅
PATCH future medicalDate → 409 ✅
PATCH final-state date conflict → 400 ✅
PATCH invalid Observation → 409 ✅
PATCH animal mismatch → 409 ✅
PATCH observationId to null → 200 ✅
CARETAKER GET → 200 ✅
CARETAKER PATCH → 403 ✅
CARETAKER POST → 403 ✅
VOLUNTEER POST → allowed ✅
Medical Record valid UUID but missing → 404 ✅
Invalid Medical Record UUID → 400 ✅
Impossible date such as 2026-02-31 → 400 ✅
Empty PATCH → 400 ✅
Missing animal medical history target → 404 ✅
Existing animal with no Medical Records → 200 + [] ✅
Clinic longer than 150 characters → 400 ✅

Current Limitations / Deferred Features

The Medical Records module currently does not implement:

DELETE
pagination
query filters
medical record version history
activity log integration
notification generation
automatic Medical Record creation during Observation escalation
file attachment handling

Future Integrations

Remaining Medical-related modules/features include:

Medications
Preventive Care
Activity Logs
Notifications
Frontend
Reporting

A future version may connect Observation escalation and Medical Record creation inside one transaction if the shelter workflow benefits from that behavior.

Module Status

Medical Records Module
✅ Core create workflow complete
✅ Read endpoints complete
✅ Dynamic PATCH complete
✅ Historical record support complete
✅ Manila date rule complete
✅ Follow-up chronology validation complete
✅ Observation integration complete
✅ Animal relationship validation complete
✅ RBAC complete
✅ Database DATE handling complete
✅ Clinic/vetName length protection complete
✅ Manual API testing complete
✅ Syntax verification complete
