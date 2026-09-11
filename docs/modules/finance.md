M & P Shelter Monitoring System

Finance Module Technical Documentation

1. Purpose

The Finance module records, controls, and audits financial activity for the M & P Shelter Monitoring System.

It covers:

Donations

Expenses

Expense funding

Split funding

Shelter cash usage

Personal advances

Reimbursements

Reimbursement reversals

Reversal corrections

Idempotent financial writes

Transaction and row-lock protection

Immutable audit history

Backend-derived financial balances

The central design goal is to preserve a trustworthy financial history while still allowing mistakes to be corrected safely.

2. Architecture

The module follows the backend flow:

Route
↓
Controller
↓
Service
↓
Repository
↓
PostgreSQL

Route

Defines the HTTP method, URL, authentication, role-based authorization, and controller.

Controller

Controllers remain thin. They read request parameters, request bodies, authenticated identity, and required headers, call the service, and return the HTTP response.

Service

The service layer owns Finance business rules.

Typical financial write flow:

validate input
↓
create request hash
↓
BEGIN
↓
idempotency check
↓
lock required rows
↓
load current financial state
↓
enforce business rules
↓
write financial records
↓
write audit / cash ledger effects
↓
COMMIT

On failure:

ROLLBACK

Repository

Repositories own SQL and database access. They perform record lookup, row locking, inserts, approved updates, aggregate calculations, derived financial totals, history reads, and cash-source calculations.

A repository may calculate facts such as:

reimbursements

- reversals

* reversal corrections
  = effective reimbursed amount

The service then decides whether a requested action is allowed.

3. Module Structure

server/src/modules/finance/
├── controllers/
├── repositories/
├── routes/
├── services/
├── validations/
└── utils/

Main service files include:

donation.service.js
expense.service.js
expenseFunding.service.js
reimbursement.service.js

4. Core Design Principles

Financial history should be preserved.

Mistakes are corrected through explicit audit records rather than destructive rewrites.

Multi-table financial writes are atomic.

Balance-sensitive writes use row locks.

Duplicate write requests are protected by idempotency.

The backend owns authoritative financial calculations.

Expenses and funding are separate concepts.

Shelter cash is derived from recorded financial history.

Personal advances create liabilities that can later be reimbursed.

Direct payments never enter shelter cash.

5. Donations

Supported donation types:

MONETARY
IN_KIND
DIRECT_PAYMENT

5.1 MONETARY

A MONETARY donation adds value to shelter cash.

It may be GENERAL or restricted to an allowed purpose, category, or expense. Restricted cash may only be used for eligible expenses.

5.2 IN_KIND

IN_KIND donations represent physical goods such as food, medicine, or shelter supplies. They do not increase shelter cash.

5.3 DIRECT_PAYMENT

A DIRECT_PAYMENT occurs when a donor or payer pays a provider directly.

Example:

Vet bill
↓
Donor pays veterinary clinic directly

Important rule:

DIRECT_PAYMENT does not enter shelter cash.

A DIRECT_PAYMENT funding allocation is paired 1:1 with a linked DIRECT_PAYMENT donation record. Both represent the same real-world event and must remain aligned on important fields such as amount, payer, payment method, provider, reference, and timestamp.

Standalone DIRECT_PAYMENT donation creation is blocked. The linked pair is created atomically through the Expense Funding workflow.

If the linked event is wrong, the design uses:

void
↓
recreate correctly

rather than generic correction.

6. Expenses

An expense answers:

What cost was incurred?

It does not answer:

How was that cost funded?

Funding is modeled separately so an expense can use multiple funding sources.

Example:

Expense = ₱2,000

₱600 SHELTER_FUNDS
₱800 PERSONAL_ADVANCE
₱600 PERSONAL_CONTRIBUTION

Expense amount corrections preserve audit history and may not make the expense inconsistent with active funding.

7. Expense Funding

Supported funding types:

SHELTER_FUNDS
PERSONAL_ADVANCE
PERSONAL_CONTRIBUTION
DIRECT_PAYMENT

An expense may have multiple active allocations.

