Medications Module

Overview

The Medications module manages medication courses for shelter animals. It supports creating medication records, optionally linking them to a Medical Record, viewing medication history, updating ACTIVE medications, and ending a medication workflow through explicit COMPLETE or DISCONTINUE actions.

Architecture:

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

src/modules/medication/
├── medication.routes.js
├── medication.controller.js
├── medication.service.js
├── medication.repository.js
└── medication.validation.js

Database

Primary table:

medications

Main fields:

medication_id
medical_record_id
animal_id
medication_name
dosage
frequency
start_date
end_date
instructions
status
status_reason
created_by
updated_by
created_at
updated_at

Original table migration:

010_create_medications.sql

Additional migration:

035_add_medication_status_reason.sql

ALTER TABLE medications
ADD COLUMN status_reason TEXT;

Medication Status Workflow

Allowed statuses:

ACTIVE
COMPLETED
DISCONTINUED

Lifecycle:

ACTIVE
├──→ COMPLETED
└──→ DISCONTINUED

COMPLETED and DISCONTINUED are terminal for the MVP.

Once terminal:

normal PATCH is blocked
complete/discontinue transitions are blocked
status cannot return to ACTIVE

Medication status is staff-controlled. Passing an endDate does not automatically change a medication to COMPLETED.

Creation Rules

Every new medication starts as:

ACTIVE

The client cannot set status or statusReason during creation.

Required fields:

animalId
medicationName
startDate

Optional fields:

medicalRecordId
dosage
frequency
endDate
instructions

System-managed fields:

status
statusReason
createdBy
updatedBy
createdAt
updatedAt

Field Validation

medicationName

required
string
trimmed
cannot be blank
maximum 150 characters

dosage

optional
string or null
trimmed
blank → null
maximum 100 characters

frequency

optional
string or null
trimmed
blank → null
maximum 100 characters

instructions

optional
string or null
trimmed
blank → null

Date Rules

startDate is required and must be a real calendar date in YYYY-MM-DD format.

Allowed start dates:

past ✅
today ✅
future ✅

Future start dates are intentionally allowed because medications may be scheduled in advance.

endDate is optional to support ongoing or maintenance medication.

If provided:

endDate >= startDate

endDate is never automatically changed when a medication is completed or discontinued.

Animal Rule

The animal must:

exist
not be archived

Current lifecycle status does not need to be ACTIVE. This allows historical medication entry for non-archived animals whose current status may be ADOPTED, PASSED_AWAY, MISSING, or ESCAPED.

Medical Record Relationship

medicalRecordId is optional.

If provided:

medical record must exist
↓
medical record animalId must match medication animalId

This prevents a medication for one animal from being linked to another animal's medical history.

The link may be cleared while the medication is ACTIVE:

{
"medicalRecordId": null
}

Role-Based Access Control

All authenticated shelter staff may manage medications because medication administration is part of direct animal care.

Action

ADMIN

VOLUNTEER

CARETAKER

Create medication

✅

✅

✅

View all medications

✅

✅

✅

View one medication

✅

✅

✅

View animal medications

✅

✅

✅

Update ACTIVE medication

✅

✅

✅

Complete medication

✅

✅

✅

Discontinue medication

✅

✅

✅

Edit terminal medication

❌

❌

❌

Delete medication

❌

❌

❌

Routes

All routes require authentication.

POST /api/medications
GET /api/medications
GET /api/medications/:medicationId
GET /api/animals/:animalId/medications
PATCH /api/medications/:medicationId
POST /api/medications/:medicationId/complete
POST /api/medications/:medicationId/discontinue

Normal PATCH

Normal PATCH is allowed only while the medication status is ACTIVE.

Editable fields:

animalId
medicalRecordId
medicationName
dosage
frequency
startDate
endDate
instructions

Not editable through normal PATCH:

status
statusReason

Those fields are controlled by dedicated workflow endpoints.

The repository dynamically updates only supplied fields and always updates updated_by and updated_at.

Explicit Null vs Omitted Fields

PATCH distinguishes between an omitted field and an explicit null.

field omitted
→ preserve existing value

field supplied as null
→ explicitly clear the value

Examples:

{
"endDate": null
}

supports ongoing medication.

{
"medicalRecordId": null
}

removes the Medical Record link.

Final-State Validation

For partial PATCH requests, the service combines incoming values with existing database values before validating the final record.

Example:

existing startDate = 2026-08-29
existing endDate = 2026-09-02

PATCH:

{
"startDate": "2026-09-05"
}

Final state would have an end date before the new start date, so the service returns 400 Bad Request.

The same final-state pattern is used for animalId and medicalRecordId relationship changes.

Complete Workflow

Endpoint:

POST /api/medications/:medicationId/complete

No body is required.

Allowed transition:

ACTIVE → COMPLETED

Effect:

status = COMPLETED
statusReason = null
endDate unchanged

Discontinue Workflow

Endpoint:

POST /api/medications/:medicationId/discontinue

Body:

{
"reason": "Veterinarian instructed staff to stop treatment"
}

Allowed transition:

ACTIVE → DISCONTINUED

The reason is required and is stored as statusReason.

Terminal-State Protection

Rejected transitions:

COMPLETED → PATCH ❌
DISCONTINUED → PATCH ❌
COMPLETED → DISCONTINUED ❌
DISCONTINUED → COMPLETED ❌

These return 409 Conflict.

Repository updates also include:

AND status = 'ACTIVE'

This provides a second layer of protection if the status changes between the service SELECT and UPDATE.

Read Ordering

GET /api/medications and the animal medication history endpoint order rows by:

ACTIVE first
↓
startDate DESC
↓
createdAt DESC

The query uses:

CASE
WHEN m.status = 'ACTIVE' THEN 1
ELSE 2
END

The CASE expression only creates a temporary sorting priority; it does not modify status.

PostgreSQL DATE Handling

Repository queries cast date columns to text:

start_date::text AS start_date
end_date::text AS end_date

This keeps API dates as predictable YYYY-MM-DD strings.

API Mapping

Database snake_case fields are mapped to camelCase API fields, for example:

medication_id → medicationId
medical_record_id → medicalRecordId
animal_id → animalId
medication_name → medicationName
start_date → startDate
end_date → endDate
status_reason → statusReason
created_by → createdBy
updated_by → updatedBy
created_at → createdAt
updated_at → updatedAt

Joined animal display fields may include:

animalCode
animalName

HTTP Status Usage

200 OK
→ successful read/update/complete/discontinue

201 Created
→ medication created

400 Bad Request
→ malformed UUID
→ invalid body
→ invalid calendar date
→ endDate before startDate
→ blank medicationName
→ missing discontinuation reason
→ empty PATCH
→ direct status PATCH
→ status supplied during creation
→ length validation failure

404 Not Found
→ medication not found
→ animal not found
→ Medical Record not found

409 Conflict
→ Medical Record belongs to different animal
→ terminal medication update/transition
→ ACTIVE state lost during conditional update

Manual Test Coverage

The following were manually verified:

Create without Medical Record → 201 ✅
Create with valid Medical Record → 201 ✅
Wrong-animal Medical Record link → 409 ✅
endDate before startDate → 400 ✅
Impossible calendar date → 400 ✅
GET one → 200 ✅
GET all → 200 ✅
GET animal medications → 200 ✅
Dynamic PATCH → 200 ✅
Partial date final-state conflict → 400 ✅
Clear endDate with null → 200 ✅
ACTIVE → COMPLETED → 200 ✅
PATCH COMPLETED medication → 409 ✅
DISCONTINUE without reason → 400 ✅
ACTIVE → DISCONTINUED with reason → 200 ✅
Direct status PATCH → 400 ✅
COMPLETED → DISCONTINUED → 409 ✅
DISCONTINUED → COMPLETED → 409 ✅
CARETAKER create → 201 ✅
CARETAKER PATCH → 200 ✅
CARETAKER complete → 200 ✅
Invalid medication UUID → 400 ✅
Valid UUID but medication missing → 404 ✅
Empty PATCH → 400 ✅
medicationName > 150 chars → 400 ✅
dosage > 100 chars → 400 ✅
frequency > 100 chars → 400 ✅
Animal with no medications → 200 + [] ✅
Nonexistent Medical Record link → 404 ✅
Clear medicalRecordId with null → 200 ✅
Status supplied during creation → 400 ✅

Verification

All Medication JavaScript files passed syntax checking:

for file in src/modules/medication/\*.js; do
node --check "$file" || exit 1
done

Debug scan:

grep -R "console.log\|console.error" src/modules/medication

Result:

no debug statements found

Deferred Features

Not included in the current MVP:

DELETE
individual dose-administration logs
inventory deduction
automatic completion based on endDate
automatic scheduled status
activity log integration
notifications/reminders
pagination
query filters

Potential future integration:

Medication
→ Inventory
→ Activity Logs
→ Notifications

Module Status

Medications Module
✅ Create complete
✅ Optional Medical Record relationship complete
✅ Same-animal validation complete
✅ Historical animal support complete
✅ Future start dates supported
✅ Optional end dates supported
✅ Maintenance medication support complete
✅ Dynamic PATCH complete
✅ Final-state validation complete
✅ COMPLETE workflow complete
✅ DISCONTINUE workflow complete
✅ Required discontinuation reason complete
✅ Terminal-state protection complete
✅ Conditional UPDATE protection complete
✅ CARETAKER management complete
✅ Validation length protection complete
✅ Manual API testing complete
✅ Syntax verification complete
✅ Debug scan complete
