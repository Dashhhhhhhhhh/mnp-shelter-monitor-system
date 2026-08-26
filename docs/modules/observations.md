Observations Module

Overview

The Observations module records operational concerns noticed by shelter staff while caring for animals and cages.

Examples include:

an animal not eating

vomiting

diarrhea

injuries

limping

fighting

unusual behavior

eye or nose discharge

cage concerns

other general observations

The module behaves similarly to a lightweight ticketing workflow.

An observation begins as a report and can later be claimed by an authorized staff member, monitored, resolved, or escalated for medical attention.

The module supports both:

cage-level observations

animal-specific observations

Animal-specific observations are validated against the animal's current cage assignment.

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

src/modules/observations/
├── observation.routes.js
├── observation.controller.js
├── observation.service.js
├── observation.repository.js
└── observation.validation.js

Supporting modules used by Observations:

cages
animals
cage_assignments
authentication
RBAC

Database

The primary table is:

observations

Main fields:

observation_id
cage_id
animal_id
observation_type
urgency
status
notes
photo
created_by
handled_by
updated_by
created_at
updated_at
resolved_at

Database Migrations

Migration 008

The original Observations table was created in:

008_create_observations.sql

The table includes foreign keys to:

cages
animals
users

The animal relationship is optional.

Therefore:

cage_id → required
animal_id → optional

This allows both cage observations and animal-specific observations.

Migration 034

Migration:

034_add_observations_handled_by_constraint.sql

adds a database-level constraint protecting the relationship between status and handled_by.

ALTER TABLE observations
ADD CONSTRAINT chk_observation_handled_by
CHECK (
(
status = 'NEW'
AND handled_by IS NULL
)
OR
(
status IN (
'BEING_HANDLED',
'MONITORING',
'RESOLVED',
'ESCALATED_TO_MEDICAL'
)
AND handled_by IS NOT NULL
)
);

This guarantees:

NEW
→ handled_by must be NULL

while:

BEING_HANDLED
MONITORING
RESOLVED
ESCALATED_TO_MEDICAL
→ handled_by must NOT be NULL

The database therefore protects the workflow even if application code contains a future bug.

Observation Types

Allowed observation types:

NOT_EATING
VOMITING
DIARRHEA
INJURY
LIMPING
FIGHTING
EYE_NOSE_DISCHARGE
UNUSUAL_BEHAVIOR
CAGE_CONCERN
OTHER

Input is normalized using:

trim()
toUpperCase()

Invalid observation types return 400 Bad Request.

Urgency Levels

Allowed urgency values:

NORMAL
NEEDS_ATTENTION
URGENT

If urgency is omitted when creating an observation, NORMAL is used by default.

Urgency input is normalized using:

trim()
toUpperCase()

Observation Statuses

Allowed workflow states:

NEW
BEING_HANDLED
MONITORING
RESOLVED
ESCALATED_TO_MEDICAL

Workflow

Main lifecycle:

NEW
↓
BEING_HANDLED
↓
MONITORING
├──→ RESOLVED
└──→ ESCALATED_TO_MEDICAL

An observation may also be resolved or escalated directly from BEING_HANDLED without first entering MONITORING.

Terminal States

The following statuses are terminal:

RESOLVED
ESCALATED_TO_MEDICAL

Once an observation reaches either state, its workflow can no longer be modified.

The service rejects further workflow actions with 409 Conflict.

Example message:

This observation can no longer be modified

Reporter and Handler

created_by

created_by represents the person who originally reported the observation.

This is similar to the reporter of a ticket.

handled_by

handled_by represents the person currently responsible for handling the observation.

When an observation is NEW:

handled_by = NULL

When an ADMIN or VOLUNTEER claims it:

status = BEING_HANDLED
handled_by = claimant user ID

Creator Ownership

While an observation is still NEW, the original creator may edit the report.

ADMIN also has an override and may edit a NEW observation.

Other users may not edit somebody else's NEW observation.

Example:

Anna creates observation
↓
created_by = Anna
↓
Maria tries to PATCH it
↓
403 Forbidden

After an observation is claimed, its original report details can no longer be edited.

Handler Ownership

After an observation has been claimed, only the assigned handler may perform workflow actions such as:

monitor
resolve
escalate

The service verifies:

observation.handled_by === req.user.userId

