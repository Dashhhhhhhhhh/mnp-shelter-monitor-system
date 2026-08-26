# Care Records Module

## Purpose

The Care Records module tracks routine and extra shelter care performed for cages in the M & P Shelter Monitoring System.

It records:

- feeding
- cleaning
- relief breaks
- scheduled AM/PM care
- extra unscheduled care
- pending/completed state
- exact completion timestamp
- staff member who recorded completion
- one or more staff members who actually performed the care
- optional notes
- calculated overdue state

Care is recorded per cage because feeding and cleaning are generally performed for the animals housed together in that cage.

---

# Core Concept

A Care Record represents a care task for one cage.

Example:

```text
CAT-01
2026-08-27
AM
FEEDING
PENDING
```

After completion:

```text
CAT-01
2026-08-27
AM
FEEDING
COMPLETED
completed_at = exact timestamp
completed_by = staff user
```

Care Records are not deleted after completion.

They form part of the shelter's operational history.

---

# Module Architecture

The module follows the backend layered architecture:

```text
Route
↓
Authentication / RBAC
↓
Controller
↓
Service
↓
Validation
↓
Repository
↓
PostgreSQL
```

Files:

```text
src/modules/care_records/
├── careRecord.routes.js
├── careRecord.controller.js
├── careRecord.service.js
├── careRecord.repository.js
└── careRecord.validation.js
```

---

# Access Control

All Care Record routes require authentication.

The router uses:

```js
router.use(authenticate);
```

Role authorization is then applied to individual endpoints.

## ADMIN

Can:

- create/schedule care
- complete care
- view care records
- view cage care history

## VOLUNTEER

Can:

- create/schedule care
- complete care
- view care records
- view cage care history

## CARETAKER

Can:

- complete care
- view care records
- view cage care history

CARETAKER does not create/schedule regular care tasks.

---

# API Endpoints

Implemented endpoints:

```text
POST /api/care-records

GET /api/care-records?date=YYYY-MM-DD

POST /api/care-records/:careRecordId/complete

GET /api/cages/:cageId/care-records
```

---

# Database Tables

The module uses:

```text
care_records
care_record_participants
```

---

# `care_records`

Important columns:

```text
care_record_id
cage_id
care_date
care_period
care_type
cleaning_type
status
completed_by
completed_at
notes
created_by
updated_by
created_at
updated_at
```

---

# `care_record_participants`

A Care Record may have multiple staff participants.

Important columns:

```text
care_record_participant_id
care_record_id
user_id
created_at
```

This allows:

```text
Care Record
     1
     │
     │
     ∞
Care Record Participants
     │
     │
     ∞
   Users
```

---

# Database Migrations

The Care Records module relies on the original Care Record table migration plus later hardening migrations.

Relevant migrations include:

```text
007 - create care_records
032 - require completed_by for completed care
033 - create care_record_participants
```

---

# Care Periods

Allowed values:

```text
AM
PM
EXTRA
```

## AM

Normal scheduled morning care.

## PM

Normal scheduled evening care.

## EXTRA

Additional care that occurs outside the normal AM/PM schedule.

Examples:

```text
additional feeding
additional cleaning
unexpected care need
```

EXTRA tasks may occur multiple times on the same day.

---

# Care Types

Allowed:

```text
FEEDING
CLEANING
RELIEF_BREAK
```

---

# Cleaning Types

When:

```text
care_type = CLEANING
```

`cleaning_type` must be one of:

```text
LITTER_BOX
FULL_CAGE
```

For non-cleaning tasks:

```text
FEEDING
RELIEF_BREAK
```

`cleaning_type` must be:

```text
NULL
```

---

# Database Cleaning Constraint

The database enforces the relationship between:

```text
care_type
cleaning_type
```

Valid examples:

```text
CLEANING + LITTER_BOX
CLEANING + FULL_CAGE
FEEDING + NULL
RELIEF_BREAK + NULL
```

Invalid examples:

```text
FEEDING + LITTER_BOX
RELIEF_BREAK + FULL_CAGE
CLEANING + NULL
```

