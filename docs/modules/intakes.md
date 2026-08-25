# Animal Intakes Module

## Overview

The Animal Intakes module records how and when an animal entered or re-entered M & P Shelter care.

An animal profile must exist before an intake record can be created.

The relationship is:

Animal  
→ has one or more intake records

An animal may have multiple intake records over time.

Example:

Initial rescue  
→ adoption  
→ animal returned  
→ new `ADOPTION_RETURN` intake

Because of this, `animal_id` is not unique inside `animal_intakes`.

---

# Roles and Access

All Intake endpoints require authentication.

## ADMIN

Can:

- Create intake records
- View an animal's intake history
- View one specific intake
- Update intake records

## VOLUNTEER

Can:

- Create intake records
- View an animal's intake history
- View one specific intake
- Update intake records

## CARETAKER

Can:

- View an animal's intake history
- View one specific intake

Cannot:

- Create intake records
- Update intake records

---

# API Routes

The Intake module uses nested animal routes because every intake belongs to an animal.

Base route:

`/api/animals/:animalId/intakes`

Implemented endpoints:

`POST /api/animals/:animalId/intakes`

`GET /api/animals/:animalId/intakes`

`GET /api/animals/:animalId/intakes/:intakeId`

`PATCH /api/animals/:animalId/intakes/:intakeId`

---

# Create Animal Intake

## Endpoint

`POST /api/animals/:animalId/intakes`

Allowed roles:

- `ADMIN`
- `VOLUNTEER`

Creates a new intake record for an existing animal.

The animal must:

- exist
- not be archived

The animal ID comes from:

`req.params.animalId`

The intake information comes from:

`req.body`

The authenticated staff member comes from:

`req.user.userId`

The authenticated user's ID is automatically used for:

- `created_by`
- `updated_by`

The client cannot manually provide these audit fields.

A valid `Idempotency-Key` request header is required for create requests.

---

# Create Intake Required Fields

The following fields are required when creating an intake.

## intakeDate

The calendar date when the animal entered shelter care.

Format:

`YYYY-MM-DD`

Example:

`2026-08-25`

Rules:

- must be a string
- must use `YYYY-MM-DD`
- must represent a real calendar date
- cannot be in the future

---

## intakeCategory

Allowed values:

- `RESCUE`
- `SURRENDERED`
- `ABANDONED_DUMPED`
- `ADOPTION_RETURN`
- `TRANSFER`
- `OTHER`

---

## intakeSource

Allowed values:

- `MNP_VOLUNTEER`
- `OUTSIDE_PERSON`
- `FOUND_BY_MNP`
- `UNKNOWN`
- `OTHER`

---

# Optional Intake Fields

## foundLocation

Location where the animal was found.

Maximum length:

`255 characters`

Example:

`Commonwealth Avenue, Quezon City`

---

## ageAtIntake

Free-text estimated or known age at the time of intake.

Maximum length:

`50 characters`

Example:

`Approximately 4 months`

The system does not guess an animal's age when the age is unknown.

---

## observedCondition

Free-text observation describing the animal's condition when received.

Example:

`Thin and slightly dirty but alert and responsive`

This is an observation only.

It is not considered a veterinary diagnosis.

Medical diagnoses belong to the Medical module.

---

## rescuedByUserId

References an internal M & P user.

The application first validates that the value has a valid UUID format.

The service then verifies the actual referenced user when required by the intake source.

---

## outsideRescuerName

Name of a rescuer who is not an internal M & P user.

Maximum length:

`100 characters`

---

## outsideRescuerContact

Optional free-text contact information.

Maximum length:

`100 characters`

Possible values include:

- `09171234567`
- `juan@example.com`
- `Messenger: Juan Dela Cruz`
- `Facebook: Juan Dela Cruz`

A strict phone-number regex is intentionally not used because this field may contain different contact methods.

---

## notes

Optional free-text notes relating to the intake.

---

# Intake Source Business Rules

The fields required for rescuer information depend on `intakeSource`.

## MNP_VOLUNTEER

`rescuedByUserId` is required.

The referenced user must represent an appropriate internal M & P staff member.

The service verifies that the referenced user exists.

Outside rescuer information is not required.

---

## OUTSIDE_PERSON

`outsideRescuerName` is required.

`outsideRescuerContact` is optional.

An internal `rescuedByUserId` is not required.

---

## FOUND_BY_MNP

`rescuedByUserId` may be provided.