This means RBAC alone does not grant access.

Both conditions matter:

Role permission

- Resource ownership

Role-Based Access Control

Supported roles:

ADMIN
VOLUNTEER
CARETAKER

All Observation routes require authentication.

router.use(authenticate);

Route Permissions

Method

Endpoint

ADMIN

VOLUNTEER

CARETAKER

POST

/api/observations

✅

✅

✅

GET

/api/observations

✅

✅

✅

GET

/api/observations/:observationId

✅

✅

✅

PATCH

/api/observations/:observationId

✅

✅

✅

POST

/api/observations/:observationId/claim

✅

✅

❌

POST

/api/observations/:observationId/monitor

✅

✅

❌

POST

/api/observations/:observationId/resolve

✅

✅

❌

POST

/api/observations/:observationId/escalate

✅

✅

❌

POST

/api/observations/:observationId/take-over

✅

❌

❌

PATCH access is further restricted by service-level ownership and workflow rules.

Create Observation

Endpoint:

POST /api/observations

Allowed roles:

ADMIN
VOLUNTEER
CARETAKER

Example cage-level request:

{
"cageId": "0a74a7d2-3bb8-430e-bd02-33b7bd33061a",
"observationType": "CAGE_CONCERN",
"urgency": "NEEDS_ATTENTION",
"notes": "Cage latch feels loose",
"photo": null
}

Example animal-specific request:

{
"cageId": "0a74a7d2-3bb8-430e-bd02-33b7bd33061a",
"animalId": "1ebf59a1-6ddd-415a-bc17-bb5d865b87b1",
"observationType": "NOT_EATING",
"urgency": "NEEDS_ATTENTION",
"notes": "Luna did not eat during feeding",
"photo": null
}

Successful creation returns 201 Created.

Initial state:

status = NEW
handledBy = null
resolvedAt = null

Cage Validation

Every observation requires a cage.

The service verifies:

cage exists
AND
cage status = ACTIVE

If the cage does not exist: 404 Not Found.

If the cage exists but is not active: 409 Conflict.

Animal Validation

Animal association is optional.

If animalId = null, the observation is treated as a cage-level observation.

If an animal is supplied, the service verifies:

animal exists
↓
animal is ACTIVE
↓
animal has an active cage assignment
↓
animal's current cage matches cageId

Cage and Animal Relationship Validation

The backend does not trust the relationship supplied by the frontend.

Example:

Luna currently belongs to CAT-01

Request:

animalId = Luna
cageId = DOG-01

Both IDs individually exist, but the relationship is invalid.

The service returns 409 Conflict with:

Animal is not currently assigned to the selected cage

Updating an Observation

Endpoint:

PATCH /api/observations/:observationId

Only observations with status = NEW may have report details edited.

Supported fields:

cageId
animalId
observationType
urgency
notes
photo

At least one supported field must be supplied.

Empty PATCH requests return 400 Bad Request.

PATCH Context Validation

Cage/animal relationship validation is only repeated if the PATCH actually changes cageId or animalId.

This protects historical observation data.

PATCH notes / urgency / photo / observationType
→ no cage-assignment revalidation

PATCH cageId / animalId
→ validate cage + animal relationship

Claim Observation

Endpoint:

POST /api/observations/:observationId/claim

Allowed roles:

ADMIN
VOLUNTEER

Only NEW observations may be claimed.

Successful claim:

NEW
↓
BEING_HANDLED

and:

handled_by = claimant
updated_by = claimant

Duplicate Claim Protection

The repository uses a conditional UPDATE:

WHERE observation_id = $1
AND status = 'NEW'
AND handled_by IS NULL

This protects against duplicate or concurrent claims.

Only one claim can successfully update the record from NEW.

A later/repeated claim returns 409 Conflict.

Monitoring

Endpoint:

POST /api/observations/:observationId/monitor

Allowed roles:

ADMIN
VOLUNTEER

Required current state:

BEING_HANDLED

Transition:

BEING_HANDLED
↓
MONITORING

Only the assigned handler may perform this action.

Resolve Observation

Endpoint:

POST /api/observations/:observationId/resolve

Allowed current states:

BEING_HANDLED
MONITORING

Transitions:

BEING_HANDLED → RESOLVED
MONITORING → RESOLVED

Only the assigned handler may resolve an observation.

