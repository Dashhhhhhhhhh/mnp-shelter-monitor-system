# Animals Module

## Purpose

Manages permanent animal profiles in the M & P Shelter Monitoring System.

Animal records are preserved for historical purposes. Normal operations do
not permanently delete animal rows.

---

## Access

### ADMIN

- Create animals
- View animals
- Update animals
- Archive animals

### VOLUNTEER

- Create animals
- View animals
- Update animals

### CARETAKER

- View animals

---

# Endpoints

## POST /api/animals

Creates a new animal profile.

### Access

- ADMIN
- VOLUNTEER

### Required Fields

- species
- sex
- lifeStage

### Optional Fields

- animalName
- breed
- collarColor
- birthDate
- birthDateIsEstimated
- healthStatus

### Backend-Controlled Fields

The client does not control:

- animalCode
- status
- adoptionStatus
- createdBy
- updatedBy

Default values:

- status = ACTIVE
- adoptionStatus = NOT_READY
- healthStatus = UNKNOWN when not supplied

### Animal Code

Animal codes are automatically generated using PostgreSQL sequences.

Examples:

- M&P-CAT-001
- M&P-CAT-002
- M&P-DOG-001

CAT and DOG use separate sequences.

Sequence numbers may contain gaps if a number is generated but the later
INSERT fails. Gaps are acceptable because animal codes are identifiers, not
accounting numbers.

### Create Flow

POST /api/animals
→ authenticate
→ authorizeRoles("ADMIN", "VOLUNTEER")
→ controller
→ service
→ validateCreateAnimalInput()
→ generate animal code
→ insertAnimal()
→ PostgreSQL
→ 201 Created

---

## GET /api/animals

Returns a searchable, filterable, sortable, paginated animal list.

### Access

- ADMIN
- VOLUNTEER
- CARETAKER

### Search

`search`

Search currently checks:

- animal name
- animal code
- breed

PostgreSQL `ILIKE` is used for case-insensitive partial matching.

Example:

`GET /api/animals?search=mo`

### Filters

Supported filters:

- species
- sex
- lifeStage
- healthStatus
- adoptionStatus
- status

Examples:

`GET /api/animals?species=CAT`

`GET /api/animals?species=CAT&healthStatus=HEALTHY`

### Sorting

Supported sort fields:

- createdAt
- animalName
- animalCode
- species
- lifeStage
- healthStatus
- adoptionStatus

Supported sort orders:

- asc
- desc

Default:

- sortBy = createdAt
- sortOrder = desc

Example:

`GET /api/animals?sortBy=animalName&sortOrder=asc`

### Pagination

Query parameters:

- page
- limit

Defaults:

- page = 1
- limit = 20

Maximum limit:

- 100

Example:

`GET /api/animals?page=2&limit=20`

Response includes:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 25,
    "totalPages": 2
  }
}

### Archived Animals

Archived animals are automatically excluded from normal list results.

---

## GET /api/animals/:animalId

Returns a single animal profile.

### Access

- ADMIN
- VOLUNTEER
- CARETAKER

### Validation

The animal ID must be a valid UUID.

### Responses

- 200 OK - Animal found
- 400 Bad Request - Invalid UUID
- 404 Not Found - Animal does not exist or has been archived

---

## PATCH /api/animals/:animalId

Updates editable animal profile fields.

### Access

- ADMIN
- VOLUNTEER

### Editable Fields

- animalName
- breed
- lifeStage
- sex
- collarColor
- birthDate
- birthDateIsEstimated
- healthStatus

PATCH supports partial updates.

For example, an update may contain only:

    {
      "collarColor": "Green",
      "healthStatus": "UNDER_OBSERVATION"
    }

Only supplied fields are updated.

### Protected Fields

Normal profile updates cannot modify:

- animalCode
- species
- status
- adoptionStatus
- createdBy
- updatedBy

`updatedBy` is automatically taken from the authenticated user's ID.

`updatedAt` is automatically set by the backend/database.

### Business Rules

Species/life-stage compatibility is enforced.

Examples:

- CAT + KITTEN = valid
- CAT + PUPPY = invalid
- DOG + PUPPY = valid
- DOG + KITTEN = invalid

Birth-date consistency is also checked against the existing database record.

---

## PATCH /api/animals/:animalId/archive

Soft-archives an animal record.

### Access

ADMIN only.

### Purpose

Archiving is intended for records such as:

- accidental records
- duplicate records
- records that should no longer appear in normal operations

Archiving is different from animal lifecycle status.

Examples:

- ADOPTED = lifecycle status
- PASSED_AWAY = lifecycle status
- MISSING = lifecycle status
- ARCHIVED = record visibility

### Archive Fields

- is_archived
- archived_at
- archived_by

When archived:

- is_archived = TRUE
- archived_at = current timestamp
- archived_by = authenticated ADMIN
- updated_by = authenticated ADMIN
- updated_at = current timestamp

The row is NOT deleted from PostgreSQL.

Normal animal list and detail endpoints exclude archived records.

---

# Validation

## Create Validation

Handled by:

`validateCreateAnimalInput()`

Checks include:

- required fields
- string types
- allowed species
- allowed sex
- allowed life stage
- species/life-stage compatibility
- field length limits
- birth date format
- real calendar date
- birth date cannot be in the future
- estimated birth-date consistency
- allowed health status

## List Query Validation

Handled by:

`validateAnimalListQuery()`

Checks and normalizes:

- search
- filters
- sorting
- page
- limit

Invalid filter values return 400 instead of silently returning an empty result.

## Update Validation

Handled by:

`validateUpdateAnimalInput()`

Only fields actually supplied in the PATCH request are validated and returned in the updates object.

---

# Repository Patterns

The Animals repository demonstrates:

- PostgreSQL sequences
- parameterized queries
- dynamic filters
- dynamic WHERE clauses
- safe sort-column allowlists
- COUNT queries
- LIMIT/OFFSET pagination
- dynamic PATCH UPDATE statements
- soft archiving
- RETURNING clauses

Dynamic SQL values remain parameterized.

Allowed dynamic column names come from backend-controlled maps instead of directly from user input.

---

# Audit Rules

On CREATE:

- created_by = authenticated user
- updated_by = authenticated user

On UPDATE:

- created_by remains unchanged
- updated_by = authenticated user

On ARCHIVE:

- archived_by = authenticated ADMIN
- archived_at = current timestamp
- updated_by = authenticated ADMIN

Audit user IDs are never accepted from `req.body`.

---

# Database Migrations

Relevant migrations:

- 023 - animal code sequences
- 024 - updated animal life-stage constraint
- 025 - animal archiving fields

---

# Current Animals v1 Status

Implemented:

- Create animal
- Automatic species-based animal codes
- List animals
- Search
- Filtering
- Sorting
- Pagination
- Get animal by ID
- Partial profile update
- UUID validation
- Soft archive
- Audit fields
- Role-based access
- Archived-record filtering