Core invariant:

sum of active funding allocations
<=
expense amount

Partial funding is allowed.

7.1 SHELTER_FUNDS

Uses shelter-controlled cash.

lock monetary donation cash sources
↓
calculate eligible available cash
↓
create funding allocation
↓
consume cash
↓
create ALLOCATION_USE movements

General cash is consumed before matching restricted cash where applicable, with deterministic ordering such as FIFO within the same priority.

7.2 PERSONAL_ADVANCE

A person pays using personal money and expects repayment.

The allocation stores the advancer through:

advanced_by_user_id

Initial effect:

expense funded
↓
shelter owes advancer
↓
no immediate shelter cash decrease

Later, reimbursement decreases shelter cash.

The reimbursement recipient is derived from advanced_by_user_id; it is not independently chosen by the frontend.

7.3 PERSONAL_CONTRIBUTION

A person covers the expense personally and does not expect repayment.

Effect:

expense funded
↓
no shelter cash decrease
↓
no payable created

7.4 DIRECT_PAYMENT

A payer pays the provider directly.

Effect:

expense funded
↓
linked DIRECT_PAYMENT donation
↓
no shelter cash increase
↓
no shelter cash decrease

8. Funding Allocation Corrections

Current state lives in:

expense_funding_allocations

Correction history lives in:

funding_allocation_corrections

A correction preserves old and new state plus reason, timestamp, and actor.

Snapshots may include fields such as:

fundingType
allocationAmount
fundedAt
paymentMethod
paymentProvider
referenceNumber
advancedByUserId
contributedByUserId
directPaidByUserId
outsidePayerName
directPaymentDonationId
notes

8.1 Funding Type Is Immutable

Allowed:

PERSONAL_ADVANCE
→ PERSONAL_ADVANCE

Not allowed:

PERSONAL_ADVANCE
→ SHELTER_FUNDS

If the funding type is wrong:

void original allocation
↓
create new correct allocation

8.2 SHELTER_FUNDS Amount Correction

When the amount changes:

restore current active allocation-use cash
↓
recalculate currently eligible cash
↓
consume corrected amount

A notes-only correction does not create new cash movements.

8.3 PERSONAL_ADVANCE Correction Rules

A correction cannot reduce the advance below the effective amount already reimbursed.

new advance amount

> =
> effective reimbursed amount

Once reimbursement history exists:

advancedByUserId cannot change

because historical reimbursement meaning depends on the original advancer.

9. Funding Allocation Voids

Funding allocations are not hard-deleted.

Important rules:

SHELTER_FUNDS void restores currently active cash use.

DIRECT_PAYMENT void handles the linked pair atomically.

PERSONAL_ADVANCE cannot be voided once reimbursement history exists.

The PERSONAL_ADVANCE restriction remains even if reimbursements were later fully reversed, because the historical dependency still exists.

10. Finance Cash Source Ledger

Internal cash effects are recorded in:

finance_cash_source_movements

Important movement types:

ALLOCATION_USE
ALLOCATION_RESTORE
REIMBURSEMENT_USE
REIMBURSEMENT_RESTORE
REIMBURSEMENT_RECONSUME

The ledger is internal accounting history and is not intended as a normal public-facing endpoint.

10.1 Allocation Example

Original funding:

ALLOCATION_USE ₱600

Correction from ₱600 to ₱400:

ALLOCATION_RESTORE ₱600
ALLOCATION_USE ₱400

Second correction from ₱400 to ₱300:

ALLOCATION_RESTORE ₱400
ALLOCATION_USE ₱300

Current effective use is ₱300.

11. Personal Advance Reimbursements

A reimbursement repays a PERSONAL_ADVANCE.

Example:

PERSONAL_ADVANCE = ₱800
Reimbursement = ₱300

Effect:

shelter pays advancer
↓
REIMBURSEMENT_USE
↓
shelter cash decreases

Important rules:

allocation must exist
allocation must be active
allocation must be PERSONAL_ADVANCE
amount must be positive
amount must not exceed outstanding balance
reimbursedAt must not be earlier than fundedAt