---

## UNKNOWN

Rescuer identity information is optional.

---

## OTHER

Rescuer information is optional.

Additional explanation may be stored in:

`notes`

---

# Get Animal Intake History

## Endpoint

`GET /api/animals/:animalId/intakes`

Allowed roles:

- `ADMIN`
- `VOLUNTEER`
- `CARETAKER`

Returns all intake records belonging to the specified animal.

The repository filters using:

`WHERE animal_id = $1`

Records are ordered by:

`ORDER BY intake_date DESC, created_at DESC`

The repository returns:

`result.rows`

because one animal may have multiple intake records.

The service maps every row using:

`intakes.map(...)`

The API therefore returns an array.

Example response:

    {
      "success": true,
      "intakes": [
        {
          "intakeId": "...",
          "animalId": "...",
          "intakeDate": "2026-08-25",
          "intakeCategory": "RESCUE",
          "intakeSource": "OUTSIDE_PERSON"
        }
      ]
    }

If the animal exists but does not have any intake records, the result is:

    {
      "success": true,
      "intakes": []
    }

An empty intake history is not considered a `404`.

---

# Get One Intake

## Endpoint

`GET /api/animals/:animalId/intakes/:intakeId`

Allowed roles:

- `ADMIN`
- `VOLUNTEER`
- `CARETAKER`

Returns one specific intake record.

Both URL parameters are passed from the controller:

`req.params.animalId`

`req.params.intakeId`

The service validates both IDs.

The repository can still retrieve the intake using:

`findIntakeById(intakeId)`

because `intake_id` uniquely identifies the intake row.

The returned intake also contains:

`animal_id`

The service verifies that the intake belongs to the animal specified in the URL:

`intake.animal_id === validAnimalId`

If the intake does not exist:

`404 Intake not found`

If the intake exists but belongs to a different animal:

`404 Intake not found`

This prevents a request such as:

Animal B / Intake belonging to Animal A

from returning incorrect data.

---

# Update Intake

## Endpoint

`PATCH /api/animals/:animalId/intakes/:intakeId`

Allowed roles:

- `ADMIN`
- `VOLUNTEER`

Updates selected fields on an existing intake record.

The controller passes:

- `req.params.animalId`
- `req.params.intakeId`
- `req.body`
- `req.user.userId`

The service performs the following workflow:

validate animalId  
↓  
validate intakeId  
↓  
confirm animal exists  
↓  
confirm animal is not archived  
↓  
find intake  
↓  
confirm intake belongs to animal  
↓  
validate PATCH body  
↓  
calculate final intake source/rescuer data  
↓  
validate source-specific business rules  
↓  
update database  
↓  
return updated intake

---

# Editable Intake Fields

PATCH currently supports updates to:

- `intakeDate`
- `intakeCategory`
- `intakeSource`
- `foundLocation`
- `ageAtIntake`
- `observedCondition`
- `rescuedByUserId`
- `outsideRescuerName`
- `outsideRescuerContact`
- `notes`

The following are not directly editable by the client:

- `intakeId`
- `animalId`
- `createdBy`
- `createdAt`
- `updatedBy`
- `updatedAt`
- `idempotencyKey`
- `idempotencyRequestHash`

`updatedBy` is automatically populated using the authenticated user.

`updatedAt` is automatically updated by the repository.

---

# PATCH Validation

PATCH uses partial-update validation.

Only fields explicitly provided by the request are processed.

The validator uses:

`Object.prototype.hasOwnProperty.call(intakeData, field)`

This allows the application to distinguish between:

field not provided

and:

field explicitly provided as `null`

The request body must be a normal JSON object.

Valid example:

    {
      "notes": "Updated intake information."
    }

Invalid examples:

    null

and:

    []

An empty PATCH is also rejected.

Example:

    {}

Response:

`400 Bad Request`

Message:

`At least one intake field must be provided for update`

This also protects the dynamic SQL update query from receiving an empty `SET` operation.

---

# PATCH Final-State Validation

When updating fields related to the intake source, validation cannot examine only the new fields.

The service combines:

existing database values  
+  
new PATCH values

to determine the final state.

Example:

Existing source:

`OUTSIDE_PERSON`

PATCH:

    {
      "intakeSource": "MNP_VOLUNTEER"
    }

The service must verify that the final record also has a valid:

`rescuedByUserId`

This prevents PATCH from leaving the database in a business-invalid state.

