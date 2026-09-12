# Cage Assignments Module

## Purpose

Manages the placement of animals into physical shelter cages in the M & P Shelter Monitoring System.

The module tracks:

- an animal's current cage
- previous cage placements
- when an animal was assigned
- who assigned the animal
- when an animal was removed
- who removed the animal
- the reason for the placement or move

Cage Assignments preserve placement history instead of deleting old assignments.

---

# Core Concept

A Cage Assignment represents:

```text
Animal
↓
assigned to
↓
Cage
```

An assignment is considered active when:

```text
removed_at IS NULL
```

An assignment becomes historical when:

```text
removed_at = timestamp
```

Example:

```text
Mochi → CAT-01
assigned_at = Aug 20
removed_at  = Aug 24
```

This is a historical assignment.

```text
Mochi → CAT-02
assigned_at = Aug 24
removed_at  = NULL
```

This is the animal's current assignment.

---

# Access

## ADMIN

Can:

- assign animals to cages
- move animals between cages
- remove animals from cages
- view current placements
- view cage placement history
- view animal cage history

## VOLUNTEER

Can:

- assign animals to cages
- move animals between cages
- remove animals from cages
- view current placements
- view cage placement history
- view animal cage history

## CARETAKER

Can:

- view current placements
- view cage placement history
- view animal cage history

CARETAKER cannot create, move, or remove Cage Assignments.

All Cage Assignment endpoints require authentication.

---

# API Endpoints

Implemented endpoints:

```text
POST /api/cage-assignments

GET /api/cage-assignments/current

POST /api/cage-assignments/:assignmentId/remove

GET /api/cages/:cageId/assignments

GET /api/animals/:animalId/cage-history

POST /api/animals/:animalId/move
```

---

# Authentication

The Cage Assignments router uses:

```js
router.use(authenticate);
```

All routes declared after this middleware require authentication.

Individual routes then use:

```js
authorizeRoles(...)
```

to enforce role-based access.

Conceptually:

```text
request
↓
authenticate
↓
authorize role
↓
controller
↓
service
↓
repository
↓
PostgreSQL
```

---

# Database Table

The module uses:

```text
cage_assignments
```

Important columns:

- `assignment_id`
- `animal_id`
- `cage_id`
- `assigned_at`
- `assigned_by`
- `removed_at`
- `removed_by`
- `reason`

---

# Assignment ID

`assignment_id` is a UUID.

PostgreSQL generates it using:

```text
gen_random_uuid()
```

The client does not provide the assignment ID during creation.

---

# Active Assignment

An assignment is active when:

```sql
removed_at IS NULL
```

Active assignments represent the animal's current Cage placement.

---

# Historical Assignment

When an animal leaves a Cage, the assignment row is not deleted.

Instead:

```text
removed_at
→ current timestamp

removed_by
→ authenticated user
```

This converts the current placement into historical placement data.

---

# One Active Cage Per Animal

The database contains the partial unique constraint:

```text
uq_cage_assignments_active_animal
```

Conceptually:

```sql
UNIQUE (animal_id)
WHERE removed_at IS NULL
```

This means an animal may have many historical Cage Assignments, but only one active Cage Assignment.

Example:

```text
Mochi → CAT-01
removed_at = Aug 20

Mochi → CAT-02
removed_at = Aug 23

Mochi → CAT-03
removed_at = NULL
```

This is valid.

The following is not allowed:

```text
Mochi → CAT-01
removed_at = NULL

Mochi → CAT-02
removed_at = NULL
```

PostgreSQL prevents this state.

---

# Assignment Date Integrity

The database enforces:

```text
removed_at IS NULL
OR
removed_at >= assigned_at
```

through:

```text
chk_assignment_dates
```

This prevents a Cage Assignment from being removed before it was created.

---

# Assign Animal

## Endpoint

```text
POST /api/cage-assignments
```

Creates a new active Cage Assignment for an animal that currently has no active Cage.

## Access

Allowed roles:

- `ADMIN`
- `VOLUNTEER`

---

# Assign Request

Example:

```json
{
  "animalId": "animal-uuid",
  "cageId": "cage-uuid",
  "reason": "Initial shelter placement"
}
```

Required:

- `animalId`
- `cageId`

Optional:

- `reason`

---

# Assignment Validation

The validation layer checks:

- request body is an object
- `animalId` is a valid UUID
- `cageId` is a valid UUID
- `reason` is a string or `null`