11.1 reimbursedAt

reimbursedAt is the real-world payment time.

createdAt is the system record creation time.

The frontend may default reimbursedAt to the current time, but it remains an event timestamp rather than an audit timestamp.

12. Effective Reimbursement

Authoritative formula:

# effective reimbursement

total reimbursements

- total reversals

* total reversal corrections

Example:

Reimbursement ₱300
Reversals -₱250
Reversal corrections +₱40
──────────────────────────────
Effective reimbursement ₱90

For an ₱800 advance:

# Outstanding

# ₱800 - ₱90

₱710

The backend returns this value. The frontend does not recalculate it independently.

13. Reimbursement Reversals

Reimbursements are immutable.

If a reimbursement is wrong, the system does not update or delete it. Instead:

create reimbursement reversal

Example:

Reimbursement = ₱300
Reversal = ₱100

Effect:

REIMBURSEMENT_USE ₱300
REIMBURSEMENT_RESTORE ₱100

Remaining reversible amount:

reimbursement amount

- total reversals

* total reversal corrections

Multiple partial reversals are allowed.

14. Reimbursement Reversal Corrections

Reversals are also immutable.

If a reversal is wrong:

create reversal correction

Example:

Reimbursement ₱300
Reversal -₱150
Reversal correction +₱40

A reversal correction re-applies part of the reimbursement's cash effect:

REIMBURSEMENT_USE
↓
REIMBURSEMENT_RESTORE
↓
REIMBURSEMENT_RECONSUME

Remaining correctable amount:

reversal amount

- total reversal corrections

The correction must also not make effective reimbursement exceed the current advance amount.

15. Reimbursement Cash Movement Relationships

REIMBURSEMENT_USE

Parent:

reimbursement_id

REIMBURSEMENT_RESTORE

Parent:

reversal_id

Relationship:

related_cash_movement_id
→ original REIMBURSEMENT_USE

reimbursement_id is not the parent of a restore movement.

REIMBURSEMENT_RECONSUME

Parent:

correction_id

Relationship:

related_cash_movement_id
→ REIMBURSEMENT_RESTORE

Audit chain:

REIMBURSEMENT_USE
↓
REIMBURSEMENT_RESTORE
↓
REIMBURSEMENT_RECONSUME

16. Reversal Correction and Current Cash Availability

Restored cash may have been spent by another valid transaction after the reversal.

Therefore a reversal correction must check both:

historically reconsumable restore amount

- currently available eligible cash

Only currently available eligible cash can be consumed again.

This prevents double-spending restored cash.

17. Idempotency

Required financial writes use actor + idempotency key + request hash.

Behavior:

same actor

- same key
- same payload hash
  → replay existing result

same actor

- same key
- different payload hash
  → 409 Conflict

This protects against network retries, double submission, and concurrent duplicate requests.

Database uniqueness provides an additional protection layer. Concurrent 23505 conflicts are handled where appropriate by resolving the already-created idempotent result.

18. Transactions

Financial writes that form one business event use PostgreSQL transactions.

BEGIN
↓
lock
↓
validate current state
↓
write primary record
↓
write related audit / cash effects
↓
COMMIT

Any failure causes:

ROLLBACK

This guarantees all-or-nothing behavior.

19. Row Locking

Balance-sensitive writes use:

SELECT ... FOR UPDATE

Example:

Outstanding advance = ₱500

Request A = ₱400
Request B = ₱400

With row locking:

Request A locks row
↓
Request B waits
↓
Request A commits
↓
Request B reads fresh state
↓
Request B is rejected if balance is no longer enough

Normal GET endpoints use non-locking reads.

20. Money Arithmetic

Database money uses fixed decimal values.

Service-layer calculations use integer-cent helpers where needed:

toCents()
fromCents()

Example:

₱300.25
→ 30025 cents

This avoids unsafe JavaScript floating-point arithmetic in balance-sensitive calculations.

21. Core Financial Invariants

Expense Funding

active funding total
<=
expense amount

PERSONAL_ADVANCE