The validation layer also catches these before PostgreSQL must reject them.

---

# Care Status

Stored status values:

```text
PENDING
COMPLETED
```

There is intentionally no stored:

```text
OVERDUE
```

Overdue is calculated dynamically by the service.

---

# Completion Integrity

Database constraints require:

```text
PENDING
→ completed_at = NULL
→ completed_by = NULL
```

and:

```text
COMPLETED
→ completed_at IS NOT NULL
→ completed_by IS NOT NULL
```

This prevents inconsistent Care Record states.

---

# `completed_by` vs Participants

These fields represent different concepts.

## `completed_by`

Represents:

> The authenticated user who recorded/confirmed completion in the system.

The backend determines this from:

```text
req.user.userId
```

The frontend does not provide it.

## `care_record_participants`

Represents:

> The staff members who actually performed the care.

Example:

```text
Kevin + Maria clean CAT-01 together.

Maria and Kevin
→ care_record_participants

Kevin presses Complete
→ completed_by = Kevin
```

This distinction preserves a more accurate audit trail.

---

# Why Participants Use a Separate Table

The system does not use:

```text
completed_by_1
completed_by_2
completed_by_3
```

because the number of workers is not fixed.

Instead:

```text
one care record
↓
many participant rows
```

supports any number of staff participants.

---

# Participant Uniqueness

A user may only appear once for the same Care Record.

Database uniqueness:

```text
UNIQUE (care_record_id, user_id)
```

The validation layer also removes duplicate IDs before insertion.

Example request:

```json
[
  "user-a",
  "user-a",
  "user-b"
]
```

is normalized to:

```json
[
  "user-a",
  "user-b"
]
```

using:

```js
[...new Set(participantUserIds)]
```

---

# Create Care Record

## Endpoint

```text
POST /api/care-records
```

## Access

```text
ADMIN
VOLUNTEER
```

---

# Example Create Request

```json
{
  "cageId": "cage-uuid",
  "careDate": "2026-08-27",
  "carePeriod": "AM",
  "careType": "FEEDING",
  "notes": "Morning feeding"
}
```

Cleaning example:

```json
{
  "cageId": "cage-uuid",
  "careDate": "2026-08-27",
  "carePeriod": "PM",
  "careType": "CLEANING",
  "cleaningType": "FULL_CAGE",
  "notes": "Evening full cage cleaning"
}
```

---

# Input Validation

Create validation checks:

```text
request body is an object
cageId is UUID
careDate is a real YYYY-MM-DD date
carePeriod is valid
careType is valid
cleaningType matches careType
notes is string/null
```

---

# Shared Date Validation

Both:

```text
POST /api/care-records
```

and:

```text
GET /api/care-records?date=...
```

use the same:

```text
validateCareDate()
```

function.

This prevents validation rules from drifting between endpoints.

For example:

```text
2026-02-31
```

matches the shape:

```text
YYYY-MM-DD
```

but is not a valid calendar date.

The validator rejects it.

---

# Cage Business Rules

The service loads the Cage because some rules depend on database state.

A Care Record may only be created for a Cage that:

```text
exists
and
status = ACTIVE
```

---

# Species-Specific Care Rules

## Relief Break

`RELIEF_BREAK` is only valid for:

```text
DOG
```

Cages.

Valid:

```text
DOG → RELIEF_BREAK
```

Invalid:

```text
CAT → RELIEF_BREAK
```

The invalid case returns:

```text
409 Conflict
```

---

# Litter Box Cleaning

`LITTER_BOX` cleaning is only applicable to:

```text
CAT
```

Cages.

Valid:

```text
CAT → CLEANING → LITTER_BOX
```

Invalid:

```text
DOG → CLEANING → LITTER_BOX
```

---

# Validation vs Business Rules

Example:

```text
RELIEF_BREAK
```

is a valid `careType`.

Therefore validation accepts it.

However:

```text
CAT cage + RELIEF_BREAK
```

is invalid because of shelter business rules.