Whitespace-only reasons are normalized to:

```text
null
```

---

# Placement Business Rules

Database-dependent placement rules are handled by the service layer.

The service checks:

```text
animal exists?
↓
animal ACTIVE?
↓
cage exists?
↓
cage ACTIVE?
↓
species compatible?
↓
occupancy?
↓
gender grouping?
```

---

# Hard Blocks

Some conditions stop the placement.

## Animal Does Not Exist

Response:

```text
404 Not Found
```

---

## Animal Is Not ACTIVE

Only animals with:

```text
status = ACTIVE
```

may receive a new Cage Assignment.

Animals such as:

- `ADOPTED`
- `PASSED_AWAY`
- `MISSING`
- `ESCAPED`

cannot receive a new Cage Assignment.

Response:

```text
409 Conflict
```

---

## Cage Does Not Exist

Response:

```text
404 Not Found
```

---

## Cage Is Not ACTIVE

Animals may only be placed into:

```text
ACTIVE
```

Cages.

`INACTIVE` and `PLANNED` Cages cannot receive animals.

Response:

```text
409 Conflict
```

---

## Species Mismatch

Animal species must match the Cage species group.

Valid:

```text
CAT → CAT
DOG → DOG
```

Invalid:

```text
CAT → DOG
DOG → CAT
```

Species mismatch is a hard safety rule.

Response:

```text
409 Conflict
```

Example message:

```text
Animal species does not match the cage species group
```

---

# Warning Rules

Some conditions do not automatically stop placement.

Warnings are returned to staff while allowing the operation to continue.

Current warnings:

- recommended capacity reached/exceeded
- gender grouping mismatch

Conceptually:

```text
Hard rule
→ throw error
→ stop

Warning
→ add warning message
→ continue
```

---

# Recommended Capacity Warning

The service counts active Cage Assignments using:

```sql
removed_at IS NULL
```

If:

```text
occupancy >= recommendedCapacity
```

the response contains:

```text
Cage is at or above its recommended capacity
```

The assignment still succeeds.

This is intentional.

Recommended capacity is operational guidance rather than a hard housing limit.

In rescue situations, exceeding recommended capacity may still be preferable to leaving an animal without shelter.

---

# Gender Group Warning

Cages support:

- `MALE`
- `FEMALE`
- `MIXED`

If the Cage is not `MIXED` and the animal sex differs from the Cage gender group, the service adds:

```text
Animal sex does not match the cage gender group
```

The placement still succeeds.

Example:

```text
MALE CAT
↓
FEMALE-designated CAT cage
↓
warning
↓
assignment allowed
```

Species compatibility remains a hard rule.

---

# Assignment Response

A successful assignment returns:

```json
{
  "success": true,
  "assignment": {
    "assignmentId": "...",
    "animalId": "...",
    "cageId": "...",
    "assignedAt": "...",
    "assignedBy": "...",
    "removedAt": null,
    "removedBy": null,
    "reason": "Initial shelter placement"
  },
  "warnings": []
}
```

Warnings may contain one or more messages.

---

# Duplicate Active Assignment Protection

Before INSERT, the service checks:

```text
findActiveAssignmentByAnimalId()
```

If an active assignment already exists:

```text
409 Conflict
```

Example message:

```text
Animal already has an active cage assignment
```

The database also enforces:

```text
uq_cage_assignments_active_animal
```

This provides two layers of protection:

```text
service pre-check
→ clean normal business response

database unique constraint
→ concurrency/race-condition protection
```

PostgreSQL unique violation:

```text
23505
```

is translated into the same business conflict.

---

# Why Assign Does Not Currently Use Idempotency

Create Animal, Animal Intake, and Create Cage use explicit idempotency because repeating those operations could create multiple independent valid rows.

Cage Assignment creation already has a stronger domain constraint:

```text
one active assignment per animal
```

A repeated assignment request therefore cannot create a second active placement.

First request:

```text
animal unassigned
↓
assignment created
```

Repeated request:

```text
active assignment already exists
↓
409 Conflict
```

The partial UNIQUE constraint also protects concurrent requests.

Idempotency could still be added later to improve retry response semantics, but it is not currently required to maintain data integrity.

---

# Current Assignments

## Endpoint

```text
GET /api/cage-assignments/current
```

## Access

Allowed roles:

- `ADMIN`
- `VOLUNTEER`
- `CARETAKER`

Returns only assignments where:

```text
removed_at IS NULL
```

---

# Current Assignment View

The repository joins:

```text
cage_assignments
+
animals
+
cages
```

This allows the API to return useful information instead of only UUIDs.

Example:

```json
{
  "assignmentId": "...",
  "animalId": "...",
  "animalCode": "M&P-CAT-003",
  "animalName": "Luna",
  "species": "CAT",
  "sex": "FEMALE",
  "cageId": "...",
  "cageCode": "CAT-01",
  "speciesGroup": "CAT",
  "genderGroup": "FEMALE",
  "recommendedCapacity": 5,
  "assignedAt": "...",
  "assignedBy": "...",
  "reason": "Initial shelter placement"
}
```

This is more useful to the frontend than returning only:

```text
animal_id
cage_id
```

---

# Cage Assignment History

## Endpoint

```text
GET /api/cages/:cageId/assignments
```

Returns all assignments associated with a Cage.

This includes:

- current placements
- previous/historical placements

The query intentionally does not filter only:

```text
removed_at IS NULL
```

because the purpose is history.

---

# Cage History Example

```text
CAT-01

Luna
assigned Aug 20
removed_at = NULL

Mochi
assigned Aug 18
removed Aug 22

Milo
assigned Aug 19
removed Aug 24
```

All three remain visible in Cage history.

---

# Animal Cage History

## Endpoint

```text
GET /api/animals/:animalId/cage-history
```

Returns every Cage Assignment for one animal.

Example:

```text
Mochi
↓
CAT-01
Aug 20 → Aug 22

↓
CAT-02
Aug 22 → Aug 25

↓
ISOLATION CAT Cage
Aug 25 → current
```

This preserves the animal's housing history throughout its stay at the shelter.

---

# Remove Cage Assignment

## Endpoint

```text
POST /api/cage-assignments/:assignmentId/remove
```

## Access

Allowed roles:

- `ADMIN`
- `VOLUNTEER`

Remove means:

```text
close current assignment
```

It does not mean:

```text
DELETE assignment
```

---

# Remove Flow

```text
validate assignment ID
↓
find assignment
↓
assignment exists?
↓
already removed?
↓
set removed_at
↓
set removed_by
↓
return closed assignment
```

---

# Already Closed Assignment

If:

```text
removed_at IS NOT NULL
```

the service returns:

```text
409 Conflict
```

Example message:

```text
Cage assignment is already closed
```

The repository UPDATE also includes:

```sql
AND removed_at IS NULL
```

This protects against another request closing the assignment between the service SELECT and UPDATE.

---

# Move Animal

## Endpoint

```text
POST /api/animals/:animalId/move
```

## Access

Allowed roles:

- `ADMIN`
- `VOLUNTEER`

Move represents:

```text
close current Cage Assignment
+
create new Cage Assignment
```

These two writes must behave as one business operation.

---

# Move Request

The animal ID comes from the URL.

Example:

```text
POST /api/animals/:animalId/move
```

Request body:

```json
{
  "cageId": "destination-cage-uuid",
  "reason": "Moved to isolation"
}
```

The client does not provide the old Cage ID.

The backend discovers the current Cage using:

```text
findActiveAssignmentByAnimalId()
```

---

# Move Validation

Before changing database state, the service verifies:

- animal has an active assignment
- destination is not the same current Cage
- animal exists
- animal is ACTIVE
- destination Cage exists
- destination Cage is ACTIVE
- species matches
- capacity warnings
- gender warnings

---

# Same-Cage Move

If the animal is already assigned to the destination Cage:

```text
409 Conflict
```

Example:

```text
Animal is already assigned to this cage
```

---

# Move Transaction

Moving an animal requires two database writes:

```text
1. close old assignment
2. create new assignment
```

Partial success would create incorrect state.

Example without transaction:

```text
close CAT-01 assignment ✅
↓
create CAT-02 assignment ❌
↓
animal has no current Cage in the database
```

To prevent this, Move Animal uses a PostgreSQL transaction.

---

# Database Client

The service borrows a dedicated connection from the connection pool:

```js
const client = await pool.connect();
```

Conceptually:

```text
pool
→ collection of reusable PostgreSQL connections

client
→ one specific connection borrowed from the pool
```

The dedicated client is used for all important Move queries.

---

# Transaction Flow

Conceptually:

```text
borrow client
↓
BEGIN
↓
find current assignment
↓
validate destination
↓
close current assignment
↓
create new assignment
↓
COMMIT
↓
release client
```