---

# Animal and Intake Relationship Protection

Individual intake routes are nested:

`/api/animals/:animalId/intakes/:intakeId`

The application does not trust the URL relationship automatically.

The service verifies:

`existingIntake.animal_id === validAnimalId`

Example:

Animal A  
└── Intake 123

Valid:

`/api/animals/Animal-A/intakes/123`

Invalid:

`/api/animals/Animal-B/intakes/123`

The invalid request returns:

`404 Intake not found`

This behavior was manually tested.

---

# Nested Router Design

The Intake router is mounted using:

    app.use(
      "/api/animals/:animalId/intakes",
      animalIntakeRouter,
    );

The router itself is created with:

    const animalIntakeRouter = express.Router({
      mergeParams: true,
    });

`mergeParams: true` is required because `animalId` is defined in the parent route inside `app.js`.

Without it:

`req.params.animalId`

would not be available inside the Intake router.

Inside the router:

- `POST /`
- `GET /`
- `GET /:intakeId`
- `PATCH /:intakeId`

combine with the parent route to produce:

- `POST /api/animals/:animalId/intakes`
- `GET /api/animals/:animalId/intakes`
- `GET /api/animals/:animalId/intakes/:intakeId`
- `PATCH /api/animals/:animalId/intakes/:intakeId`

---

# Idempotency

Creating an intake uses backend idempotency protection.

This prevents an accidental repeated POST request from creating duplicate intake records.

Possible causes of repeated requests include:

- double-clicking the submit button
- mobile network retries
- frontend retries
- browser retries
- timeout followed by retry
- user submitting again because the first response appeared slow

---

# Idempotency Key

The client sends:

`Idempotency-Key`

as an HTTP request header.

The controller reads it using:

`req.get("Idempotency-Key")`

The value is passed to the service.

---

# Idempotency Request Hash

The backend generates a hash representing the normalized create-intake request.

The hash includes meaningful request data such as:

- `animalId`
- `intakeDate`
- `intakeCategory`
- `intakeSource`
- `foundLocation`
- `ageAtIntake`
- `observedCondition`
- `rescuedByUserId`
- `outsideRescuerName`
- `outsideRescuerContact`
- `notes`

The database stores:

- `idempotency_key`
- `idempotency_request_hash`

---

# Idempotency Database Constraint

The database uses the unique constraint:

`uq_animal_intakes_created_by_idempotency_key`

The uniqueness rule combines:

`created_by + idempotency_key`

This means the same authenticated user cannot create multiple intake records using the same key.

---

# First Idempotent Request

Example:

new `Idempotency-Key`  
+  
new intake request

The insert succeeds.

Response:

`201 Created`

A new intake row is created.

---

# Idempotency Replay

If the same authenticated user sends:

same `Idempotency-Key`  
+  
same request data

PostgreSQL raises unique violation code:

`23505`

The service checks that the violated constraint is:

`uq_animal_intakes_created_by_idempotency_key`

It then loads the existing record using:

    findIntakeByIdempotencyKey(
      createdBy,
      validIdempotencyKey,
    )

The stored request hash is compared to the new request hash.

If they match:

same intended request

The API returns the existing intake instead of inserting another row.

Response:

`200 OK`

No duplicate record is created.

---

# Idempotency Key Conflict

If the client sends:

same `Idempotency-Key`  
+  
different request data

the request hashes do not match.

The API returns:

`409 Conflict`

Message:

`Idempotency key has already been used for a different intake request`

This prevents one idempotency key from accidentally representing two different create operations.

---

# Frontend Duplicate Protection

Backend idempotency is the primary protection against duplicate create requests.

The future React frontend should also disable the submit button while the request is processing.

Example flow:

user clicks Save  
↓  
loading = true  
↓  
Save button disabled  
↓  
Axios request  
↓  
response received  
↓  
loading = false

The two protections serve different purposes:

Frontend button disabling:

- reduces accidental double-clicks
- improves user experience

Backend idempotency:

- protects data integrity
- handles retries and repeated requests

Frontend protection alone is not sufficient.

---

# Database Idempotency Verification

The database was checked for duplicate idempotency groups using:

    SELECT
      created_by,
      idempotency_key,
      COUNT(*) AS row_count
    FROM animal_intakes
    WHERE idempotency_key IS NOT NULL
    GROUP BY created_by, idempotency_key
    HAVING COUNT(*) > 1;