That requires looking up the Cage, so the check belongs in the service layer.

Conceptually:

```text
Validation
→ Is RELIEF_BREAK a valid input value?

Service
→ Is RELIEF_BREAK allowed for this particular Cage?
```

---

# Duplicate Scheduled Tasks

AM and PM care tasks must not be accidentally duplicated.

The database has the partial unique index:

```text
uq_care_records_scheduled_task
```

based on:

```text
cage_id
care_date
care_period
care_type
cleaning_type
```

for:

```text
AM
PM
```

care periods.

---

# Duplicate Example

This can exist once:

```text
CAT-01
2026-08-27
AM
FEEDING
NULL
```

Repeating it produces:

```text
409 Conflict
```

But this is a separate valid task:

```text
CAT-01
2026-08-27
AM
CLEANING
LITTER_BOX
```

because the care type/cleaning type differs.

---

# `COALESCE` in Duplicate Matching

The repository uses:

```sql
COALESCE(cleaning_type, '')
```

because SQL `NULL` values require special handling during equality checks.

For non-cleaning tasks:

```text
cleaning_type = NULL
```

is normalized for comparison to:

```text
''
```

This allows duplicate feeding/relief tasks to be detected consistently.

---

# Service Pre-Check + Database Protection

For scheduled AM/PM care:

```text
service checks for existing task
↓
clean 409 response
```

The database unique index provides an additional layer:

```text
concurrent duplicate INSERT
↓
PostgreSQL 23505
↓
409 Conflict
```

This protects against race conditions.

---

# EXTRA Care

EXTRA records are intentionally excluded from the scheduled-task unique index.

Example:

```text
CAT-01
2026-09-01
EXTRA
FEEDING
```

may exist more than once.

This allows:

```text
10:00 AM extra feeding
3:00 PM extra feeding
```

on the same day.

Both are legitimate care events.

---

# Complete Care

## Endpoint

```text
POST /api/care-records/:careRecordId/complete
```

## Access

```text
ADMIN
VOLUNTEER
CARETAKER
```

---

# Complete Request

Example with one participant:

```json
{
  "participantUserIds": [
    "user-uuid"
  ],
  "notes": "Morning feeding completed"
}
```

Example with two participants:

```json
{
  "participantUserIds": [
    "user-a-uuid",
    "user-b-uuid"
  ],
  "notes": "Full cage cleaning completed together"
}
```

At least one participant is required.

---

# Participant Validation

Before completion, the service verifies:

```text
all participant UUIDs exist
all participants are active
all participants belong to an allowed shelter role
```

Allowed roles:

```text
ADMIN
VOLUNTEER
CARETAKER
```

---

# Completion Ownership

The backend does not trust the request body for:

```text
completedBy
```

Instead:

```text
JWT
↓
authenticate middleware
↓
req.user.userId
↓
controller
↓
service
↓
completed_by
```

This prevents a client from falsely claiming that another user recorded the completion.

---

# Future Completion Protection

A Care Record cannot be completed before its `care_date`.

Rule:

```text
careDate > today
→ 409 Conflict
```

Message:

```text
Future care records cannot be completed
```

The business date is evaluated using:

```text
Asia/Manila
```

timezone.

The frontend should also disable the Complete button for future care, but the backend still enforces the rule independently.

---

# Why Both Frontend and Backend Protect This

Frontend:

```text
disable button
→ better user experience
```

Backend:

```text
validate care date
→ actual security/business-rule protection
```

A client can bypass the frontend using:

```text
Thunder Client
Postman
curl
custom frontend
```

so backend validation remains mandatory.

---

# Completion Transaction

Completing Care requires multiple database writes:

```text
UPDATE care_records
+
INSERT care_record_participants
```

These must succeed together.

Therefore completion uses a PostgreSQL transaction.

---

# Transaction Flow

```text
borrow dedicated client
↓
BEGIN
↓
find Care Record
↓
verify PENDING
↓
verify not future-dated
↓
validate participants
↓
UPDATE Care Record → COMPLETED
↓
INSERT participants
↓
read participants
↓
COMMIT
↓
release client
```