effective reimbursed amount
<=
personal advance amount

Reimbursement

reimbursement amount
<=
outstanding advance

Reversal

reversal amount
<=
remaining reversible amount

Reversal Correction

correction amount
<=
remaining correctable amount

and:

effective reimbursement after correction
<=
current advance amount

Advancer Identity

Once reimbursement history exists:

advancedByUserId is immutable

Personal Advance Void

Once reimbursement history exists:

PERSONAL_ADVANCE cannot be voided

DIRECT_PAYMENT

DIRECT_PAYMENT linked records represent one event. Generic correction is blocked; void + recreate is used.

22. Read Model

The frontend receives human-readable, backend-derived data.

Important reads include:

Funding allocations for an expense

Funding allocation correction history

Reimbursements for a personal advance

Reversals for a reimbursement

Reversal corrections for a reversal

Personal advance reimbursement summary

Frontend responsibility is primarily:

fetch
↓
store
↓
render

The frontend should not duplicate accounting formulas.

23. Reimbursement-Related Endpoints

POST /api/expenses/funding-allocations/:allocationId/reimbursements
GET /api/expenses/funding-allocations/:allocationId/reimbursements
GET /api/expenses/funding-allocations/:allocationId/reimbursement-summary

POST /api/expenses/reimbursements/:reimbursementId/reversals
GET /api/expenses/reimbursements/:reimbursementId/reversals

POST /api/expenses/reimbursement-reversals/:reversalId/corrections
GET /api/expenses/reimbursement-reversals/:reversalId/corrections

Write endpoints require the appropriate Finance authorization. Read endpoints use Finance read permissions.

24. Personal Advance Reimbursement Summary

Example response shape:

{
"allocationId": "uuid",
"advanceAmount": 800,
"effectiveReimbursedAmount": 90,
"outstandingAmount": 710
}

The frontend displays these backend-owned values directly.

25. Audit Strategy

The Finance module avoids destructive financial edits.

Typical patterns:

original record
↓
correction record

or:

original financial event
↓
reversal
↓
reversal correction

This preserves:

Original event

Actor

Change reason

Change timestamp

Current effective state

26. HTTP Error Semantics

400
invalid request / validation failure

401
missing or invalid authentication

403
authenticated but unauthorized

404
requested record does not exist

409
request conflicts with current financial state

Typical Finance 409 cases include:

Overfunding

Over-reimbursement

Reversal above remaining reversible amount

Correction above remaining correctable amount

Personal advance amount below effective reimbursed amount

Changing advancer after reimbursement history exists

Voiding personal advance after reimbursement history exists

DIRECT_PAYMENT correction attempt

Idempotency key reused with different payload

27. Database Constraints

Database constraints are part of the safety model.

Examples:

Positive monetary amounts

Valid enum values

Valid timestamps

Foreign keys

Unique actor + idempotency key

Cash movement parent constraints

The cash movement parent rules enforce:

REIMBURSEMENT_USE
→ reimbursement parent

REIMBURSEMENT_RESTORE
→ reversal parent

REIMBURSEMENT_RECONSUME
→ correction parent

These constraints protect the financial model even if application code contains a bug.

28. Concurrency Strategy

Concurrency-sensitive operations generally use:

BEGIN
↓
lock primary financial row
↓
lock related balance sources where required
↓
calculate current state
↓
enforce rules
↓
write
↓
COMMIT

This applies to workflows such as funding allocation creation/correction/void, reimbursements, reimbursement reversals, and reversal corrections.

29. Frontend Expectations

The frontend should expose human workflows instead of raw accounting internals.

Useful user-facing values include:

Expense
Funding type
Funding amount
Personal advance owner
Amount reimbursed
Outstanding amount
Reimbursement history
Reversal history
Correction history

The raw cash-source ledger should normally remain internal, except possibly for a future administrative audit screen.

30. Security and Identity

System actor fields must come from trusted authentication context.

Examples:

created_by
updated_by
voided_by

These must not be trusted from request bodies.

Payer/owner fields such as:

advanced_by_user_id
contributed_by_user_id
direct_paid_by_user_id

