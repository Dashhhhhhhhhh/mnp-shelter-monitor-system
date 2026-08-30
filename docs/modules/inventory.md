# Inventory Module

## Overview

The Inventory module manages shelter food and supplies and records all stock movements through an append-only inventory ledger.

The module consists of two main concepts:

```text
Inventory Item
→ describes WHAT the shelter keeps

Stock Record
→ describes WHAT HAPPENED to the item's stock
```

Examples of inventory items include:

- Cat food
- Dog food
- Cat litter
- Cleaning supplies
- Medical supplies
- Cage supplies
- Other shelter supplies

Examples of stock movements include:

- Receiving new supplies
- Using supplies
- Correcting inventory discrepancies
- Recording physical stock checks

The system does **not store a mutable current quantity directly on the inventory item**.

Instead, current stock is calculated from stock records.

---

# Module Location

```text
server/src/modules/inventory/
├── inventory.controller.js
├── inventory.repository.js
├── inventory.routes.js
├── inventory.service.js
└── inventory.validation.js
```

The router is mounted in:

```text
server/src/app.js
```

using:

```js
app.use("/api", inventoryRouter);
```

---

# Database Tables

The module uses:

```text
inventory_items
inventory_stock_records
```

---

# Inventory Items

`inventory_items` represents the inventory catalog.

It describes what an item is, but does not contain the item's changing stock balance.

Important fields include:

| Field               | Description                                  |
| ------------------- | -------------------------------------------- |
| `inventory_item_id` | UUID primary key                             |
| `item_name`         | Main inventory item name                     |
| `variant`           | Optional flavor, type, variant, etc.         |
| `item_type`         | `FOOD` or `SUPPLY`                           |
| `category`          | Inventory category                           |
| `package_size`      | Optional package size                        |
| `package_size_unit` | Optional package size measurement            |
| `unit`              | Unit used for stock counting                 |
| `is_active`         | Whether new inventory operations are allowed |
| `created_by`        | User who created the item                    |
| `updated_by`        | User who last updated the item               |
| `created_at`        | Creation timestamp                           |
| `updated_at`        | Last update timestamp                        |

---

# Inventory Stock Records

`inventory_stock_records` represents the stock ledger.

Every quantity-changing event creates a new stock record.

Important fields include:

| Field                      | Description                                      |
| -------------------------- | ------------------------------------------------ |
| `stock_record_id`          | UUID primary key                                 |
| `inventory_item_id`        | Related inventory item                           |
| `record_type`              | Type of stock event                              |
| `quantity`                 | Quantity involved in the movement                |
| `adjustment_direction`     | `ADD` or `REMOVE` for adjustments                |
| `estimated_level`          | Physical approximation during stock checks       |
| `stock_status`             | Staff operational judgment                       |
| `notes`                    | Optional notes; required for adjustments         |
| `recorded_by`              | User who recorded the event                      |
| `created_at`               | Event timestamp                                  |
| `idempotency_key`          | Client request identifier                        |
| `idempotency_request_hash` | SHA-256 hash representing the normalized request |

Stock records are treated as an **append-only audit history**.

The API currently provides no PATCH or DELETE endpoint for stock records.

---

# Database Migrations Added

The Inventory module added the following migrations.

## Migration 036

Adds inventory-item active state:

```sql
ALTER TABLE inventory_items
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
```

---

## Migration 037

Adds idempotency information to stock records:

```sql
ALTER TABLE inventory_stock_records
ADD COLUMN idempotency_key UUID,
ADD COLUMN idempotency_request_hash VARCHAR(64);

ALTER TABLE inventory_stock_records
ADD CONSTRAINT uq_inventory_stock_recorded_by_idempotency_key
UNIQUE (recorded_by, idempotency_key);
```

This prevents one user from successfully creating two stock records using the same idempotency key.

---

## Migration 038

Adds database-level duplicate inventory-item protection:

```sql
CREATE UNIQUE INDEX uq_inventory_items_identity
ON inventory_items (
    LOWER(item_name),
    LOWER(COALESCE(variant, '')),
    package_size,
    package_size_unit,
    unit
)
NULLS NOT DISTINCT;
```

This protects against concurrent requests creating duplicate catalog items.

The service also performs an application-level duplicate check so normal duplicate requests can be rejected before the INSERT.

PostgreSQL remains the final source of truth under concurrency.

---

# Item Types