If an error occurs:

```text
BEGIN
↓
operation
↓
failure
↓
ROLLBACK
↓
release client
```

---

# BEGIN

The transaction starts with:

```js
await client.query("BEGIN");
```

This tells PostgreSQL that subsequent operations belong to the same transaction.

---

# COMMIT

If all operations succeed:

```js
await client.query("COMMIT");
```

The changes become permanent.

Example:

```text
old CAT-01 assignment
→ removed_at timestamp

new CAT-02 assignment
→ removed_at NULL
```

---

# ROLLBACK

If any operation fails:

```js
await client.query("ROLLBACK");
```

PostgreSQL undoes changes made since `BEGIN`.

This prevents partial moves.

---

# Client Release

The service always returns the dedicated connection to the pool:

```js
client.release();
```

This is placed inside:

```js
finally
```

so the connection is returned whether the transaction succeeds or fails.

---

# Transaction-Aware Repository Functions

Some repository functions support:

```js
db = pool
```

Example concept:

```js
async function findAnimalById(animalId, db = pool)
```

Normal call:

```js
findAnimalById(animalId)
```

uses:

```text
pool
```

Transaction call:

```js
findAnimalById(animalId, client)
```

uses:

```text
client
```

This allows the same repository function to work both:

- normally
- inside a transaction

---

# Transaction-Aware Animal and Cage Lookups

To support Move Animal consistently, these existing repository functions were updated:

```text
findAnimalById(animalId, db = pool)

findCageById(cageId, db = pool)
```

This allows Cage Assignment Move validation to use the same transaction connection when retrieving:

- animal
- destination Cage
- current occupancy

Existing callers continue working because `pool` remains the default.

---

# Move Atomicity

The goal of the Move transaction is:

```text
ALL succeed
OR
NONE succeed
```

This property is commonly described as atomic behavior.

For the Move workflow:

```text
close old assignment
+
create new assignment
```

are treated as one logical operation.

---

# Move Warnings

Warnings may still be returned from Move.

Examples:

- destination at recommended capacity
- gender group mismatch

Warnings do not stop the transaction.

Hard errors stop the Move and trigger rollback.

---

# Move Idempotency

Move Animal does not currently use an explicit Idempotency-Key.

Repeating a successfully completed Move to the same destination is stopped by:

```text
Animal is already assigned to this cage
```

Therefore repeated requests do not create duplicate current assignments.

Explicit idempotency may be considered later if retry behavior needs to return the original successful response rather than a conflict.

---

# Validation Layer

File:

```text
cageAssignment.validation.js
```

Responsibilities include:

- request-body structure
- UUID formats
- `reason` type
- request normalization

Validation does not query PostgreSQL.

---

# Service Layer

File:

```text
cageAssignment.service.js
```

Responsibilities include:

- placement rules
- ACTIVE-status checks
- species compatibility
- capacity warnings
- gender warnings
- duplicate assignment detection
- Remove workflow
- Move workflow
- transaction management
- response mapping

This module demonstrates why business workflow logic belongs in the service layer rather than in controllers.

---

# Repository Layer

File:

```text
cageAssignment.repository.js
```

Important repository functions include:

```text
findActiveAssignmentByAnimalId()

findAssignmentById()

countActiveAssignmentsByCageId()

insertCageAssignment()

closeCageAssignment()

findCurrentAssignments()

findAssignmentsByCageId()

findAnimalCageHistory()
```

---

# Repository Function Groups

Conceptually, the repository can be understood as three groups.

## Current State

```text
findActiveAssignmentByAnimalId()
countActiveAssignmentsByCageId()
findCurrentAssignments()
```

## State Changes

```text
insertCageAssignment()
closeCageAssignment()
```

## History

```text
findAssignmentById()
findAssignmentsByCageId()
findAnimalCageHistory()
```

---

# `db = pool` Repository Pattern

Some functions use:

```js
db = pool
```

This means:

```text
no database argument supplied
→ use normal pool

transaction client supplied
→ use that client
```

Example:

```js
insertCageAssignment(data)
```

uses normal pool access.

Inside a transaction:

```js
insertCageAssignment(data, client)
```

uses the same dedicated connection as other Move operations.

`db = pool` does not itself provide transaction protection.

It makes repository functions flexible enough to participate in a transaction.

The transaction provides the actual protection through:

- `BEGIN`
- `COMMIT`
- `ROLLBACK`