If any operation fails:

```text
ROLLBACK
↓
release client
```

---

# Dedicated PostgreSQL Client

The service uses:

```js
const client = await pool.connect();
```

Conceptually:

```text
pool
→ manages multiple reusable PostgreSQL connections

client
→ one specific borrowed PostgreSQL connection
```

All transaction queries use the same `client`.

---

# Transaction-Aware Repository Functions

Repository functions may accept:

```js
db = pool
```

Normal operation:

```text
no db supplied
→ pool.query()
```

Transaction operation:

```text
client supplied
→ client.query()
```

This makes repository functions usable in both scenarios.

The `db = pool` pattern does not itself create the transaction.

Actual transaction protection comes from:

```text
BEGIN
COMMIT
ROLLBACK
```

---

# Completion Concurrency Protection

The repository updates only:

```sql
WHERE care_record_id = $1
AND status = 'PENDING'
```

So if two requests attempt to complete the same task at nearly the same time:

```text
Request A
PENDING → COMPLETED ✅

Request B
WHERE status = PENDING
→ no row
→ 409 Conflict
```

This protects against repeated/concurrent completion.

---

# Notes During Completion

Completion may optionally replace the existing notes.

The system distinguishes:

```json
{}
```

from:

```json
{
  "notes": null
}
```

Missing notes means:

```text
keep current note
```

Explicit `null` means:

```text
clear the note
```

The service uses:

```js
Object.prototype.hasOwnProperty.call(
  completionData,
  "notes",
)
```

to determine whether the property was actually provided.

---

# Participant Bulk Insert

The repository inserts multiple participants in one PostgreSQL query using:

```sql
unnest($2::uuid[])
```

Conceptually:

```text
["uuid-A", "uuid-B"]
↓
UNNEST
↓
uuid-A
uuid-B
↓
two INSERT rows
```

This avoids issuing one database query per participant.

---

# Care Date Representation

`care_date` is a PostgreSQL:

```text
DATE
```

It represents a calendar day, not a specific instant in time.

The repository therefore returns it using:

```sql
care_date::text AS care_date
```

or:

```sql
cr.care_date::text AS care_date
```

The API receives:

```json
"careDate": "2026-08-27"
```

instead of a timezone-converted JavaScript timestamp.

---

# Why DATE Is Different From TIMESTAMPTZ

Calendar dates:

```text
care_date
birth_date
intake_date
```

represent a day.

Example:

```text
2026-08-27
```

Timestamps:

```text
completed_at
created_at
updated_at
```

represent an actual moment in time.

Example:

```text
2026-08-26T16:09:01.859Z
```

UTC ISO timestamps are appropriate for the second category.

---

# Mapper

The service uses a mapper to convert PostgreSQL rows into API response objects.

Example:

```text
care_record_id
↓
careRecordId

care_period
↓
carePeriod

completed_at
↓
completedAt
```

The mapper also exposes:

```text
isOverdue
```

which is derived rather than stored.

---

# Why Map Database Rows

The mapper:

```text
converts snake_case → camelCase
controls fields exposed by the API
keeps the database representation separate from the API contract
allows derived values such as isOverdue
```

Conceptually:

```text
PostgreSQL row
↓
mapper
↓
API object
↓
React
```

---

# Calculated Overdue State

The database continues to store only:

```text
PENDING
COMPLETED
```

The API calculates:

```text
isOverdue
```

dynamically.

This avoids constantly updating rows merely because time has passed.

---

# Overdue Rules

For the MVP:

```text
AM
→ overdue starting at 12:00 PM if still PENDING

PM
→ overdue once its calendar date has passed

EXTRA
→ never automatically overdue

COMPLETED
→ never overdue
```

---

# Overdue Examples

```text
AM today at 9 AM
PENDING
→ isOverdue = false
```

```text
AM today at 1 PM
PENDING
→ isOverdue = true
```

```text
PM yesterday
PENDING
→ isOverdue = true
```