Supported item types:

```text
FOOD
SUPPLY
```

---

# Categories

Supported categories:

```text
CAT_FOOD
DOG_FOOD
CAT_LITTER
CLEANING_SUPPLY
MEDICAL_SUPPLY
CAGE_SUPPLY
OTHER
```

The API also validates valid combinations.

## FOOD

A `FOOD` item may only use:

```text
CAT_FOOD
DOG_FOOD
```

For example:

```text
FOOD + CAT_FOOD  ✅
FOOD + DOG_FOOD  ✅
FOOD + CAT_LITTER ❌
```

---

## SUPPLY

A `SUPPLY` item may use:

```text
CAT_LITTER
CLEANING_SUPPLY
MEDICAL_SUPPLY
CAGE_SUPPLY
OTHER
```

For example:

```text
SUPPLY + CAT_LITTER       ✅
SUPPLY + MEDICAL_SUPPLY   ✅
SUPPLY + DOG_FOOD         ❌
```

---

# Package Information

Package metadata is optional.

Example:

```text
Whiskas Tuna

packageSize: 85
packageSizeUnit: G
unit: SACHET
```

This means:

```text
Each stock unit = one sachet
Each sachet contains 85 grams
```

---

## Package Size Pair Rule

`packageSize` and `packageSizeUnit` must be supplied together.

Valid:

```json
{
  "packageSize": 85,
  "packageSizeUnit": "G"
}
```

Also valid:

```json
{
  "packageSize": null,
  "packageSizeUnit": null
}
```

Invalid:

```json
{
  "packageSize": 85,
  "packageSizeUnit": null
}
```

Invalid:

```json
{
  "packageSize": null,
  "packageSizeUnit": "G"
}
```

The API returns:

```text
Package size and package size unit must be provided together
```

---

# Package Size Units

Supported package-size units:

```text
G
KG
ML
L
```

Input is normalized using:

```text
trim()
toUpperCase()
```

For example:

```text
g
```

becomes:

```text
G
```

---

# Inventory Units

Every inventory item must have a stock-counting `unit`.

Supported units:

```text
SACHET
BAG
CAN
BOTTLE
BOX
PACK
PIECE
ROLL
VIAL
TABLET
G
KG
ML
L
```

The unit explains the meaning of stock quantities.

Example:

```text
unit = SACHET
quantity = 20

→ 20 sachets
```

Example:

```text
unit = KG
quantity = 2.5

→ 2.5 kilograms
```

---

# Countable vs Measured Units

The API distinguishes countable units from measured units.

## Countable Units

```text
SACHET
BAG
CAN
BOTTLE
BOX
PACK
PIECE
ROLL
VIAL
TABLET
```

Stock movements for these units must use whole numbers.

Valid:

```text
1 SACHET
5 CAN
12 PIECE
```

Invalid:

```text
1.5 SACHET
2.25 CAN
```

Example error:

```text
Quantity must be a whole number when unit is SACHET
```

---

# Measured Units

```text
G
KG
ML
L
```

Measured units may use decimal quantities.

Examples:

```text
0.29 KG
2.5 KG
250.25 G
1.75 L
```

Quantities may contain up to two decimal places.

---

# Decimal Precision

The application validates that:

```text
packageSize
quantity
```

contain at most two decimal places.

A floating-point-safe helper is used instead of relying on:

```js
Number.isInteger(value * 100);
```

because some valid JavaScript decimal values such as `0.29` cannot always be represented exactly in binary floating-point arithmetic.

Valid test:

```text
Existing stock: 2.50 KG
Received:       0.29 KG
Result:         2.79 KG
```

---

# Current Stock

Current stock is **derived from the stock ledger**.

It is not stored directly on `inventory_items`.

The calculation is:

```text
RECEIVED
+ ADJUSTMENT ADD
- USED
- ADJUSTMENT REMOVE
= currentStock
```

`STOCK_CHECK` does not change quantity.

Conceptually:

```text
RECEIVED             +20
USED                   -4
ADJUSTMENT ADD         +3
ADJUSTMENT REMOVE      -2
--------------------------
currentStock           17
```

This provides one source of truth:

```text
inventory_stock_records
```

instead of maintaining both:

```text
stored current quantity
+
stock history
```

which could eventually become inconsistent.

---

# Stock Record Types

Supported record types:

```text
RECEIVED
USED
ADJUSTMENT
STOCK_CHECK
```