resolved_at

When the target state is RESOLVED, the repository sets:

resolved_at = CURRENT_TIMESTAMP

Therefore:

RESOLVED
→ resolved_at contains timestamp

Escalate to Medical

Endpoint:

POST /api/observations/:observationId/escalate

Allowed current states:

BEING_HANDLED
MONITORING

Transitions:

BEING_HANDLED → ESCALATED_TO_MEDICAL
MONITORING → ESCALATED_TO_MEDICAL

Only the assigned handler may escalate an observation.

Escalation ends the Observation workflow but does not mean the medical concern itself is resolved.

Therefore:

status = ESCALATED_TO_MEDICAL
resolved_at = NULL

Future Medical Integration

Currently, ESCALATED_TO_MEDICAL only changes the Observation workflow state.

A future Medical module may support:

Observation escalation
↓
Create medical record
↓
Link medical record to animal
↓
Record treatment / diagnosis

If escalation later performs multiple writes, those writes should use a transaction.

Admin Takeover

Endpoint:

POST /api/observations/:observationId/take-over

Allowed role:

ADMIN only

Takeover is allowed when an observation is:

BEING_HANDLED
MONITORING

The status remains unchanged.

Only:

handled_by
updated_by
updated_at

are changed.

After takeover, the previous handler may no longer modify the observation workflow.

Takeover Restrictions

ADMIN cannot take over NEW observations.

NEW observations should use /claim instead.

ADMIN also cannot take over terminal observations:

RESOLVED
ESCALATED_TO_MEDICAL

If the ADMIN is already the assigned handler, 409 Conflict is returned.

Workflow Error Order

Workflow actions validate conditions in this order:

terminal state
↓
valid current workflow state
↓
handler ownership
↓
conditional database UPDATE

This gives more accurate API errors.

Repository Concurrency Protection

The service performs business-rule checks before updates.

The repository repeats important conditions inside the actual SQL UPDATE.

Example:

WHERE observation_id = $1
AND handled_by = $3
AND status = ANY($4::varchar[])

The update succeeds only if the correct observation, correct handler, and allowed current status still exist at update time.

If not, zero rows are returned and the service converts the result into 409 Conflict.

PostgreSQL Status Cast

The Observation status update query explicitly casts the status parameter:

$2::varchar

Example:

status = $2::varchar

and:

WHEN $2::varchar = 'RESOLVED'

This resolves PostgreSQL parameter type inference ambiguity when the same parameter is used both as an assigned value and in a CASE expression.

Reading One Observation

Endpoint:

GET /api/observations/:observationId

The repository joins:

observations

- cages
- animals

Cage uses JOIN cages because every observation requires a cage.

Animal uses LEFT JOIN animals because animal_id is optional.

The API may return:

cageCode
speciesGroup
animalCode
animalName

in addition to IDs.

Reading Observations

Endpoint:

GET /api/observations

Observations are ordered for operational use.

First, active observations:

NEW
BEING_HANDLED
MONITORING

Then terminal observations:

RESOLVED
ESCALATED_TO_MEDICAL

Within each group:

URGENT
↓
NEEDS_ATTENTION
↓
NORMAL

Within the same urgency, newest created_at appears first.

Conceptual ordering:

ORDER BY
CASE
WHEN status IN ('NEW', 'BEING_HANDLED', 'MONITORING') THEN 1
ELSE 2
END,
CASE urgency
WHEN 'URGENT' THEN 1
WHEN 'NEEDS_ATTENTION' THEN 2
WHEN 'NORMAL' THEN 3
END,
created_at DESC

API Mapping

Database rows use snake_case:

observation_id
cage_id
animal_id
created_by
handled_by
resolved_at

The service mapper converts them into camelCase:

observationId
cageId
animalId
createdBy
handledBy
resolvedAt

The mapper also exposes joined display fields when available:

cageCode
speciesGroup
animalCode
animalName

This keeps the API response contract separate from the physical database schema.

Photo Field

Current field:

photo

is a nullable string.

For the MVP it represents a stored path or URL/reference.

Direct image upload and cloud storage are not implemented yet.

Possible future improvements:

photoUrl
multiple photos
cloud storage
upload validation

Validation Summary

Create

Validates:

request body object
cageId UUID
optional animalId UUID
observationType
urgency
notes
photo