```text
EXTRA yesterday
PENDING
→ isOverdue = false
```

```text
AM yesterday
COMPLETED
→ isOverdue = false
```

---

# Derived State

Overdue is an example of derived state.

Database:

```text
status = PENDING
```

Service calculation:

```text
current date/time
+
care date
+
care period
+
status
↓
isOverdue
```

API response:

```json
{
  "status": "PENDING",
  "isOverdue": true
}
```

---

# Manila Business Time

Overdue and future-date rules use:

```text
Asia/Manila
```

rather than relying on the server's local timezone.

This matters because the backend may later run on infrastructure configured for UTC.

Business rules should follow the shelter's timezone, not the hosting server's timezone.

---

# Reading Care Records by Date

## Endpoint

```text
GET /api/care-records?date=YYYY-MM-DD
```

Returns Care Records for one date.

The query joins:

```text
care_records
+
cages
```

so the frontend receives useful Cage information.

Example fields:

```text
cageCode
speciesGroup
genderGroup
```

instead of having to perform additional requests for every Cage UUID.

---

# Reading Cage Care History

## Endpoint

```text
GET /api/cages/:cageId/care-records
```

Returns all Care Records for one Cage.

This includes:

```text
PENDING
COMPLETED
AM
PM
EXTRA
```

records.

Care history is preserved rather than deleted.

---

# Purpose-Specific Repository Queries

The current module uses specific read functions such as:

```text
findCareRecordById()
findCareRecordsByDate()
findCareRecordsByCageId()
```

rather than immediately implementing one large generic filtering function.

This matches the current requirements.

A generic filtered/paginated query can be introduced later if the UI requires combinations such as:

```text
date range
status
cage
care type
period
sorting
pagination
```

Generalization should happen when real requirements justify the added complexity.

---

# Main Repository Functions

The repository includes functions such as:

```text
findCareRecordById()
findScheduledCareRecord()
insertCareRecord()
completeCareRecord()
insertCareRecordParticipants()
findCareRecordParticipants()
findCareRecordsByDate()
findCareRecordsByCageId()
findUsersByIds()
```

---

# Main Service Responsibilities

The service handles:

```text
care business rules
Cage validation
species-specific care rules
duplicate scheduled-task detection
participant validation
completion workflow
transaction handling
future-completion protection
overdue calculation
mapping
```

---

# Controller Responsibilities

Controllers remain intentionally small.

They:

```text
read req.params / req.query / req.body
read authenticated req.user
call service
send HTTP response
forward errors to global error handler
```

Business rules are not implemented in controllers.

---

# Error Behavior

## 201 Created

Used for:

```text
successful Care Record creation
```

## 200 OK

Used for:

```text
successful completion
GET by date
GET Cage care history
```

## 400 Bad Request

Examples:

```text
invalid UUID
invalid calendar date
invalid care period
invalid care type
invalid cleaning type
missing participants
participant UUID does not exist
```

## 401 Unauthorized

Used for:

```text
missing/invalid authentication
```

## 403 Forbidden

Used when:

```text
authenticated role cannot perform the requested operation
```

## 404 Not Found

Examples:

```text
Care Record not found
Cage not found
```

## 409 Conflict

Examples:

```text
duplicate scheduled AM/PM task
inactive Cage
CAT relief break
DOG litter-box cleaning
already-completed Care Record
future-dated completion
inactive participant
```

---

# Manual Testing

The Care Records module was manually tested using:

```text
Thunder Client
PostgreSQL / psql
```

---

# Valid Feeding Test

Created:

```text
CAT-01
AM
FEEDING
```

Verified:

```text
201 Created
status = PENDING
completedBy = null
completedAt = null
```

---

# Duplicate Scheduled Task Test

Repeated the same:

```text
Cage
date
period
care type
cleaning type
```

for an AM task.

Verified:

```text
409 Conflict
```

No duplicate scheduled row was created.

---

# Valid Full-Cage Cleaning Test

Created:

```text
CAT-01
PM
CLEANING
FULL_CAGE
```

Verified:

```text
201 Created
```

---

# CAT Relief Break Test

Attempted:

```text
CAT Cage
RELIEF_BREAK
```

Verified:

```text
409 Conflict
```

The business rule correctly rejected the operation.

---

# DOG Relief Break Test

Created:

```text
DOG Cage
RELIEF_BREAK
```

Verified:

```text
201 Created
```

---

# Invalid Cleaning Type Test

Attempted:

```text
FEEDING
+
LITTER_BOX
```

Verified:

```text
400 Bad Request
```

---

# Missing Cleaning Type Test

Attempted:

```text
CLEANING
+
no cleaningType
```

Verified:

```text
400 Bad Request
```

---

# Single Participant Completion Test

Completed a Care Record with one participant.

Verified:

```text
200 OK
status = COMPLETED
completed_by populated
completed_at populated
one participant row inserted
```

PostgreSQL was queried directly to confirm both tables.

---

# Multiple Participant Completion Test

Completed one Care Record with:

```text
Kevin
Maria
```

Verified:

```text
200 OK
```

and:

```text
2 participant rows
```

were stored in:

```text
care_record_participants
```

---

# Repeated Completion Test

Attempted to complete an already-completed Care Record.

Verified:

```text
409 Conflict
```

The original completion information remained unchanged.

---

# Invalid Participant Test

Used a syntactically valid UUID that did not correspond to a real user.

Verified:

```text
400 Bad Request
```

and:

```text
Care Record remained PENDING
completed_by remained NULL
completed_at remained NULL
0 participant rows
```

---

# Duplicate Participant Normalization Test

Submitted the same participant UUID twice.

The validation layer normalized the input.

Verified:

```text
200 OK
```

and only:

```text
1 participant row
```

was inserted.

---

# Transaction COMMIT Test

Successful completion verified that:

```text
care_records
+
care_record_participants
```

were both persisted together.

---

# Transaction ROLLBACK Test

A duplicate participant row was manually injected into PostgreSQL to intentionally force participant insertion to fail after the Care Record UPDATE.

Test flow:

```text
BEGIN
↓
UPDATE Care Record → COMPLETED
↓
participant INSERT fails
↓
ROLLBACK
```

After the failure, PostgreSQL was queried directly.

Verified:

```text
status returned to PENDING
completed_by remained NULL
completed_at remained NULL
original notes were restored
```

This proved that the previous UPDATE was actually undone by PostgreSQL.

The manually injected participant test row was deleted afterward.

---

# EXTRA Repeatability Test

Created two:

```text
EXTRA
FEEDING
```

records for the same:

```text
Cage
date
care type
```

Verified:

```text
201 Created
201 Created
```

Both records existed independently.

---

# GET by Date Test

Queried:

```text
GET /api/care-records?date=...
```

Verified:

```text
200 OK
```

and multiple matching Care Records were returned with Cage JOIN information.

---

# Cage Care History Test

Queried:

```text
GET /api/cages/:cageId/care-records
```

Verified that:

```text
current pending records
completed records
older records
EXTRA records
```

were all preserved and returned.

---

# Care Date Serialization Test

Originally, PostgreSQL `DATE` values were being returned by Node as JavaScript Date objects, causing values such as:

```text
2026-08-26
```

to appear as timezone-adjusted ISO timestamps.

Repository queries were updated to use:

```sql
care_date::text AS care_date
```

Verified API result:

```json
"careDate": "2026-08-26"
```

---

# Date-Type Debugging

During future-completion testing, the service initially compared:

```text
JavaScript Date object
>
YYYY-MM-DD string
```

The comparison behaved incorrectly.

A temporary debug log checked:

```text
value
typeof value
comparison result
```

This identified the data-type mismatch.

After ensuring `findCareRecordById()` also returned:

```text
care_date::text
```

the comparison became:

```text
YYYY-MM-DD string
>
YYYY-MM-DD string
```

and behaved correctly.

Temporary debugging logs were removed after verification.

---

# Overdue Test

Old pending AM care returned:

```json
{
  "status": "PENDING",
  "isOverdue": true
}
```

The database continued storing:

```text
PENDING
```

confirming overdue was derived rather than persisted.

---

# EXTRA Overdue Test

An old EXTRA record returned:

```json
{
  "status": "PENDING",
  "isOverdue": false
}
```

confirming EXTRA care never becomes automatically overdue.

---

# Completed Overdue Test

An old completed Care Record returned:

```json
{
  "status": "COMPLETED",
  "isOverdue": false
}
```

confirming completed tasks are never considered overdue.

---

# Future Completion Test

A future-dated pending Care Record was created.

Attempting completion returned:

```text
409 Conflict
```

with:

```text
Future care records cannot be completed
```

The record remained:

```text
PENDING
```

---

# Shared Date Validation Smoke Test

After refactoring date validation, an invalid calendar date was tested:

```text
2026-02-31
```

Verified:

```text
400 Bad Request
```

A valid date query continued returning:

```text
200 OK
```

This confirmed the shared date validator did not break existing behavior.

---

# Important Design Decisions

## Care Is Cage-Based

Daily feeding/cleaning is tracked at Cage level because shelter care is generally performed for grouped animals.

Individual medical treatment belongs to the Medical module instead.

---

## No SKIPPED Status

MVP Care Records contain only:

```text
PENDING
COMPLETED
```

A required task should remain visible until handled rather than disappearing into a skipped state.

---

## Overdue Is Derived

`OVERDUE` is not persisted.

This avoids database writes caused merely by passage of time.

---

## EXTRA Is Unscheduled

EXTRA tasks:

```text
may repeat
do not automatically become overdue
```

because they represent additional rather than scheduled obligations.

---

## Completion Supports Multiple Workers

The participants table was introduced because two or more staff may perform the same care together.

---

## Completed By Is Audit Identity

`completed_by` represents who recorded the completion, while participants represent who did the work.

---

## Completion Uses a Transaction

Completion modifies multiple related tables.

Atomicity prevents:

```text
COMPLETED care
+
missing participant records
```

---

## Frontend Is Not Trusted for Identity

`completed_by` comes from authentication, not request data.

---

## Frontend Is Not Trusted for Future Completion

The frontend will disable future Complete actions, but the backend independently blocks them.

---

## Calendar Dates Remain Calendar Dates

PostgreSQL `DATE` values are explicitly returned as text instead of being treated as JavaScript timestamps.

---

# Current Care Records Module Status

The Care Records backend module is complete for the current MVP scope.

Implemented and tested:

```text
Care Record creation                       ✅
AM/PM scheduling                           ✅
EXTRA care                                 ✅
Duplicate scheduled-task prevention        ✅
Database race protection                   ✅
Feeding                                    ✅
Cleaning                                   ✅
Litter-box cleaning                        ✅
Full-cage cleaning                         ✅
Dog relief breaks                          ✅
Species-specific business rules            ✅
Pending/completed workflow                 ✅
Single participant                         ✅
Multiple participants                      ✅
Participant validation                     ✅
Duplicate participant normalization        ✅
Completion audit identity                   ✅
Completion timestamps                      ✅
Completion notes                           ✅
Repeated-completion protection             ✅
Future-completion protection               ✅
PostgreSQL transaction                     ✅
Dedicated transaction client               ✅
COMMIT                                     ✅
ROLLBACK                                   ✅
Rollback-after-write verification          ✅
Transaction-aware repositories             ✅
GET by date                                ✅
Cage care history                          ✅
Cage JOIN information                      ✅
Calendar-date validation                   ✅
DATE serialization                         ✅
Calculated overdue                         ✅
AM overdue                                 ✅
PM overdue                                 ✅
EXTRA overdue exclusion                    ✅
Completed overdue exclusion                ✅
Asia/Manila business timezone              ✅
Authentication                             ✅
Role-based access control                  ✅
Parameterized SQL                          ✅
```

The Care Records module is considered complete for the current backend MVP.

The next planned backend module is:

**Observations / Incidents**