---

# RECEIVED

`RECEIVED` records stock entering the shelter.

Example:

```json
{
  "recordType": "RECEIVED",
  "quantity": 20,
  "notes": "Initial shelter stock"
}
```

Effect:

```text
current stock + quantity
```

Rules:

```text
quantity required
quantity > 0
adjustmentDirection not allowed
estimatedLevel not allowed
stockStatus not allowed
notes optional
```

---

# USED

`USED` records inventory consumed by shelter operations.

Example:

```json
{
  "recordType": "USED",
  "quantity": 4,
  "notes": "Used for evening feeding"
}
```

Effect:

```text
current stock - quantity
```

Rules:

```text
quantity required
quantity > 0
cannot exceed current stock
adjustmentDirection not allowed
estimatedLevel not allowed
stockStatus not allowed
notes optional
```

---

# ADJUSTMENT

`ADJUSTMENT` records a manual correction to inventory.

Two directions are supported:

```text
ADD
REMOVE
```

---

## ADJUSTMENT ADD

Example:

```json
{
  "recordType": "ADJUSTMENT",
  "adjustmentDirection": "ADD",
  "quantity": 3,
  "notes": "Physical count found 3 extra sachets"
}
```

Effect:

```text
current stock + quantity
```

---

## ADJUSTMENT REMOVE

Example:

```json
{
  "recordType": "ADJUSTMENT",
  "adjustmentDirection": "REMOVE",
  "quantity": 2,
  "notes": "Two damaged sachets were discarded"
}
```

Effect:

```text
current stock - quantity
```

The removal cannot exceed available stock.

---

## Adjustment Notes

Every adjustment requires a nonblank explanation.

Invalid:

```json
{
  "recordType": "ADJUSTMENT",
  "adjustmentDirection": "ADD",
  "quantity": 1
}
```

Response:

```http
400 Bad Request
```

```text
Notes are required for an ADJUSTMENT record
```

This ensures the shelter can later understand why the calculated balance was manually changed.

---

# STOCK_CHECK

`STOCK_CHECK` records a physical or visual observation.

It does **not** change current quantity.

Example:

```json
{
  "recordType": "STOCK_CHECK",
  "estimatedLevel": "ONE_QUARTER",
  "stockStatus": "LOW",
  "notes": "Physical check shows supply is running low"
}
```

The resulting current stock remains unchanged.

---

## STOCK_CHECK Quantity

`quantity` is not allowed.

Invalid:

```json
{
  "recordType": "STOCK_CHECK",
  "quantity": 5,
  "estimatedLevel": "HALF"
}
```

Response:

```text
Quantity is not allowed for a STOCK_CHECK
```

---

# Estimated Level

Supported physical estimates:

```text
FULL
THREE_QUARTERS
HALF
ONE_QUARTER
ALMOST_EMPTY
EMPTY
```

This describes what staff physically observe.

---

# Stock Status

Supported statuses:

```text
GOOD
LOW
OUT
```

This represents staff operational judgment.

`stockStatus` is not automatically derived from `estimatedLevel`.

For example:

```text
HALF + GOOD
```

and:

```text
HALF + LOW
```

may both be reasonable depending on the importance and expected consumption of the item.

---

# STOCK_CHECK Observation Requirement

A stock check must contain at least one of:

```text
estimatedLevel
stockStatus
```

Notes alone are not enough.

Invalid:

```json
{
  "recordType": "STOCK_CHECK",
  "notes": "Checked stock"
}
```

Response:

```text
STOCK_CHECK requires estimated level or stock status
```

---

# Stock Check vs Adjustment

A stock check does not directly correct inventory.

Example:

```text
System current stock:
10 KG

Physical observation:
approximately 8 KG
```

The workflow is:

```text
STOCK_CHECK
→ records the discrepancy

ADJUSTMENT REMOVE 2 KG
→ corrects the ledger
```

This preserves an audit trail explaining why the balance changed.

---

# Negative Stock Protection

Current stock must never become negative.

The following operations require enough available stock:

```text
USED
ADJUSTMENT REMOVE
```

Example:

```text
currentStock = 16
requested USED = 20
```

returns:

```http
409 Conflict
```

```json
{
  "success": false,
  "message": "Insufficient stock"
}
```

The failed stock record is not inserted.

---

# Transaction and Concurrency Protection