Update

Validates:

request body object
at least one supported field
optional cageId
optional animalId including explicit null
observationType
urgency
notes
photo

Using hasOwnProperty() allows the validator to distinguish a field that was omitted from a field intentionally set to null.

HTTP Status Usage

Common status codes:

200 OK
→ successful read/update/workflow action

201 Created
→ observation created

400 Bad Request
→ malformed UUID
→ invalid enum
→ invalid request shape
→ empty PATCH

403 Forbidden
→ role not authorized
→ user is not creator
→ user is not assigned handler

404 Not Found
→ observation not found
→ cage not found
→ animal not found

409 Conflict
→ invalid workflow state
→ inactive cage
→ inactive animal
→ no active cage assignment
→ cage/animal mismatch
→ observation already claimed
→ terminal observation modification
→ concurrent state change

Tested Workflows

The following cases were manually tested.

Creation

Cage-level observation → 201 ✅
Animal-specific observation → 201 ✅

Animal Cage Matching

Luna / M&P-CAT-003 → CAT-01 → accepted ✅
Luna → DOG-01 → 409 Conflict ✅

Creator Editing

Creator edits own NEW observation → 200 ✅
Different user edits another user's NEW observation → 403 ✅
Creator edits after claim → 409 ✅

Claim

VOLUNTEER claims NEW observation → BEING_HANDLED ✅
Repeated claim → 409 ✅
CARETAKER attempts claim → 403 ✅

Handler Ownership

Wrong user attempts monitor → 403 ✅
Assigned handler monitors → MONITORING ✅

Resolve

MONITORING → RESOLVED ✅
resolvedAt = timestamp ✅
Further workflow modification → 409 ✅

Escalation

MONITORING → ESCALATED_TO_MEDICAL ✅
resolvedAt = null ✅
Further workflow modification → 409 ✅

Admin Takeover

ADMIN takeover from VOLUNTEER → handler changes, status unchanged ✅
Previous handler workflow attempt → 403 ✅
VOLUNTEER uses /take-over → 403 ✅
ADMIN takeover of NEW observation → 409 ✅

Reading

GET one → 200 ✅
Joined cage/animal display fields returned ✅
GET all → 200 ✅
Urgency ordering tested ✅
Active-first ordering added ✅

Syntax Verification

All Observation JavaScript files were checked using:

for file in src/modules/observations/\*.js; do
echo "Checking $file"
  node --check "$file"
done

Files checked:

observation.controller.js
observation.repository.js
observation.routes.js
observation.service.js
observation.validation.js

No syntax errors were reported.

Current Limitations / Deferred Features

The current module intentionally does not yet implement:

pagination
query filters
full status history
activity log entries
notification generation
medical record auto-creation
image uploading
cloud photo storage

These will be integrated with later modules where appropriate.

Future Activity Log Integration

Future Activity Logs should record important Observation events such as:

OBSERVATION_CREATED
OBSERVATION_UPDATED
OBSERVATION_CLAIMED
OBSERVATION_MONITORING
OBSERVATION_RESOLVED
OBSERVATION_ESCALATED
OBSERVATION_TAKEN_OVER

The activity history should be append-only.

Future Notifications Integration

Notifications may later be generated for:

URGENT observations
NEEDS_ATTENTION observations
new observations
observation takeover
medical escalation

Reading a notification will not change the Observation workflow state.

Future Frontend Behavior

The React staff portal should reflect backend rules.

NEW
→ show Edit to creator
→ show Claim to ADMIN/VOLUNTEER

BEING_HANDLED
→ handler can Monitor / Resolve / Escalate

MONITORING
→ handler can Resolve / Escalate

RESOLVED
ESCALATED_TO_MEDICAL
→ read-only

ADMIN may receive an explicit Take Over action when another user owns an active observation.

Frontend controls are for user experience only. The backend remains the authoritative security and workflow enforcement layer.

Module Status

Observations Module
✅ Core backend complete
✅ Validation complete
✅ RBAC complete
✅ Ownership rules complete
✅ Workflow transitions complete
✅ Concurrency protections complete
✅ Database status constraint complete
✅ Manual workflow testing complete
✅ Syntax verification complete

Remaining work belongs primarily to later integrations:

Medical
Activity Logs
Notifications
Frontend
Photo storage
Reporting