represent the real-world person involved in the financial event and are separate from the authenticated user performing the system action.

31. Timestamp Rules

Real-world event timestamps may include:

fundedAt
reimbursedAt

System audit timestamps include:

createdAt
updatedAt
reversedAt
correctedAt

System action timestamps are backend/database controlled so clients cannot rewrite audit history.

32. Known Design Constraints

Current intentional constraints include:

Funding type cannot change through correction.

DIRECT_PAYMENT uses void + recreate instead of generic correction.

PERSONAL_ADVANCE cannot be voided after reimbursement history exists.

advancedByUserId cannot change after reimbursement history exists.

Reimbursements are immutable.

Reversals are immutable.

Reversal corrections are immutable.

Raw cash ledger movements are internal.

Derived financial balances are backend-owned.

These constraints favor auditability and consistency over convenience.

33. Example Personal Advance Lifecycle

Expense created
₱2,000
↓
PERSONAL_ADVANCE
₱800
↓
shelter owes advancer ₱800
↓
reimbursement ₱300
↓
REIMBURSEMENT_USE ₱300
↓
effective reimbursed = ₱300
outstanding = ₱500
↓
reversal ₱100
↓
REIMBURSEMENT_RESTORE ₱100
↓
effective reimbursed = ₱200
outstanding = ₱600
↓
reversal correction ₱40
↓
REIMBURSEMENT_RECONSUME ₱40
↓
effective reimbursed = ₱240
outstanding = ₱560

34. Example Split Funding

Expense = ₱2,000

SHELTER_FUNDS ₱300
PERSONAL_CONTRIBUTION ₱600
PERSONAL_ADVANCE ₱800
DIRECT_PAYMENT ₱100
───────────────────────────
Total funded ₱1,800

The remaining ₱200 may stay unfunded because partial funding is allowed.

35. Maintenance Guidance

When changing Finance behavior:

Identify whether current financial truth changes.

Identify whether audit history must be preserved.

Check whether shelter cash changes.

Check whether a personal payable changes.

Determine whether idempotency is required.

Determine whether concurrency can cause stale-balance decisions.

Use a transaction when multiple writes form one financial event.

Use row locks for balance-sensitive state.

Keep authoritative formulas in the backend.

Test both valid and invalid state transitions.

36. Testing Expectations

Important Finance tests include:

Valid creation

Validation failures

Not-found cases

Wrong funding type

Overfunding

Insufficient cash

Restricted cash eligibility

Idempotent replay

Idempotency conflict

Concurrent duplicate protection

Void behavior

Correction behavior

Reimbursement outstanding guard

Reimbursement timestamp guard

Reversal amount guard

Reversal correction amount guard

Effective reimbursement calculation

Reimbursement-history restrictions on PERSONAL_ADVANCE

Cash ledger use / restore / reconsume behavior

Read history ordering

Reimbursement summary accuracy

37. Backend Completion Status

Donations ✅
Expenses ✅
Expense Funding ✅
Split Funding ✅
Funding Corrections ✅
Funding Voids ✅
Cash Source Ledger ✅
Personal Advance Reimbursements ✅
Reimbursement Reversals ✅
Reversal Corrections ✅
History Reads ✅
Reimbursement Summary ✅
Idempotency ✅
Transactions ✅
Row Locking ✅
Backend-Derived Balances ✅

Frontend integration is a separate implementation phase.

38. Summary

The Finance module separates its concepts clearly:

Donation
→ where support came from

Expense
→ what cost was incurred

Funding allocation
→ how the expense was funded

Cash movement
→ how shelter-controlled cash changed

Personal advance
→ amount the shelter owes a person

Reimbursement
→ shelter repayment of that advance

Reversal
→ undo part of a reimbursement

Reversal correction
→ correct part of a reversal

The module is built around:

auditability
consistency
atomic writes
concurrency safety
retry safety
backend-owned financial truth

This file is the authoritative technical reference for the Finance module.

For study notes, interview review, and personal refresher material, use:

docs/finance-module-reviewer.md