Stock subtraction is performed inside a PostgreSQL transaction.

The workflow is conceptually:

```text
BEGIN
↓
lock inventory item
↓
calculate current stock
↓
validate requested movement
↓
insert stock record
↓
calculate updated current stock
↓
COMMIT
```

The item is loaded using:

```sql
SELECT ...
FROM inventory_items
WHERE inventory_item_id = $1
FOR UPDATE
```

---

## Why `FOR UPDATE` Is Required

Suppose:

```text
current stock = 5
```

Two simultaneous requests arrive:

```text
Request A → USED 4
Request B → USED 4
```

Without row locking:

```text
A reads 5
B reads 5

A believes 4 can be used
B believes 4 can be used

5 - 4 - 4 = -3
```

With `FOR UPDATE`:

```text
A locks item
A reads 5
A inserts USED 4
A commits

B gets lock
B reads new stock = 1
B requests USED 4
→ 409 Insufficient stock
```

This keeps inventory balance valid even when requests arrive concurrently.

---

# Transaction Failure

If any error occurs during the stock movement workflow:

```text
ROLLBACK
```

is executed.

The database client is then released using:

```text
finally
→ client.release()
```

This prevents partially completed inventory operations.

---

# Idempotency

Every new stock movement requires:

```http
Idempotency-Key: <UUID>
```

Example:

```text
Idempotency-Key: 7f2efee7-6ecf-4e12-8fe4-69298a1163f1
```

The API hashes the normalized stock request using SHA-256.

The hash includes:

```text
inventoryItemId
recordType
quantity
adjustmentDirection
estimatedLevel
stockStatus
notes
```

---

# Why Stock Movements Need Idempotency

Without idempotency, a user could accidentally submit:

```text
USED 4
```

twice.

The ledger would record:

```text
USED 4
USED 4
```

and remove eight units even though the user intended to remove only four.

This occurred during manual testing and demonstrated why stock movements require duplicate-request protection.

---

# Idempotency Replay

First request:

```text
Idempotency-Key: ABC
RECEIVED 5
```

creates the stock record.

Response:

```text
201 Created
isReplay: false
```

If the exact same request is sent again using the same key:

```text
same key
same normalized request
```

the API returns the existing stock record instead of inserting another movement.

Response:

```text
200 OK
isReplay: true
```

Current stock is therefore changed only once.

---

# Idempotency Conflict

If the same key is reused with different request data:

```text
same key
different quantity/body/item
```

the request is rejected:

```http
409 Conflict
```

```text
Idempotency key has already been used for a different stock request
```

---

# Idempotency and Concurrency

The stock workflow checks idempotency:

```text
before acquiring the item lock
```

and again:

```text
after acquiring the item lock
```

The second check protects against a request that was waiting while another request created the original stock record.

The database also enforces:

```text
UNIQUE(recorded_by, idempotency_key)
```

as final concurrency protection.

If PostgreSQL raises unique-constraint error:

```text
23505
```

the service attempts to load the concurrent existing record.

If the stored request hash matches:

```text
→ replay existing result
```

If the hash does not match:

```text
→ 409 Conflict
```

---

# Replay `currentStock`

When an idempotent stock request is replayed, the returned stock record is the original record.

However:

```text
currentStock
```

is recalculated at replay time.

Therefore if later stock movements occurred after the original request, the replay response may show the item's **current balance now**, rather than the balance immediately after the historical original request.

The stock event itself remains unchanged.

---

# Inventory Item Duplicate Prevention

Duplicate inventory items are rejected.

Identity uses:

```text
itemName
variant
packageSize
packageSizeUnit
unit
```

Name and variant comparisons are case-insensitive.

Whitespace is trimmed before values are stored or compared.

Blank variant becomes:

```text
null
```

---

## Duplicate Example

These are considered duplicates:

```text
Whiskas / Tuna / 85 G / SACHET
whiskas / tuna / 85 G / SACHET
```

Response:

```http
409 Conflict
```

```json
{
  "success": false,
  "message": "Inventory item already exists"
}
```

---

## Different Variants Are Separate

These are valid separate items:

```text
Whiskas / Tuna / 85 G / SACHET
Whiskas / Chicken / 85 G / SACHET
```

Different package sizes may also represent separate items:

```text
Whiskas / Tuna / 85 G / SACHET
Whiskas / Tuna / 400 G / CAN
```

---

# Database Duplicate Protection