---

# PostgreSQL JOINs

Current and historical assignment queries JOIN:

```text
cage_assignments
animals
cages
```

This allows the API to return:

- animal code
- animal name
- species
- sex
- Cage code
- species group
- gender group
- recommended capacity

instead of requiring the frontend to make separate requests for every UUID.

---

# Database Naming and API Naming

PostgreSQL uses snake_case.

Examples:

```text
assignment_id
animal_id
cage_id
assigned_at
assigned_by
removed_at
removed_by
```

The service maps results to camelCase.

Examples:

```text
assignmentId
animalId
cageId
assignedAt
assignedBy
removedAt
removedBy
```

---

# Mapper Functions

The service uses:

```text
mapAssignment()
```

for basic Cage Assignment records.

It also uses:

```text
mapAssignmentView()
```

for JOIN results containing animal and Cage information.

History queries were aligned so that `mapAssignmentView()` can return a consistent response structure.

---

# No Hard Delete

Cage Assignments are never deleted during normal operations.

Closing an assignment preserves:

- placement history
- assignment timestamp
- assigned user
- removal timestamp
- removing user
- reason

This allows the shelter to reconstruct an animal's placement history later.

---

# Reason Field

`reason` currently represents the reason for the placement or move.

Examples:

```text
Initial shelter placement
Moved for isolation
Moved closer to dependent kittens
Temporary housing
```

The current schema contains one `reason` field.

A separate `removal_reason` may be added later if the shelter needs to independently record why an animal left a Cage.

---

# Error Behavior

## 201 Created

Used for:

- successful initial Cage Assignment

## 200 OK

Used for:

- Move Animal
- Remove Cage Assignment
- current assignment list
- Cage history
- animal Cage history

## 400 Bad Request

Used for:

- malformed request body
- invalid assignment UUID
- invalid animal UUID
- invalid Cage UUID
- invalid reason type

## 401 Unauthorized

Used for:

- missing authentication
- invalid authentication

## 403 Forbidden

Used when:

- authenticated role cannot perform the operation

## 404 Not Found

Used when:

- animal does not exist
- Cage does not exist
- assignment does not exist

## 409 Conflict

Used for business-state conflicts such as:

- animal already has an active assignment
- animal not ACTIVE
- Cage not ACTIVE
- species mismatch
- moving to same Cage
- animal has no current assignment for Move
- assignment already closed

---

# Manual Testing

The Cage Assignments module was manually tested using Thunder Client and PostgreSQL.

---

# Valid Assignment Test

A valid ACTIVE CAT was assigned to an ACTIVE CAT Cage.

Verified:

```text
201 Created
```

The response contained:

- assignment ID
- animal ID
- Cage ID
- assigned timestamp
- assigning user
- `removedAt = null`
- warnings array

---

# Duplicate Active Assignment Test

The same animal was assigned again while already having an active assignment.

Verified:

```text
409 Conflict
```

Message:

```text
Animal already has an active cage assignment
```

No duplicate active placement was created.

---

# Species Mismatch Test

An unassigned CAT was assigned to:

```text
DOG-01
```

Verified:

```text
409 Conflict
```

Message:

```text
Animal species does not match the cage species group
```

No assignment was created.

---

# Gender Warning Test

A MALE CAT was assigned to:

```text
CAT-01
genderGroup = FEMALE
```

Verified:

```text
201 Created
```

The assignment succeeded.

Response contained:

```text
Animal sex does not match the cage gender group
```

inside the warnings array.

---

# Capacity Warning Test

During testing, CAT-01 recommended capacity was temporarily reduced.

Current occupancy was already at or above the temporary recommended capacity.

Another CAT was assigned.

Verified:

```text
201 Created
```

The assignment succeeded.

Response contained:

```text
Cage is at or above its recommended capacity
```

The Cage recommended capacity was then restored.

---

# Successful Move Transaction Test

An animal was moved from:

```text
CAT-01
```

to a second compatible CAT Cage.

Verified:

```text
200 OK
```

The response included:

- `previousAssignment`
- new `assignment`
- warnings

The old assignment received:

```text
removedAt = timestamp
removedBy = authenticated user
```

The new assignment received:

```text
removedAt = null
removedBy = null
```

The previous removal timestamp and new assignment timestamp occurred as part of the same Move operation.

---

# Failed Move Test

A CAT currently assigned to a CAT Cage was moved toward:

```text
DOG-01
```

Verified:

```text
409 Conflict
```

Message:

```text
Animal species does not match the cage species group
```

The animal's valid current CAT assignment remained active.

No DOG assignment was created.

---

# Current Assignment Verification

After Move testing, PostgreSQL was queried directly.

Verified:

- old Cage Assignment had `removed_at`
- current Cage Assignment had `removed_at = NULL`
- only one active Cage Assignment remained for the animal

---

# Remove Assignment Test

An active Cage Assignment was removed.

Verified:

```text
200 OK
```

The returned assignment contained:

```text
removedAt = timestamp
removedBy = authenticated user
```

The assignment row remained in PostgreSQL.

---

# Repeated Remove Test

The same closed assignment was removed again.

Verified:

```text
409 Conflict
```

Message:

```text
Cage assignment is already closed
```

---

# Current Assignments GET Test

Tested:

```text
GET /api/cage-assignments/current
```

Verified:

```text
200 OK
```

Only active assignments were returned.

JOIN information included:

- animal code
- animal name
- species
- sex
- Cage code
- Cage grouping information

---

# Cage Assignment History Test

Tested:

```text
GET /api/cages/:cageId/assignments
```

Verified:

```text
200 OK
```

CAT-01 history returned both:

- currently active assignments
- previously removed assignments

This confirmed historical placements are preserved.

---

# Empty Cage History Test

DOG-01 had no successful Cage Assignments.

The CAT → DOG placement/move attempts were rejected.

Querying DOG-01 history returned:

```json
{
  "success": true,
  "assignments": []
}
```

This confirmed failed placement attempts do not create history rows.

---

# Animal Cage History Test

Tested:

```text
GET /api/animals/:animalId/cage-history
```

Verified:

```text
200 OK
```

The animal's Cage history was returned correctly.

---

# Development Decisions and Improvements

## Warnings Instead of Hard Capacity Blocking

Recommended Cage capacity was intentionally implemented as a warning.

The system should inform staff about crowding without preventing shelter placement during emergency rescue situations.

---

## Species Is a Hard Safety Rule

CAT/DOG species mismatch is blocked.

This matches the Cage design where `species_group` allows only:

- CAT
- DOG

---

## Gender Is Warning-Based

Gender grouping is advisory in the MVP.

A mismatch informs staff without automatically preventing shelter placement.

---

## Placement History Is Preserved

Assignments are closed rather than deleted.

This allows both animal and Cage history to be reconstructed.

---

## Move Uses a PostgreSQL Transaction

Move Animal introduced the first major multi-write transaction workflow in the M & P backend.

This improves the architecture compared with workflows that perform multiple related database writes independently.

---

## Validation Before Writes

Destination placement rules are checked before closing the current assignment.

This avoids unnecessary UPDATE operations when the destination itself is invalid.

The transaction still protects the workflow from failures occurring after writes begin.

---

## Existing Repository Functions Became Transaction-Aware

`findAnimalById()` and `findCageById()` were updated to optionally accept:

```text
db = pool
```

This allows them to participate in Cage Assignment transactions without breaking their normal use in the Animals and Cages modules.

---

# Current Cage Assignments Module Status

The Cage Assignments backend module is complete for the current MVP scope.

Implemented and tested:

- Assign animal to Cage ✅
- UUID validation ✅
- Animal existence check ✅
- Animal ACTIVE-status check ✅
- Cage existence check ✅
- Cage ACTIVE-status check ✅
- CAT/DOG species hard block ✅
- Gender mismatch warning ✅
- Recommended-capacity warning ✅
- One active Cage per animal ✅
- Database race-condition protection ✅
- Current assignment lookup ✅
- Current occupancy count ✅
- Current assignment list ✅
- Cage placement history ✅
- Animal Cage history ✅
- Remove Cage Assignment ✅
- Repeated removal protection ✅
- Move Animal ✅
- Same-Cage Move protection ✅
- PostgreSQL transaction ✅
- Dedicated transaction client ✅
- BEGIN ✅
- COMMIT ✅
- ROLLBACK ✅
- client release ✅
- Transaction-aware repositories ✅
- Historical assignment preservation ✅
- PostgreSQL JOIN views ✅
- snake_case to camelCase mapping ✅
- Authentication ✅
- Role-based access control ✅
- Parameterized SQL ✅

The Cage Assignments module is considered complete for the current backend MVP.

The next operational module is:

**Care Records**