Expected and observed result:

`0 rows`

This confirms that no duplicate rows exist for the same:

`created_by + idempotency_key`

Older duplicate test intake rows may still exist because they were created before idempotency protection was implemented.

---

# Date Handling

`intake_date` is a PostgreSQL:

`DATE`

It represents a calendar date rather than a moment in time.

Originally, PostgreSQL/Node could serialize a value such as:

`2026-08-23`

into a JavaScript UTC timestamp such as:

`2026-08-22T16:00:00.000Z`

because midnight in the Philippines corresponds to the previous UTC calendar date.

To prevent this, repository queries return:

`intake_date::text AS intake_date`

The API therefore returns:

`2026-08-23`

instead of exposing an unnecessary timestamp.

Timestamp fields such as:

- `created_at`
- `updated_at`

remain timestamps because those fields represent actual points in time.

---

# Database Naming and API Naming

PostgreSQL uses snake_case.

Examples:

- `intake_id`
- `animal_id`
- `intake_date`
- `intake_category`
- `outside_rescuer_name`
- `created_by`

JavaScript and React conventionally use camelCase.

The service maps database results into:

- `intakeId`
- `animalId`
- `intakeDate`
- `intakeCategory`
- `outsideRescuerName`
- `createdBy`

This keeps the API consistent with JavaScript conventions.

Example:

Database:

`intake.intake_date`

API / React:

`intake.intakeDate`

CamelCase is not required for React compatibility, but it provides a cleaner and more consistent JavaScript API.

---

# Layer Responsibilities

The Intake module follows the application's layered architecture:

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

---

## Route Layer

Responsibilities:

- define endpoint path
- apply authentication
- apply RBAC
- call controller

Examples:

- `POST /`
- `GET /`
- `GET /:intakeId`
- `PATCH /:intakeId`

The route does not call repositories or business services directly.

---

## Middleware Layer

Handles:

- JWT authentication
- current-user loading
- RBAC authorization

Authentication populates:

`req.user`

---

## Controller Layer

Controllers handle HTTP-specific data.

They read values such as:

- `req.params.animalId`
- `req.params.intakeId`
- `req.body`
- `req.user.userId`
- `req.get("Idempotency-Key")`

Controllers call the service and return the HTTP response.

Controllers remain intentionally thin.

---

## Validation Layer

Validation handles input format and normalization.

Examples:

- required field checks
- type validation
- UUID format validation
- date format validation
- future-date validation
- string length validation
- enum validation
- PATCH field detection
- normalization using `trim()`

Validation answers:

`Is this input shaped correctly?`

---

## Service Layer

The service coordinates workflows and business logic.

Examples:

- Does the animal exist?
- Is the animal archived?
- Does the intake exist?
- Does this intake belong to this animal?
- Does the rescuer exist?
- Does the intake source match the rescuer information?
- Is an idempotency request a replay or conflict?

The service also maps database snake_case results into camelCase API objects.

The service answers:

`Is this operation actually allowed?`

---

## Repository Layer

The repository contains PostgreSQL operations.

Examples:

- INSERT animal intake
- SELECT intake history
- SELECT intake by ID
- UPDATE intake
- SELECT intake by idempotency key

Repositories use parameterized SQL queries such as:

`WHERE animal_id = $1`

instead of inserting raw user values into SQL strings.

The repository answers:

`How is this data stored or retrieved?`

---

# Important Repository Functions

Current important Intake repository functions:

- `insertAnimalIntake()`
- `findIntakesByAnimalId()`
- `findIntakeById()`
- `updateIntakeRecord()`
- `findIntakeByIdempotencyKey()`

---

# Important Service Functions

Current important Intake service functions include:

- `createAnimalIntake()`
- `getAnimalIntakes()`
- `getIntakeById()`
- `updateIntake()`

Supporting service logic also handles:

- intake source validation
- rescuer validation
- idempotency hashing
- idempotency replay detection

---

# Audit Fields

On creation:

`created_by`  
→ authenticated user

`updated_by`  
→ authenticated user

Both initially contain the same user ID.

On update:

`created_by`  
→ remains unchanged

`updated_by`  
→ current authenticated user

`updated_at`  
→ `NOW()`

Clients are not trusted to provide audit identity values.

---

# Error Behavior

Important Intake responses include:

`201 Created`

Used when:

- a new intake is successfully created

`200 OK`

Used when:

- GET succeeds
- PATCH succeeds
- an idempotent replay succeeds

`400 Bad Request`

Used for:

- invalid UUID
- invalid date
- invalid enum
- invalid request body
- empty PATCH
- invalid field values

`401 Unauthorized`

Used for:

- missing authentication
- invalid authentication

`403 Forbidden`

Used when:

- authenticated user lacks the required role

`404 Not Found`

Used when:

- animal does not exist
- animal is archived
- intake does not exist
- intake does not belong to animal

`409 Conflict`

Used when:

- the same idempotency key is reused with different request data

---

# Manual Testing Completed

The Intake module was manually tested using Thunder Client.

---

## Create Intake Test

Endpoint:

`POST /api/animals/:animalId/intakes`

Result:

`201 Created`

Verified that:

- intake was inserted
- correct animal ID was stored
- authenticated user populated audit fields
- source-specific fields were stored correctly

---

## Get Intake History Test

Endpoint:

`GET /api/animals/:animalId/intakes`

Result:

`200 OK`

Verified:

- array response
- intake belongs to requested animal
- date formatting returns `YYYY-MM-DD`

---

## Get One Intake Test

Endpoint:

`GET /api/animals/:animalId/intakes/:intakeId`

Result:

`200 OK`

Verified:

- correct intake returned
- correct animal relationship
- camelCase response mapping

---

## Valid PATCH Test

Endpoint:

`PATCH /api/animals/:animalId/intakes/:intakeId`

Result:

`200 OK`

Verified:

- editable fields changed
- existing fields remained intact
- `updatedBy` changed correctly
- `updatedAt` updated

---

## Empty PATCH Test

Request:

    {}

Result:

`400 Bad Request`

Verified message:

`At least one intake field must be provided for update`

---

## Wrong Animal Relationship Test

A real intake belonging to Animal A was requested through Animal B.

Example:

`/api/animals/Animal-B/intakes/Intake-From-Animal-A`

Result:

`404 Intake not found`

This confirmed the nested relationship validation works.

---

## Idempotency Verification Test

Repeated create requests using the same idempotency key were protected from duplicate creation.

The database query checking duplicate idempotency groups returned:

`0 rows`

---

# Development Issues Encountered

## Missing animalId Route Parameter

The Intake router was initially mounted as:

`app.use("/api/intake", intakeRoutes);`

This meant:

`req.params.animalId`

was undefined.

The route was corrected to:

    app.use(
      "/api/animals/:animalId/intakes",
      animalIntakeRouter,
    );

and:

`mergeParams: true`

was used.

---

## Controller and Service Parameter Mismatch

When nested animal validation was introduced, some controllers/services initially passed only:

`intakeId`

instead of:

- `animalId`
- `intakeId`

This caused parameters to shift or the animal relationship to be unavailable.

The function signatures were aligned.

Example:

    updateIntake(
      animalId,
      intakeId,
      intakeData,
      updatedBy,
    )

---

## Duplicate Intake Creation

During testing, sending the same create request multiple times created duplicate intake rows.

This exposed a real production concern.

The solution implemented was:

Idempotency-Key header  
+  
request hash  
+  
database unique constraint  
+  
replay detection  
+  
409 conflict for key reuse with different data

The future frontend will additionally disable the submit button while requests are processing.

---

## Intake Date Timezone Shift

A PostgreSQL `DATE` was initially serialized into a JavaScript timestamp and appeared as the previous UTC calendar date.

The repository was changed to:

`intake_date::text AS intake_date`

This preserved the intended calendar date.

---

# Current Intake Module Status

The Animal Intakes backend module is complete for the current MVP scope.

Implemented and tested:

- Create intake ✅
- Get animal intake history ✅
- Get one intake ✅
- Update intake ✅
- Authentication ✅
- RBAC ✅
- Create validation ✅
- PATCH validation ✅
- Empty PATCH protection ✅
- Animal existence validation ✅
- Archived-animal protection ✅
- Animal ↔ intake relationship check ✅
- Source-specific rescuer rules ✅
- PostgreSQL parameterized queries ✅
- Audit fields ✅
- Calendar-date handling ✅
- snake_case → camelCase mapping ✅
- Idempotency key ✅
- Request hashing ✅
- Duplicate POST protection ✅
- Idempotency conflict detection ✅
- Database idempotency verification ✅

The next development step after final documentation and commit is a hardening review of the Animals module before continuing to the next M & P Shelter module.