The service performs a duplicate query before INSERT or PATCH.

PostgreSQL also enforces the unique index:

```text
uq_inventory_items_identity
```

This prevents simultaneous requests from both passing the application-level duplicate check and creating duplicate records.

A PostgreSQL:

```text
23505
```

for this constraint is converted into:

```http
409 Conflict
```

with:

```text
Inventory item already exists
```

This applies to:

```text
CREATE
PATCH
```

---

# Inventory Item PATCH

The following fields may be updated:

```text
itemName
variant
itemType
category
packageSize
packageSizeUnit
unit
```

Audit fields are controlled by the server.

---

# Empty PATCH

A PATCH must contain at least one supported field.

Example:

```json
{}
```

returns:

```http
400 Bad Request
```

```text
At least one inventory item field must be provided
```

---

# Final-State PATCH Validation

PATCH validation uses:

```text
existing database values
+
incoming validated updates
```

The resulting final item is then checked.

This applies to:

```text
itemType + category
packageSize + packageSizeUnit
duplicate identity
```

For example, changing only `itemType` may still be rejected if the existing `category` becomes incompatible with the new type.

---

# Locked Fields After Stock History

Once an inventory item has at least one stock record, these fields become immutable:

```text
unit
packageSize
packageSizeUnit
```

Example:

```text
Whiskas
85 G
unit = SACHET

History:
RECEIVED 20
USED 4
```

Changing:

```text
unit = KG
```

would make old stock records appear to represent kilograms instead of sachets.

The API therefore rejects such changes.

Response:

```http
409 Conflict
```

```text
Unit and package size cannot be changed after stock records exist
```

---

# Descriptive Fields After Stock History

Stock history does not freeze the entire inventory item.

Fields such as:

```text
itemName
variant
itemType
category
```

may still be corrected, subject to:

- Category compatibility
- Duplicate prevention
- Normal validation

---

# No DELETE Endpoint

Inventory items are not deleted through the API.

Deleting an inventory item could destroy or break the meaning of historical stock records.

Instead, the module uses:

```text
deactivate
reactivate
```

---

# Inventory Item Deactivation

Route:

```http
POST /api/inventory/items/:inventoryItemId/deactivate
```

Only:

```text
ADMIN
VOLUNTEER
```

may deactivate an item.

---

## Zero Stock Required

An item may only be deactivated when:

```text
currentStock = 0
```

Example:

```text
currentStock = 15
```

returns:

```http
409 Conflict
```

```text
Inventory item cannot be deactivated while stock remains
```

This prevents remaining stock from becoming impossible to record as used.

---

# Inactive Inventory Items

When:

```text
isActive = false
```

the historical item remains readable.

However, no new stock record may be created.

This includes:

```text
RECEIVED
USED
ADJUSTMENT
STOCK_CHECK
```

Attempting a new movement returns:

```http
409 Conflict
```

```text
Inventory item is inactive
```

---

# Reactivation

Route:

```http
POST /api/inventory/items/:inventoryItemId/reactivate
```

Only:

```text
ADMIN
VOLUNTEER
```

may reactivate an item.

After reactivation:

```text
isActive = true
```

and stock movements are allowed again.

---

# RBAC

The Inventory module uses both route-level and service-level authorization.

## Permissions

| Operation             | ADMIN | VOLUNTEER | CARETAKER |
| --------------------- | :---: | :-------: | :-------: |
| View inventory items  |  ✅   |    ✅     |    ✅     |
| View stock history    |  ✅   |    ✅     |    ✅     |
| Create inventory item |  ✅   |    ✅     |    ❌     |
| Update inventory item |  ✅   |    ✅     |    ❌     |
| Deactivate item       |  ✅   |    ✅     |    ❌     |
| Reactivate item       |  ✅   |    ✅     |    ❌     |
| `RECEIVED`            |  ✅   |    ✅     |    ❌     |
| `USED`                |  ✅   |    ✅     |    ✅     |
| `ADJUSTMENT`          |  ✅   |    ✅     |    ❌     |
| `STOCK_CHECK`         |  ✅   |    ✅     |    ✅     |

---

# Why Stock Record RBAC Uses Two Layers

The stock-record route is accessible to:

```text
ADMIN
VOLUNTEER
CARETAKER
```

because CARETAKER can create:

```text
USED
STOCK_CHECK
```

However CARETAKER cannot create:

```text
RECEIVED
ADJUSTMENT
```

Therefore the route middleware performs the broad role check, while the service checks the requested `recordType`.

Example:

```text
CARETAKER + USED         ✅
CARETAKER + STOCK_CHECK  ✅
CARETAKER + RECEIVED     ❌
CARETAKER + ADJUSTMENT   ❌
```

Unauthorized stock-record type:

```http
403 Forbidden
```

```text
You are not authorized to create this stock record type
```

---

# API Routes

## Create Inventory Item

```http
POST /api/inventory/items
```

Allowed:

```text
ADMIN
VOLUNTEER
```

Required:

```text
itemName
itemType
category
unit
```

Optional:

```text
variant
packageSize
packageSizeUnit
```

Example:

```json
{
  "itemName": "Whiskas",
  "variant": "Tuna",
  "itemType": "FOOD",
  "category": "CAT_FOOD",
  "packageSize": 85,
  "packageSizeUnit": "G",
  "unit": "SACHET"
}
```

Successful response:

```http
201 Created
```

The new item starts with:

```text
isActive = true
currentStock = 0
```

Creating an inventory item does **not** create initial stock.

Opening stock must be recorded separately using a `RECEIVED` stock record.

---

# Get All Inventory Items

```http
GET /api/inventory/items
```

Allowed:

```text
ADMIN
VOLUNTEER
CARETAKER
```

Response:

```http
200 OK
```

Each item includes derived:

```text
currentStock
```

Ordering:

```text
active items first
item name ascending
variant ascending
createdAt ascending
```

---

# Get One Inventory Item

```http
GET /api/inventory/items/:inventoryItemId
```

Allowed:

```text
ADMIN
VOLUNTEER
CARETAKER
```

Invalid UUID:

```http
400 Bad Request
```

```text
Invalid inventory item ID
```

Missing valid UUID:

```http
404 Not Found
```

```text
Inventory item not found
```

---

# Update Inventory Item

```http
PATCH /api/inventory/items/:inventoryItemId
```

Allowed:

```text
ADMIN
VOLUNTEER
```

Editable fields:

```text
itemName
variant
itemType
category
packageSize
packageSizeUnit
unit
```

---

# Deactivate Inventory Item

```http
POST /api/inventory/items/:inventoryItemId/deactivate
```

Allowed:

```text
ADMIN
VOLUNTEER
```

No request body required.

Requires:

```text
currentStock = 0
```

---

# Reactivate Inventory Item

```http
POST /api/inventory/items/:inventoryItemId/reactivate
```

Allowed:

```text
ADMIN
VOLUNTEER
```

No request body required.

---

# Create Stock Record

```http
POST /api/inventory/items/:inventoryItemId/stock-records
```

Allowed route roles:

```text
ADMIN
VOLUNTEER
CARETAKER
```

A valid UUID header is required:

```http
Idempotency-Key: <UUID>
```

Actual allowed record types depend on role.

---

# Get Stock History

```http
GET /api/inventory/items/:inventoryItemId/stock-records
```

Allowed:

```text
ADMIN
VOLUNTEER
CARETAKER
```

Records are ordered:

```text
created_at DESC
```

Newest stock events appear first.

---

# Mapper Behavior

PostgreSQL uses snake_case:

```text
inventory_item_id
item_name
package_size
current_stock
stock_record_id
record_type
recorded_by
```

The service maps these to camelCase:

```text
inventoryItemId
itemName
packageSize
currentStock
stockRecordId
recordType
recordedBy
```

PostgreSQL `NUMERIC` values are returned by `pg` as strings.

The mapper converts numeric API values to JavaScript numbers.

For nullable numeric values:

```text
null remains null
```

---

# Repository Responsibilities

The repository handles database operations only.

Examples include:

```text
find inventory item
find inventory item FOR UPDATE
list items
find duplicates
insert item
update item
set active state
check stock history existence
calculate current stock
insert stock record
find stock records
find stock record by idempotency key
```

All request values use PostgreSQL parameters:

```text
$1
$2
$3
...
```

Client-controlled values are not directly interpolated into SQL.

Dynamic PATCH SQL only interpolates trusted column assignments defined by application code.

---

# Validation Responsibilities

The validation layer handles:

- Request body object checks
- UUID validation
- Required item name
- Optional variant
- Item type normalization
- Category normalization
- Type/category compatibility
- Package size validation
- Package-size pair validation
- Unit normalization
- Supported units
- Maximum decimal precision
- Empty PATCH rejection
- Stock record type validation
- Quantity validation
- Countable-unit quantity rules
- Adjustment direction validation
- Estimated-level validation
- Stock-status validation
- STOCK_CHECK field rules
- ADJUSTMENT notes requirement

---

# Service Responsibilities

The service handles business rules requiring database or authenticated-user context.

Examples:

- Duplicate inventory item detection
- Final-state PATCH validation
- Stock-history field locking
- Soft deactivation/reactivation
- Zero-stock requirement for deactivation
- Inactive item protection
- Current stock calculation
- Negative-stock prevention
- Stock record role permission
- Unit-based quantity validation
- Idempotency
- SHA-256 request hashing
- Transactions
- Row locking
- Concurrent duplicate handling
- PostgreSQL unique-constraint mapping

---

# Controller Responsibilities

Controllers remain thin.

They:

1. Read request parameters/body.
2. Read the authenticated user.
3. Read `Idempotency-Key` for stock creation.
4. Call the service.
5. Return the appropriate response.
6. Pass errors to the global error middleware.

For stock creation:

```text
new request
→ 201 Created

idempotent replay
→ 200 OK
```

---

# Error Status Summary

| Scenario                                   | Status |
| ------------------------------------------ | -----: |
| Invalid input                              |  `400` |
| Invalid UUID                               |  `400` |
| Invalid item type/category                 |  `400` |
| Invalid package pair                       |  `400` |
| Invalid unit                               |  `400` |
| Invalid quantity                           |  `400` |
| Countable unit with decimal quantity       |  `400` |
| Invalid record type                        |  `400` |
| Invalid adjustment direction               |  `400` |
| Invalid stock-check fields                 |  `400` |
| Missing idempotency key                    |  `400` |
| Empty PATCH                                |  `400` |
| Unauthorized stock movement type           |  `403` |
| Inventory item not found                   |  `404` |
| Duplicate inventory item                   |  `409` |
| Insufficient stock                         |  `409` |
| Idempotency key reused for another request |  `409` |
| Locked unit/package edit                   |  `409` |
| Deactivate while stock remains             |  `409` |
| Item already active/inactive               |  `409` |
| Stock movement on inactive item            |  `409` |
| Unexpected server error                    |  `500` |

---

# Manual Testing Completed

The Inventory module was manually tested before completion.

Tests included:

## Inventory Item

- Create valid inventory item
- New item starts with current stock `0`
- Exact duplicate create rejected
- Case-insensitive duplicate rejected
- Whitespace normalization
- Invalid item type/category combination
- Package size without unit rejected
- Package-size unit without size rejected
- Invalid inventory unit rejected
- GET one item
- GET all items
- Invalid item UUID
- Valid nonexistent item UUID
- Normal descriptive PATCH
- Empty PATCH
- Duplicate final-state PATCH
- Unit locked after stock history
- Package size locked after stock history

## Stock Ledger

- Initial `RECEIVED`
- `USED`
- Current stock derivation
- Insufficient stock rejection
- Failed subtraction does not create ledger movement
- `ADJUSTMENT ADD`
- `ADJUSTMENT REMOVE`
- Adjustment notes required
- Adjustment removal cannot exceed stock
- Valid `STOCK_CHECK`
- STOCK_CHECK does not change current stock
- STOCK_CHECK quantity rejected
- STOCK_CHECK without observation rejected
- Invalid record type
- Invalid adjustment direction
- Invalid estimated level
- Invalid stock status
- Observation field on RECEIVED rejected
- Adjustment direction on USED rejected
- GET stock history

## RBAC

- CARETAKER may record USED
- CARETAKER may record STOCK_CHECK
- CARETAKER cannot record RECEIVED
- CARETAKER cannot record ADJUSTMENT
- ADMIN inventory management verified

## Lifecycle

- Cannot deactivate item while stock remains
- Reduce stock to zero
- Deactivate successfully at zero
- Inactive item rejects new stock movement
- Reactivate successfully
- Stock movement works after reactivation

## Unit Quantity Rules

- Decimal SACHET quantity rejected
- Decimal KG quantity accepted
- `0.29 KG` accepted after floating-point-safe precision fix
- Derived KG balance correctly became `2.79`

## Idempotency

- New idempotency key creates stock movement
- Response includes `isReplay: false`
- Same key + same request replays
- Replay does not create another ledger record
- Replay does not change stock again
- Response includes `isReplay: true`
- Same key + different body returns `409`
- Missing idempotency key returns `400`

---

# Code Verification

All Inventory JavaScript files were checked using:

```bash
for file in server/src/modules/inventory/*.js; do
  node --check "$file" || exit 1
done
```

All files passed syntax checking.

Debug logging was checked using:

```bash
grep -R "console.log\|console.error" server/src/modules/inventory
```

No debug logging remained.

---

# Key Design Decisions

## Why Current Stock Is Derived

Storing both:

```text
current quantity
+
stock ledger
```

would create two sources of truth.

If they ever became inconsistent, the shelter would not know which value was correct.

Therefore the ledger is authoritative and current stock is derived.

---

## Why Stock Records Are Append-Only

Stock records explain why inventory changed.

Editing or deleting an old movement could erase that explanation.

If a mistake is discovered, staff should create a correcting:

```text
ADJUSTMENT ADD
```

or:

```text
ADJUSTMENT REMOVE
```

rather than rewriting history.

---

## Why Adjustments Require Notes

An adjustment changes inventory outside the ordinary:

```text
RECEIVED
USED
```

workflow.

Requiring notes ensures the system can answer:

```text
Why did the calculated balance change?
```

---

## Why STOCK_CHECK Does Not Change Quantity

A physical check is an observation.

If it directly changed quantity, historical ledger calculations could become harder to understand.

Instead:

```text
STOCK_CHECK
→ observe discrepancy

ADJUSTMENT
→ reconcile discrepancy
```

---

## Why Item Units Become Immutable

Historical quantities only have meaning in relation to the item's unit.

Changing:

```text
SACHET
```

to:

```text
KG
```

after stock history exists would reinterpret every historical movement incorrectly.

Package size fields are locked for the same reason.

---

## Why Inventory Uses Transactions

A stock subtraction contains multiple dependent steps:

```text
read balance
validate balance
write movement
```

Those steps must behave as one atomic operation.

Transactions and row locks prevent concurrent requests from both using the same old balance.

---

## Why Inventory Uses Idempotency

Stock operations have side effects.

Accidental duplicate requests could incorrectly add or subtract inventory multiple times.

Idempotency allows the client to safely retry a request without applying the stock movement again.

---

## Why Duplicate Protection Exists in Two Layers

Application duplicate checks provide a friendly early rejection.

Database uniqueness handles concurrency.

The pattern is:

```text
Service check
→ good user experience

Database unique index
→ final data-integrity guarantee
```

---

# Future Integration

The Inventory module can later integrate with:

## Notifications

Examples:

```text
Item marked LOW
Item marked OUT
Physical stock check reports ALMOST_EMPTY
```

---

## Reports

Examples:

```text
Food received this week
Food used this month
Inventory adjustments
Current stock summary
Stock-check history
Items frequently reaching LOW
```

---

## Donations

Future donation items may generate inventory `RECEIVED` records.

Example:

```text
Donor gives 20 cat-food sachets
↓
Donation recorded
↓
Inventory RECEIVED 20
```

This should eventually use a transaction so financial/donation records and inventory movement remain consistent.

---

## Care Records

Future integration may allow care workflows to optionally record inventory consumption.

Example:

```text
Feeding completed
↓
Used 4 cat-food sachets
```

This integration should avoid silently changing stock without creating a proper ledger record.

---

# Module Status

```text
Database Schema            COMPLETE
Migration 036              COMPLETE
Migration 037              COMPLETE
Migration 038              COMPLETE
Validation                 COMPLETE
Repository                 COMPLETE
Service                    COMPLETE
Controller                 COMPLETE
Routes / RBAC              COMPLETE
Stock Ledger               COMPLETE
Derived Current Stock      COMPLETE
Negative Stock Protection  COMPLETE
Transaction Protection     COMPLETE
FOR UPDATE Locking         COMPLETE
Idempotency                COMPLETE
Duplicate Protection       COMPLETE
Soft Deactivation          COMPLETE
Manual API Testing         COMPLETE
Syntax Verification        COMPLETE
Debug Scan                 COMPLETE
Final Code Review          COMPLETE
Documentation              COMPLETE
```

The Inventory backend module is considered complete for the current M & P Shelter Monitoring System MVP.
